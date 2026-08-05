// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllProducts, findProductsByIds, PRICE_FIELDS, TABLE_LABELS } from "@/lib/all-products";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [productos, cambiosPrecios] = await Promise.all([
    getAllProducts(),
    prisma.changeLog.findMany({
      where: { campo: { in: [...PRICE_FIELDS] } },
      orderBy: { fechaCambio: "desc" },
      take: 50,
      select: {
        entidadId: true, valorAnterior: true, valorNuevo: true, fechaCambio: true,
      },
    }),
  ]);

  const total        = productos.length;
  const activos      = productos.filter((p) => p.isActive).length;
  const conImagen    = productos.filter((p) => p.imagen || p.imagenes).length;
  const conCategoria = productos.filter((p) => p.categoria).length;
  const sinPrecio    = productos.filter((p) => !p.precio || p.precio === 0).length;
  const conStock     = productos.filter((p) => p.stock !== null && p.stock !== undefined).length;
  const destacados   = 0; // field not present in multi-table schema

  // Distribución por categoría (usa tabla real, revestimientos separados en ext/int)
  const REV_RENAME: Record<string, string> = {
    "Espacios Exterior": "Revestimientos Exteriores",
    "Espacios Interiores": "Revestimientos Interiores",
  };
  const catMap: Record<string, { count: number; sum: number }> = {};
  for (const p of productos) {
    let cat: string;
    if (p.tablaNombre === "revestimientos") {
      const raw = (p as any).categoria ?? "";
      cat = REV_RENAME[raw] ?? "Revestimientos";
    } else {
      cat = TABLE_LABELS[p.tableKey as keyof typeof TABLE_LABELS] ?? p.tablaNombre;
    }
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
  const BRAND_ALIASES: Record<string, string> = { "Max Core": "MaxCore" };
  const marcaMap: Record<string, { count: number; sum: number }> = {};
  for (const p of productos) {
    const raw = p.marca ?? "Sin marca";
    const m = BRAND_ALIASES[raw] ?? raw;
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

  // Últimas variaciones de precio (con delta %)
  const uniqueIds   = [...new Set(cambiosPrecios.map((c) => c.entidadId))];
  const productoMap = await findProductsByIds(uniqueIds);

  const ultimasVariaciones = cambiosPrecios
    .map((c) => {
      const anterior = parseFloat(c.valorAnterior ?? "0");
      const nuevo    = parseFloat(c.valorNuevo   ?? "0");
      if (!anterior || !nuevo) return null;
      const delta = Math.round(((nuevo - anterior) / anterior) * 100);
      const prod  = productoMap.get(c.entidadId);
      return {
        sku:       prod?.sku       ?? c.entidadId,
        nombre:    prod?.nombre    ?? "\u2014",
        categoria: prod?.categoria ?? "\u2014",
        anterior,
        nuevo,
        delta,
        fecha: c.fechaCambio,
      };
    })
    .filter(Boolean)
    .slice(0, 12);

  // Productos recientemente agregados (últimos 30 días)
  const hace30Dias    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const nuevosEsteMes = productos.filter((p) => new Date(p.createdAt as string) > hace30Dias).length;

  return NextResponse.json({
    success: true,
    data: {
      catalogo: { total, activos, conImagen, conCategoria, sinPrecio, conStock, destacados, nuevosEsteMes },
      porCategoria,
      porMarca,
      ultimasVariaciones,
    },
  });
}

