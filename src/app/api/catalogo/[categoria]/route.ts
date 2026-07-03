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

// Campos de búsqueda por categoría
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
    const marca  = sanitizeText(sp.get("marca")  ?? "", 100);
    const skip   = parseIntSafe(sp.get("skip"), 0,  0, 1_000_000);
    const take   = parseIntSafe(sp.get("take"), 48, 1, 200);

    const where: Record<string, unknown> = { isActive: true };
    if (marca) where.marca = marca;
    if (search) {
      const fields = SEARCH_FIELDS[slug] ?? ["nombre", "sku"];
      where.OR = fields.map((f) => ({ [f]: { contains: search } }));
    }

    const [productos, total] = await Promise.all([
      delegate.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      delegate.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { productos, total, skip, take } });
  } catch (err) {
    console.error("[catalogo/[categoria]] error:", err);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

