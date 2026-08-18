import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCached, setCached } from "@/lib/catalog-cache";
import { sanitizeText, parseIntSafe } from "@/lib/security";
import { formatMeasureFields } from "@/lib/all-products";

export const runtime = "nodejs";

// Fail-fast: si una query a la DB tarda más que esto, se descarta y se sigue
// con el resto (evita que el catálogo se cuelgue cuando Turso está lento).
// Se le da margen suficiente para que el findMany principal complete aunque
// Turso esté degradado, sin llegar a colgar la request más de ~12s.
const QUERY_TIMEOUT_MS = 12_000;


function timeout<T>(promise: Promise<T>, ms: number, fallback: T, label = "query"): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => {
      console.warn(`[catalogo/todos] timeout (${ms}ms) en ${label}`);
      resolve(fallback);
    }, ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (err) => {
        clearTimeout(t);
        // Un rechazo NO es un timeout: casi siempre es una query mal formada
        // (campo inexistente en el modelo). Sin este log el sintoma es
        // "0 productos" sin ningun error visible.
        console.error(`[catalogo/todos] query fallo en ${label}:`, err);
        resolve(fallback);
      }
    );
  });
}

const BRAND_ALIASES: Record<string, string> = {
  "Max Core": "MaxCore",
};

const MULTI_VALUE_FIELDS = new Set(["espesoresDisponibles"]);

// Campo de precio real de cada tabla. Solo `maderas` usa `precio`; el resto
// usa `precioM2`. `accesorios` no tiene precio, asi que no se puede ordenar
// por precio y cae al orden por defecto.
const PRICE_FIELD_BY_TABLE: Record<string, string | null> = {
  "pisos-flotantes": "precioM2",
  "porcellanatos":   "precioM2",
  "revestimientos":  "precioM2",
  "pisos-vinilicos": "precioM2",
  "pisos-madera":    "precioM2",
  "decks":           "precioM2",
  "maderas":         "precio",
  "accesorios":      null,
};

type OrderBy = Record<string, "asc" | "desc">[];

const DEFAULT_ORDER_BY: OrderBy = [{ sortOrder: "asc" }, { createdAt: "desc" }];

/** Clave interna para el orden global. Nunca sale en la respuesta. */
const SORT_PRICE_KEY = "__sortPrice";

/** Traduce el `sortBy` publico al `orderBy` de Prisma para una tabla concreta. */
function buildOrderBy(sortBy: string, tableKey: string): OrderBy {
  if (sortBy === "precio-menor" || sortBy === "precio-mayor") {
    const field = PRICE_FIELD_BY_TABLE[tableKey];
    if (!field) return DEFAULT_ORDER_BY;
    return [{ [field]: sortBy === "precio-menor" ? "asc" : "desc" }];
  }
  if (sortBy === "nombre-az") return [{ nombre: "asc" }];
  if (sortBy === "nombre-za") return [{ nombre: "desc" }];
  if (sortBy === "recientes")  return [{ createdAt: "desc" }];
  return DEFAULT_ORDER_BY;
}

/** Precio numerico de una fila, sea cual sea la tabla. Para el orden global. */
function rowPrice(row: Record<string, unknown>): number | null {
  for (const field of ["precioM2", "precio", "precioCaja", "precioTabla", "precioMLineal", "precioMl"]) {
    const v = row[field];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

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
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

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
            [] as Record<string, unknown>[],
            `filtros ${filterTable.key}.${fd.key}`
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

      findArgs.orderBy = buildOrderBy(sortBy, table.key);

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
          [] as Record<string, unknown>[],
          `findMany ${table.key}`
        ),
        timeout(d.count({ where }) as Promise<number>, QUERY_TIMEOUT_MS, 0, `count ${table.key}`),
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
        const formatted = formatMeasureFields(clean);
        // Precio tomado de la fila CRUDA: hace falta para el orden global aunque
        // el usuario anonimo no vaya a verlo. Se borra antes de responder.
        formatted[SORT_PRICE_KEY] = rowPrice(row);
        return formatted;
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

    // Cada tabla ya trajo sus primeros (skip + take) segun su propio orden, asi
    // que los (skip + take) globales estan garantizados dentro de la union.
    // Reordenar aca y recien despues cortar da el resultado correcto.
    if (!singleTable && sortBy !== "relevancia") {
      const dir = sortBy === "precio-mayor" || sortBy === "nombre-za" ? -1 : 1;
      if (sortBy === "precio-menor" || sortBy === "precio-mayor") {
        merged.sort((a, b) => {
          const pa = a[SORT_PRICE_KEY] as number | null;
          const pb = b[SORT_PRICE_KEY] as number | null;
          if (pa === null && pb === null) return 0;
          if (pa === null) return 1;   // sin precio siempre al final
          if (pb === null) return -1;
          return (pa - pb) * dir;
        });
      } else if (sortBy === "nombre-az" || sortBy === "nombre-za") {
        merged.sort((a, b) =>
          String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es", { numeric: true }) * dir
        );
      } else if (sortBy === "recientes") {
        merged.sort(
          (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
        );
      }
    }

    const hasPrioritySort = results.some((r) => r.needsPrioritySort);
    const allProducts = singleTable
      ? (hasPrioritySort ? merged.slice(skip, skip + take) : merged)
      : merged.slice(skip, skip + take);
    const totalMostrado = merged.length > 0 ? total : 0;
    for (const row of allProducts) delete row[SORT_PRICE_KEY];

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
    if (allProducts.length > 0) setCached(cacheKey, payload);

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
