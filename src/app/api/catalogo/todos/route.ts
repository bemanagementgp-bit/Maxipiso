import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sanitizeText, parseIntSafe } from "@/lib/security";
import { formatMeasureFields } from "@/lib/all-products";

export const runtime = "nodejs";

// Fail-fast: si una query a la DB tarda más que esto, se descarta y se sigue
// con el resto (evita que el catálogo se cuelgue cuando Turso está lento).
// Se le da margen suficiente para que el findMany principal complete aunque
// Turso esté degradado, sin llegar a colgar la request más de ~12s.
const QUERY_TIMEOUT_MS = 12_000;

// Caché en memoria del resultado (los productos cambian poco). La primera carga
// paga la latencia; las siguientes son instantáneas mientras el TTL sea válido.
const CACHE_TTL_MS = 60_000;
type CacheEntry = { expires: number; payload: unknown };
const cache = new Map<string, CacheEntry>();

function timeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve(fallback); }
    );
  });
}

const BRAND_ALIASES: Record<string, string> = {
  "Max Core": "MaxCore",
};

const MULTI_VALUE_FIELDS = new Set(["espesoresDisponibles"]);

const TABLES = [
  { key: "pisos-flotantes", delegate: () => prisma.pisoFlotante, label: "Pisos Flotantes" },
  { key: "porcellanatos",   delegate: () => prisma.porcellanato,  label: "Porcelanatos" },
  { key: "revestimientos",  delegate: () => prisma.revestimiento, label: "Revestimientos" },
  { key: "pisos-vinilicos", delegate: () => prisma.pisoVinilico,  label: "Pisos Vinílicos" },
  { key: "pisos-madera",    delegate: () => prisma.pisoMadera,    label: "Pisos Madera" },
  { key: "decks",           delegate: () => prisma.deck,          label: "Decks" },
  { key: "maderas",         delegate: () => prisma.madera,        label: "Maderas" },
  { key: "accesorios",      delegate: () => prisma.accesorio,     label: "Accesorios" },
] as const;

const SEARCH_FIELDS: Record<string, string[]> = {
  "pisos-flotantes": ["nombre", "sku", "codigo", "marca", "descripcion"],
  "porcellanatos":   ["nombre", "sku", "codigo", "marca", "descripcion"],
  "revestimientos":  ["nombre", "sku", "material", "descripcion"],
  "pisos-vinilicos": ["nombre", "sku", "codigo", "marca", "descripcion"],
  "pisos-madera":    ["especie", "sku", "marca", "descripcion"],
  "decks":           ["nombre", "sku", "marca", "descripcion"],
  "maderas":         ["nombre", "sku", "origen", "descripcion"],
  "accesorios":      ["nombre", "sku", "subtipo", "descripcion"],
};

type FilterField = { key: string; label: string };

// Filtros disponibles por categoría, según los campos de cada tabla
const FILTER_FIELDS_BY_TABLE: Record<string, FilterField[]> = {
  "pisos-flotantes": [
    { key: "categoriaTerciaria", label: "Tipo" },
    { key: "marca",        label: "Marca" },
    { key: "linea",        label: "Línea" },
    { key: "origen",       label: "Origen" },
    { key: "tipoProducto", label: "Tipo de producto" },
    { key: "tipoDeUso",    label: "Tipo de uso" },
    { key: "espesor",      label: "Espesor" },
  ],
  "porcellanatos": [
    { key: "marca",        label: "Marca" },
    { key: "linea",        label: "Línea" },
    { key: "origen",       label: "Origen" },
    { key: "tipoProducto", label: "Tipo de producto" },
    { key: "tipoDeUso",    label: "Tipo de uso" },
    { key: "acabado",      label: "Acabado" },
    { key: "terminacion",  label: "Terminación" },
    { key: "espesor",      label: "Espesor" },
  ],
  "revestimientos": [
    { key: "uso", label: "Tipo de uso" },
  ],
  "pisos-vinilicos": [
    { key: "categoriaTerciaria", label: "Tipo" },
    { key: "marca",        label: "Marca" },
    { key: "linea",        label: "Línea" },
    { key: "origen",       label: "Origen" },
    { key: "tipoProducto", label: "Tipo de producto" },
    { key: "tipoDeUso",    label: "Tipo de uso" },
    { key: "espesorTotal", label: "Espesor total" },
  ],
  "pisos-madera": [
    { key: "marca",       label: "Marca" },
    { key: "linea",       label: "Línea" },
    { key: "especie",     label: "Especie" },
    { key: "subtipo",     label: "Subtipo" },
    { key: "acabado",     label: "Acabado" },
    { key: "terminacion", label: "Terminación" },
    { key: "origen",      label: "Origen" },
    { key: "espesor",     label: "Espesor" },
  ],
  "decks": [],
  "maderas": [
    { key: "tipoProducto",         label: "Tipo de producto" },
    { key: "origen",               label: "Origen" },
    { key: "secado",               label: "Secado" },
    { key: "espesoresDisponibles", label: "Espesores" },
  ],
  "accesorios": [
    { key: "tipoProducto", label: "Tipo de producto" },
    { key: "subtipo",      label: "Subtipo" },
    { key: "colores",      label: "Colores" },
    { key: "espesor",      label: "Espesor" },
  ],
};

