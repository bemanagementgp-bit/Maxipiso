import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeText, parseIntSafe } from "@/lib/security";
import { enrichCatalogProduct, sortCatalogProducts } from "@/lib/catalog-public";
import { products } from "@/data/products";

export const runtime = "nodejs";

// Mapeo de categorías estáticas → categorías del catálogo
const CAT_MAP: Record<string, { categoria: string; subcategoria: string }> = {
  Porcelanato: { categoria: "Pisos",          subcategoria: "Porcelanato" },
  Cerámica:    { categoria: "Pisos",          subcategoria: "Cerámica" },
  Madera:      { categoria: "Maderas",        subcategoria: "" },
  Placas:      { categoria: "Revestimientos", subcategoria: "" },
  Accesorios:  { categoria: "Accesorios",     subcategoria: "" },
};

// GET público: productos activos filtrados por categoria/subcategoria
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      const searchParams = req.nextUrl.searchParams;
      const categoria    = searchParams.get("categoria")    ?? "";
      const subcategoria = searchParams.get("subcategoria") ?? "";
      const search       = (searchParams.get("search") ?? "").toLowerCase();

      let result = products.map((p) => {
        const mapped = CAT_MAP[p.category] ?? { categoria: p.category, subcategoria: "" };
        return {
          id:          p.id,
          sku:         p.id,
          nombre:      p.name,
          marca:       "Maxipiso",
          descripcion: p.description,
          precio:      0,
          imagen:      p.image,
          categoria:   mapped.categoria,
          subcategoria: mapped.subcategoria,
          destacado:   false,
        };
      });

      if (categoria)    result = result.filter(p => p.categoria    === categoria);
      if (subcategoria) result = result.filter(p => p.subcategoria === subcategoria);
      if (search)       result = result.filter(p =>
        p.nombre.toLowerCase().includes(search) ||
        p.descripcion?.toLowerCase().includes(search)
      );

      return NextResponse.json({
        success: true,
        data: { productos: result, total: result.length },
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const categoria   = sanitizeText(searchParams.get("categoria")   ?? "", 100);
    const subcategoria = sanitizeText(searchParams.get("subcategoria") ?? "", 100);
    const search      = sanitizeText(searchParams.get("search")      ?? "", 100);
    const skip        = parseIntSafe(searchParams.get("skip"),  0,  0, 1_000_000);
    const take        = parseIntSafe(searchParams.get("take"), 48,  1, 500);

    const where: Record<string, unknown> = { isActive: true };

    if (categoria)    where.categoria    = categoria;
    if (subcategoria) where.subcategoria = subcategoria;
    if (search) {
      where.OR = [
        { nombre:      { contains: search } },
        { sku:         { contains: search } },
        { marca:       { contains: search } },
        { descripcion: { contains: search } },
      ];
    }

    const [productos, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: [{ categoria: "asc" }, { subcategoria: "asc" }, { nombre: "asc" }],
        select: {
          id: true,
          sku: true,
          nombre: true,
          marca: true,
          descripcion: true,
          precio: true,
          imagen: true,
          categoria: true,
          subcategoria: true,
          imagenes: {
            select: { url: true },
            orderBy: { fechaCarga: "asc" },
            take: 4,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const publicProducts = sortCatalogProducts(productos).map(enrichCatalogProduct);

    return NextResponse.json({ success: true, data: { productos: publicProducts, total } });
  } catch (error) {
    console.error("[catalogo GET] error:", error);
    return NextResponse.json({ error: "Error al obtener catálogo" }, { status: 500 });
  }
}
