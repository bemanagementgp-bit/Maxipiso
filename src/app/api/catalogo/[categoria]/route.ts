import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sanitizeText, parseIntSafe } from "@/lib/security";

export const runtime = "nodejs";

const CACHE_TTL_MS = 60_000;
type CacheEntry = { expires: number; payload: unknown };
const cache = new Map<string, CacheEntry>();

type PrismaDelegate = {
  findMany: (args: object) => Promise<unknown[]>;
  count: (args: object) => Promise<number>;
};

function getDelegate(slug: string): PrismaDelegate | null {
  const map: Record<string, PrismaDelegate> = {
    "pisos-flotantes": prisma.pisoFlotante as unknown as PrismaDelegate,
    "porcellanatos":   prisma.porcellanato as unknown as PrismaDelegate,
    "revestimientos":  prisma.revestimiento as unknown as PrismaDelegate,
    "pisos-vinilicos": prisma.pisoVinilico as unknown as PrismaDelegate,
    "pisos-madera":    prisma.pisoMadera as unknown as PrismaDelegate,
    "decks":           prisma.deck as unknown as PrismaDelegate,
    "maderas":         prisma.madera as unknown as PrismaDelegate,
    "accesorios":      prisma.accesorio as unknown as PrismaDelegate,
  };
  return map[slug] ?? null;
}

// Campos filtrables por categoría
const FILTERABLE_FIELDS: Record<string, { key: string; label: string }[]> = {
  "pisos-flotantes": [
    { key: "categoriaSecundaria", label: "Categoría secundaria" },
    { key: "tipoDeProducto", label: "Tipo de producto" },
    { key: "categoriaTerciaria", label: "Categoría terciaria" },
    { key: "marca", label: "Marca" },
    { key: "linea", label: "Línea" },
    { key: "tipoDeUso", label: "Tipo de uso" },
    { key: "espesor", label: "Espesor" },
    { key: "abrasion", label: "Abrasión" },
    { key: "bisel", label: "Bisel" },
    { key: "origen", label: "Origen" },
  ],
  "porcellanatos": [
    { key: "marca", label: "Marca" },
    { key: "linea", label: "Línea" },
    { key: "acabado", label: "Acabado" },
    { key: "terminacion", label: "Terminación" },
    { key: "tipoDeUso", label: "Tipo de uso" },
    { key: "espesor", label: "Espesor" },
    { key: "origen", label: "Origen" },
    { key: "categoriaSecundaria", label: "Subcategoría" },
  ],
  "revestimientos": [
    { key: "categoriaPrincipal", label: "Categoría" },
    { key: "marca", label: "Marca" },
    { key: "material", label: "Material" },
    { key: "uso", label: "Uso" },
    { key: "linea", label: "Línea" },
    { key: "espesor", label: "Espesor" },
    { key: "tipoProducto", label: "Tipo" },
  ],
  "pisos-vinilicos": [
    { key: "categoriaSecundaria", label: "Categoría secundaria" },
    { key: "tipoDeProducto", label: "Tipo de producto" },
    { key: "categoriaTerciaria", label: "Categoría terciaria" },
    { key: "marca", label: "Marca" },
    { key: "linea", label: "Línea" },
    { key: "material", label: "Material" },
    { key: "tipoDeUso", label: "Tipo de uso" },
    { key: "espesorTotal", label: "Espesor" },
    { key: "capaDeUso", label: "Capa de uso" },
    { key: "bisel", label: "Bisel" },
    { key: "origen", label: "Origen" },
  ],
  "pisos-madera": [
    { key: "marca", label: "Marca" },
    { key: "especie", label: "Especie" },
    { key: "acabado", label: "Acabado" },
    { key: "terminacion", label: "Terminación" },
    { key: "subtipo", label: "Subtipo" },
    { key: "espesor", label: "Espesor" },
    { key: "origen", label: "Origen" },
    { key: "categoriaSecundaria", label: "Subcategoría" },
  ],
  "decks": [
    { key: "marca", label: "Marca" },
    { key: "material", label: "Material" },
    { key: "linea", label: "Línea" },
    { key: "espesor", label: "Espesor (mm)" },
    { key: "tipoProducto", label: "Tipo" },
  ],
  "maderas": [
    { key: "tipoProducto", label: "Tipo" },
    { key: "origen", label: "Origen" },
    { key: "secado", label: "Secado" },
    { key: "espesoresDisponibles", label: "Espesores" },
  ],
  "accesorios": [
    { key: "tipoProducto", label: "Tipo" },
    { key: "subtipo", label: "Subtipo" },
    { key: "espesor", label: "Espesor" },
    { key: "colores", label: "Colores" },
  ],
};

const BRAND_ALIASES: Record<string, string> = {
  "Max Core": "MaxCore",
};

const MULTI_VALUE_FIELDS = new Set(["espesoresDisponibles"]);

