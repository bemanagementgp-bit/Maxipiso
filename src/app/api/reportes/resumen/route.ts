import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [productos, cambiosPrecios] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true, sku: true, nombre: true, marca: true, categoria: true,
        precio: true, imagen: true, isActive: true, stock: true,
        destacado: true, createdAt: true,
      },
    }),
    prisma.changeLog.findMany({
      where: { campo: "precio" },
      orderBy: { fechaCambio: "desc" },
      take: 50,
      select: {
        productId: true, valorAnterior: true, valorNuevo: true, fechaCambio: true,
        product: { select: { sku: true, nombre: true, categoria: true } },
      },
    }),
  ]);

  const total = productos.length;
  const activos = productos.filter((p) => p.isActive).length;
  const conImagen = productos.filter((p) => p.imagen).length;
  const conCategoria = productos.filter((p) => p.categoria).length;
  const sinPrecio = productos.filter((p) => !p.precio || p.precio === 0).length;
  const conStock = productos.filter((p) => p.stock !== null && p.stock !== undefined).length;
  const destacados = productos.filter((p) => p.destacado).length;

  // Distribución por categoría
  const catMap: Record<string, { count: number; sum: number }> = {};
  for (const p of productos) {
    const cat = p.categoria ?? "Sin categoría";
    if (!catMap[cat]) catMap[cat] = { count: 0, sum: 0 };
    catMap[cat].count++;
    catMap[cat].sum += p.precio;
  }
  const porCategoria = Object.entries(catMap)
    .map(([categoria, { count, sum }]) => ({
      categoria,
      count,
      avgPrecio: Math.round(sum / count),
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Ranking de marcas (top 10 por cantidad)
  const marcaMap: Record<string, { count: number; sum: number }> = {};
  for (const p of productos) {
    const m = p.marca ?? "Sin marca";
    if (!marcaMap[m]) marcaMap[m] = { count: 0, sum: 0 };
    marcaMap[m].count++;
    marcaMap[m].sum += p.precio;
  }
  const porMarca = Object.entries(marcaMap)
    .map(([marca, { count, sum }]) => ({
      marca,
      count,
      avgPrecio: Math.round(sum / count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Distribución de precios por rango
  const rangos = [
    { label: "< $5.000",       min: 0,      max: 5000 },
    { label: "$5k – $15k",     min: 5000,   max: 15000 },
    { label: "$15k – $30k",    min: 15000,  max: 30000 },
    { label: "$30k – $60k",    min: 30000,  max: 60000 },
    { label: "$60k – $100k",   min: 60000,  max: 100000 },
    { label: "> $100.000",     min: 100000, max: Infinity },
  ];
  const distribucionPrecios = rangos.map((r) => ({
    rango: r.label,
    count: productos.filter((p) => p.precio >= r.min && p.precio < r.max).length,
  }));

  // Últimas variaciones de precio (con delta %)
  const ultimasVariaciones = cambiosPrecios
    .map((c) => {
      const anterior = parseFloat(c.valorAnterior ?? "0");
      const nuevo = parseFloat(c.valorNuevo ?? "0");
      if (!anterior || !nuevo) return null;
      const delta = Math.round(((nuevo - anterior) / anterior) * 100);
      return {
        sku: c.product.sku,
        nombre: c.product.nombre,
        categoria: c.product.categoria,
        anterior,
        nuevo,
        delta,
        fecha: c.fechaCambio,
      };
    })
    .filter(Boolean)
    .slice(0, 12);

  // Productos recientemente agregados (últimos 30 días)
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const nuevosEsteMes = productos.filter((p) => new Date(p.createdAt) > hace30Dias).length;

  return NextResponse.json({
    success: true,
    data: {
      catalogo: { total, activos, conImagen, conCategoria, sinPrecio, conStock, destacados, nuevosEsteMes },
      porCategoria,
      porMarca,
      distribucionPrecios,
      ultimasVariaciones,
    },
  });
}
