import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const productos = await prisma.product.findMany({
    where: { isActive: true },
    select: { categoria: true, precio: true, marca: true },
  });

  // Precio promedio por categoría
  const byCategory: Record<string, { sum: number; count: number }> = {};
  for (const p of productos) {
    const cat = p.categoria ?? "Sin categoría";
    if (!byCategory[cat]) byCategory[cat] = { sum: 0, count: 0 };
    byCategory[cat].sum += p.precio;
    byCategory[cat].count += 1;
  }
  const categorias = Object.entries(byCategory)
    .map(([categoria, { sum, count }]) => ({
      categoria,
      avgPrecio: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.avgPrecio - a.avgPrecio);

  // Precio promedio por marca (top 8)
  const byMarca: Record<string, { sum: number; count: number }> = {};
  for (const p of productos) {
    const m = p.marca ?? "Sin marca";
    if (!byMarca[m]) byMarca[m] = { sum: 0, count: 0 };
    byMarca[m].sum += p.precio;
    byMarca[m].count += 1;
  }
  const marcas = Object.entries(byMarca)
    .map(([marca, { sum, count }]) => ({
      marca,
      avgPrecio: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({ success: true, data: { categorias, marcas, total: productos.length } });
}
