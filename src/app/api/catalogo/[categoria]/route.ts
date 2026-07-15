import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeText, parseIntSafe } from "@/lib/security";

export const runtime = "nodejs";

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
    { key: "categoriaTerciaria", label: "Tipo" },
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
    { key: "marca", label: "Marca" },
    { key: "linea", label: "Línea" },
    { key: "material", label: "Material" },
    { key: "tipoDeUso", label: "Tipo de uso" },
    { key: "espesorTotal", label: "Espesor" },
    { key: "capaDeUso", label: "Capa de uso" },
    { key: "bisel", label: "Bisel" },
    { key: "origen", label: "Origen" },
    { key: "categoriaSecundaria", label: "Subcategoría" },
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
    { key: "espesor", label: "Espesor" },
    { key: "tipoProducto", label: "Tipo" },
  ],
  "maderas": [
    { key: "tipoProducto", label: "Tipo" },
    { key: "origen", label: "Origen" },
    { key: "secado", label: "Secado" },
  ],
  "accesorios": [
    { key: "tipoProducto", label: "Tipo" },
    { key: "subtipo", label: "Subtipo" },
    { key: "espesor", label: "Espesor" },
    { key: "colores", label: "Colores" },
  ],
};

const SEARCH_FIELDS: Record<string, string[]> = {
  "pisos-flotantes": ["nombre", "sku", "marca", "linea", "descripcion"],
  "porcellanatos":   ["nombre", "sku", "marca", "linea", "descripcion"],
  "revestimientos":  ["nombre", "sku", "marca", "material", "descripcion"],
  "pisos-vinilicos": ["nombre", "sku", "marca", "linea", "descripcion"],
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

    // Build WHERE
    const where: Record<string, unknown> = { isActive: true };
    for (const [key, val] of Object.entries(activeFilters)) {
      where[key] = val;
    }
    if (search) {
      const fields = SEARCH_FIELDS[slug] ?? ["nombre", "sku"];
      where.OR = fields.map((f) => ({ [f]: { contains: search } }));
    }

    const [productosRaw, total] = await Promise.all([
      delegate.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      delegate.count({ where }),
    ]);

    // Build filtros: for each field, query unique values excluding that field's
    // own active filter so all options remain visible when one is selected.
    const filtros: Record<string, { label: string; values: string[] }> = {};
    if (fieldDefs.length > 0) {
      const filterResults = await Promise.all(
        fieldDefs.map((fd) => {
          const otherFilters = { ...activeFilters };
          delete otherFilters[fd.key];
          return delegate
            .findMany({ where: { isActive: true, ...otherFilters }, select: { [fd.key]: true } })
            .catch(() => []);
        })
      );
      for (let i = 0; i < fieldDefs.length; i++) {
        const fd = fieldDefs[i];
        const unique = [...new Set(
          (filterResults[i] as Record<string, unknown>[])
            .map((r) => r[fd.key])
            .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        )].sort();
        if (unique.length > 0) {
          filtros[fd.key] = { label: fd.label, values: unique };
        }
      }
    }

    const productos = (productosRaw as Record<string, unknown>[]).map((row) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith("precio") || k === "stock" || k === "moneda") continue;
        clean[k] = v;
      }
      return clean;
    });

    return NextResponse.json({
      success: true,
      data: { productos, total, skip, take, filtros },
    });
  } catch (err) {
    console.error("[catalogo/[categoria]] error:", err);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