const PRIORITY_TYPE: Record<string, string> = {
  "pisos-flotantes": "piso flotante",
  "porcellanatos": "porcelanato",
  "revestimientos": "revestimiento",
  "pisos-vinilicos": "piso vinilico",
  "decks": "deck",
  "maderas": "madera",
  "accesorios": "accesorio",
};

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = !!(cookieStore.get("next-auth.session-token")?.value
      || cookieStore.get("__Secure-next-auth.session-token")?.value);

    const sp = req.nextUrl.searchParams;
    const search = sanitizeText(sp.get("search") ?? "", 100);
    const categoria = sp.get("categoria") ?? "";
    const sortBy = sanitizeText(sp.get("sortBy") ?? "relevancia", 50);
    const skip = parseIntSafe(sp.get("skip"), 0, 0, 1_000_000);
    const take = parseIntSafe(sp.get("take"), 15, 1, 200);

    // Los filtros por característica solo aplican dentro de una categoría
    const filterFields: FilterField[] = categoria
      ? FILTER_FIELDS_BY_TABLE[categoria] ?? []
      : [];

    // Parse filters (solo claves válidas para la categoría seleccionada)
    const activeFilters: Record<string, string> = {};
    for (const f of filterFields) {
      const val = sanitizeText(sp.get(`filtros[${f.key}]`) ?? "", 100);
      if (val) activeFilters[f.key] = val;
    }

    // Reverse alias map
    const reverseAliases: Record<string, string[]> = {};
    for (const [variant, canonical] of Object.entries(BRAND_ALIASES)) {
      if (!reverseAliases[canonical]) reverseAliases[canonical] = [canonical];
      reverseAliases[canonical].push(variant);
    }

    // Clave de caché por combinación de parámetros
    const cacheKey = JSON.stringify({ search, categoria, skip, take, activeFilters, auth: isAuthenticated });
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    // Determine which tables to query
    const tablesToQuery = categoria
      ? TABLES.filter((t) => t.key === categoria)
      : TABLES;

    // Build filter queries (run in parallel with product queries)
    const filterTable = categoria && filterFields.length > 0 ? tablesToQuery[0] : null;
    const filterPromises = filterTable
      ? filterFields.map((fd) => {
          const otherFilters: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(activeFilters)) {
            if (k === fd.key) continue;
            if (MULTI_VALUE_FIELDS.has(k)) {
              otherFilters[k] = { contains: v };
            } else {
              const vars = reverseAliases[v];
              otherFilters[k] = vars ? { in: vars } : v;
            }
          }
          return timeout(
            (filterTable.delegate() as any).findMany({
              where: { isActive: true, ...otherFilters },
              select: { [fd.key]: true },
            }) as Promise<Record<string, unknown>[]>,
            QUERY_TIMEOUT_MS,
            [] as Record<string, unknown>[]
          );
        })
      : [];

    // Query all tables + filters in parallel
    const singleTable = tablesToQuery.length === 1;
    const productPromises = tablesToQuery.map(async (table) => {
      const d = table.delegate() as any;
      const where: Record<string, unknown> = { isActive: true, AND: [{ imagenes: { not: null } }, { imagenes: { not: "" } }, { imagenes: { not: "[]" } }] };
      for (const [key, val] of Object.entries(activeFilters)) {
        if (MULTI_VALUE_FIELDS.has(key)) {
          where[key] = { contains: val };
        } else {
          const vars = reverseAliases[val];
          where[key] = vars ? { in: vars } : val;
        }
      }
      if (search) {
        const fields = SEARCH_FIELDS[table.key] ?? ["nombre", "sku"];
        where.OR = fields.map((f) => ({ [f]: { contains: search } }));
      }
      const needsPrioritySort = singleTable && !!PRIORITY_TYPE[table.key];
      const findArgs: Record<string, unknown> = { where };

      if (sortBy === "precio-menor") {
        findArgs.orderBy = [{ precio: "asc" }];
      } else if (sortBy === "precio-mayor") {
        findArgs.orderBy = [{ precio: "desc" }];
      } else if (sortBy === "nombre-az") {
        findArgs.orderBy = [{ nombre: "asc" }];
      } else if (sortBy === "nombre-za") {
        findArgs.orderBy = [{ nombre: "desc" }];
      } else if (sortBy === "recientes") {
        findArgs.orderBy = [{ createdAt: "desc" }];
      } else {
        findArgs.orderBy = [{ sortOrder: "asc" }, { createdAt: "desc" }];
      }

      if (singleTable && !needsPrioritySort) {
        findArgs.skip = skip;
        findArgs.take = take;
      } else if (!singleTable) {
        findArgs.take = skip + take;
      }
      const [rows, count] = await Promise.all([
        timeout(
          d.findMany(findArgs) as Promise<Record<string, unknown>[]>,
          QUERY_TIMEOUT_MS,
          [] as Record<string, unknown>[]
        ),
        timeout(d.count({ where }) as Promise<number>, QUERY_TIMEOUT_MS, 0),
      ]);
      return { key: table.key, label: table.label, rows, count, needsPrioritySort };
    });

    const [results, filterResults] = await Promise.all([
      Promise.all(productPromises),
      Promise.all(filterPromises),
    ]);

    // Merge all products
    const merged = results.flatMap((r) =>
      r.rows.map((row) => {
        const clean: Record<string, unknown> = { _tabla: r.key, _tablaLabel: r.label };
        for (const [k, v] of Object.entries(row)) {
          if (!isAuthenticated && (k.startsWith("precio") || k === "stock" || k === "moneda")) continue;
          clean[k] = v;
        }
        return formatMeasureFields(clean);
      })
    );

    const total = results.reduce((sum, r) => sum + r.count, 0);

    const priorityType = categoria ? PRIORITY_TYPE[categoria] : null;
    if (priorityType) {
      merged.sort((a, b) => {
        const aMatch = typeof a.tipoProducto === "string" && a.tipoProducto.toLowerCase().includes(priorityType) ? 0 : 1;
        const bMatch = typeof b.tipoProducto === "string" && b.tipoProducto.toLowerCase().includes(priorityType) ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    const hasPrioritySort = results.some((r) => r.needsPrioritySort);
    const allProducts = singleTable
      ? (hasPrioritySort ? merged.slice(skip, skip + take) : merged)
      : merged.slice(skip, skip + take);
    const totalMostrado = merged.length > 0 ? total : 0;

    // Build filter values
    const filtros: Record<string, { label: string; values: string[] }> = {};
    for (let i = 0; i < filterFields.length; i++) {
      const fd = filterFields[i];
      const isMulti = MULTI_VALUE_FIELDS.has(fd.key);
      const unique = [...new Set(
        (filterResults[i] ?? [])
          .flatMap((r) => {
            const v = r[fd.key];
            if (typeof v !== "string" || v.trim() === "") return [];
            if (isMulti) {
              return v.split("|").map((s) => s.trim()).filter(Boolean);
            }
            return [BRAND_ALIASES[v] ?? v];
          })
      )].sort((a, b) => {
        const na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b, "es", { numeric: true });
      });
      if (unique.length > 0) {
        filtros[fd.key] = { label: fd.label, values: unique };
      }
    }

    // Categories available
    const categorias = TABLES.map((t) => ({ key: t.key, label: t.label }));

    const payload = {
      success: true,
      data: { productos: allProducts, total: totalMostrado, filtros, categorias },
    };

    // Guardar en caché solo respuestas con datos (no cachear resultados vacíos
    // provocados por timeouts, para reintentar en la próxima carga).
    if (allProducts.length > 0) {
      cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload });
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[catalogo/todos] error:", err);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