const SEARCH_FIELDS: Record<string, string[]> = {
  "pisos-flotantes": ["nombre", "sku", "codigo", "marca", "linea", "descripcion"],
  "porcellanatos":   ["nombre", "sku", "codigo", "marca", "linea", "descripcion"],
  "revestimientos":  ["nombre", "sku", "marca", "material", "descripcion"],
  "pisos-vinilicos": ["nombre", "sku", "codigo", "marca", "linea", "descripcion"],
  "pisos-madera":    ["especie", "sku", "marca", "linea", "descripcion"],
  "decks":           ["nombre", "sku", "marca", "material", "descripcion"],
  "maderas":         ["nombre", "sku", "origen", "descripcion"],
  "accesorios":      ["nombre", "sku", "subtipo", "descripcion"],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoria: string }> }
) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = !!(cookieStore.get("next-auth.session-token")?.value
      || cookieStore.get("__Secure-next-auth.session-token")?.value);

    const { categoria } = await params;
    const slug = categoria.toLowerCase();

    const delegate = getDelegate(slug);
    if (!delegate) {
      return NextResponse.json(
        { success: false, error: `Categoría desconocida: ${slug}` },
        { status: 404 }
      );
    }

    const sp     = req.nextUrl.searchParams;
    const search = sanitizeText(sp.get("search") ?? "", 100);
    const skip   = parseIntSafe(sp.get("skip"), 0,  0, 1_000_000);
    const take   = parseIntSafe(sp.get("take"), 48, 1, 200);

    // Parse filters from query: filtros[key]=value
    const fieldDefs = FILTERABLE_FIELDS[slug] ?? [];
    const filterKeys = fieldDefs.map((f) => f.key);
    const activeFilters: Record<string, string> = {};
    for (const fk of filterKeys) {
      const val = sp.get(`filtros[${fk}]`);
      if (val) activeFilters[fk] = val;
    }

    // Reverse alias map: canonical → all DB variants
    const reverseAliases: Record<string, string[]> = {};
    for (const [variant, canonical] of Object.entries(BRAND_ALIASES)) {
      if (!reverseAliases[canonical]) reverseAliases[canonical] = [canonical];
      reverseAliases[canonical].push(variant);
    }

    // Cache lookup
    const cacheKey = JSON.stringify({ slug, search, skip, take, activeFilters, auth: isAuthenticated });
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    // Build WHERE (expand aliased brand values, use contains for multi-value fields)
    const where: Record<string, unknown> = { isActive: true, AND: [{ imagenes: { not: null } }, { imagenes: { not: "" } }, { imagenes: { not: "[]" } }] };
    for (const [key, val] of Object.entries(activeFilters)) {
      if (MULTI_VALUE_FIELDS.has(key)) {
        where[key] = { contains: val };
      } else {
        const variants = reverseAliases[val];
        where[key] = variants ? { in: variants } : val;
      }
    }
    if (search) {
      const fields = SEARCH_FIELDS[slug] ?? ["nombre", "sku"];
      where.OR = fields.map((f) => ({ [f]: { contains: search } }));
    }

    // Run products + count + all filter queries in parallel
    const filterPromises = fieldDefs.map((fd) => {
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
      return delegate
        .findMany({ where: { isActive: true, ...otherFilters }, select: { [fd.key]: true } })
        .catch(() => []);
    });

    const [productosRaw, total, ...filterResults] = await Promise.all([
      delegate.findMany({ where, skip, take, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
      delegate.count({ where }),
      ...filterPromises,
    ]);

    const filtros: Record<string, { label: string; values: string[] }> = {};
    for (let i = 0; i < fieldDefs.length; i++) {
      const fd = fieldDefs[i];
      const isMulti = MULTI_VALUE_FIELDS.has(fd.key);
      const unique = [...new Set(
        (filterResults[i] as Record<string, unknown>[])
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

    // Sort: main products first, accessories/secondary types last
    const SECONDARY_TYPES = new Set([
      "Accesorios", "Pastinas", "Adhesivos", "Limpiador",
      "Terminaciones", "Perfil",
    ]);
    (productosRaw as Record<string, unknown>[]).sort((a, b) => {
      const aSecondary = SECONDARY_TYPES.has(String(a.tipoProducto ?? "")) ||
        String(a.categoriaSecundaria ?? "") === "Accesorios" ? 1 : 0;
      const bSecondary = SECONDARY_TYPES.has(String(b.tipoProducto ?? "")) ||
        String(b.categoriaSecundaria ?? "") === "Accesorios" ? 1 : 0;
      return aSecondary - bSecondary;
    });

    const productos = (productosRaw as Record<string, unknown>[]).map((row) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!isAuthenticated && (k.startsWith("precio") || k === "stock" || k === "moneda")) continue;
        clean[k] = v;
      }
      return clean;
    });

    const payload = { success: true, data: { productos, total, skip, take, filtros } };
    if (productos.length > 0) {
      cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload });
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[catalogo/[categoria]] error:", err);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
