import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeText, parseIntSafe } from "@/lib/security";

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

const TABLES = [
  { key: "pisos-flotantes", delegate: () => prisma.pisoFlotante, label: "Pisos Flotantes" },
  { key: "porcellanatos",   delegate: () => prisma.porcellanato,  label: "Porcellanatos" },
  { key: "revestimientos",  delegate: () => prisma.revestimiento, label: "Revestimientos" },
  { key: "pisos-vinilicos", delegate: () => prisma.pisoVinilico,  label: "Pisos Vinílicos" },
  { key: "pisos-madera",    delegate: () => prisma.pisoMadera,    label: "Pisos Madera" },
  { key: "decks",           delegate: () => prisma.deck,          label: "Decks" },
  { key: "maderas",         delegate: () => prisma.madera,        label: "Maderas" },
  { key: "accesorios",      delegate: () => prisma.accesorio,     label: "Accesorios" },
] as const;

const SEARCH_FIELDS = ["nombre", "sku", "marca", "descripcion"];

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
  "decks": [
    { key: "marca",        label: "Marca" },
    { key: "linea",        label: "Línea" },
    { key: "material",     label: "Material" },
    { key: "tipoProducto", label: "Tipo de producto" },
    { key: "espesor",      label: "Espesor" },
  ],
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

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const search = sanitizeText(sp.get("search") ?? "", 100);
    const categoria = sp.get("categoria") ?? "";
    const take = parseIntSafe(sp.get("take"), 60, 1, 200);

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

    // Clave de caché por combinación de parámetros
    const cacheKey = JSON.stringify({ search, categoria, take, activeFilters });
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    // Determine which tables to query
    const tablesToQuery = categoria
      ? TABLES.filter((t) => t.key === categoria)
      : TABLES;

    // Query all tables in parallel (con timeout por tabla)
    const results = await Promise.all(
      tablesToQuery.map(async (table) => {
        const d = table.delegate() as any;
        const where: Record<string, unknown> = { isActive: true };

        for (const [key, val] of Object.entries(activeFilters)) {
          where[key] = val;
        }

        if (search) {
          where.OR = SEARCH_FIELDS.map((f) => ({ [f]: { contains: search } }));
        }

        const [rows, count] = await Promise.all([
          timeout(
            d.findMany({ where, take, orderBy: { createdAt: "desc" } }) as Promise<Record<string, unknown>[]>,
            QUERY_TIMEOUT_MS,
            [] as Record<string, unknown>[]
          ),
          timeout(d.count({ where }) as Promise<number>, QUERY_TIMEOUT_MS, 0),
        ]);
        return { key: table.key, label: table.label, rows, count };
      })
    );


    // Merge all products
    const allProducts = results.flatMap((r) =>
      r.rows.map((row) => {
        const clean: Record<string, unknown> = { _tabla: r.key, _tablaLabel: r.label };
        for (const [k, v] of Object.entries(row)) {
          if (k.startsWith("precio") || k === "stock" || k === "moneda") continue;
          clean[k] = v;
        }
        return clean;
      })
    );

    const total = results.reduce((sum, r) => sum + r.count, 0);
    // Si el listado quedó vacío (p.ej. porque el findMany superó el timeout)
    // no mostramos un total > 0: evita el estado incoherente "171 productos"
    // sobre una grilla vacía.
    const totalMostrado = allProducts.length > 0 ? total : 0;

    // Build filter values per-category: for each field, exclude its own active
    // filter so all options remain visible when one is selected.
    const filtros: Record<string, { label: string; values: string[] }> = {};
    if (categoria && filterFields.length > 0) {
      const table = tablesToQuery[0];
      if (table) {
        const d = table.delegate() as any;

        const filterResults = await Promise.all(
          filterFields.map((fd) => {
            const otherFilters = { ...activeFilters };
            delete otherFilters[fd.key];
            return timeout(
              d.findMany({
                where: { isActive: true, ...otherFilters },
                select: { [fd.key]: true },
              }) as Promise<Record<string, unknown>[]>,
              QUERY_TIMEOUT_MS,
              [] as Record<string, unknown>[]
            );
          })
        );

        for (let i = 0; i < filterFields.length; i++) {
          const fd = filterFields[i];
          const unique = [...new Set(
            filterResults[i]
              .map((r) => r[fd.key])
              .filter((v): v is string => typeof v === "string" && v.trim() !== "")
          )].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
          if (unique.length > 0) {
            filtros[fd.key] = { label: fd.label, values: unique };
          }
        }
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

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[catalogo/todos] error:", err);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
