// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchProducts, findProductById, PRICE_FIELDS } from "@/lib/all-products";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const q         = req.nextUrl.searchParams.get("q")?.trim()         ?? "";
  const productId = req.nextUrl.searchParams.get("productId")?.trim() ?? "";

  // Búsqueda de productos
  if (!productId) {
    if (q.length < 2) return NextResponse.json({ success: true, data: { productos: [] } });
    const productos = await searchProducts(q, 8);
    return NextResponse.json({ success: true, data: { productos } });
  }

  // Historial de precios de un producto específico
  const found = await findProductById(productId);
  if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const logs = await prisma.changeLog.findMany({
    where: { entidadId: productId, campo: { in: [...PRICE_FIELDS] } },
    orderBy: { fechaCambio: "asc" },
    select: { valorAnterior: true, valorNuevo: true, fechaCambio: true, tipo: true },
  });

  // Construir serie temporal
  const serie: { fecha: string; precio: number; evento: string }[] = [];
  const precioActual = found.normalized.precio;
  const createdAt    = found.raw.createdAt as Date;

  if (logs.length > 0) {
    const precioInicial = parseFloat(logs[0].valorAnterior ?? "0");
    if (precioInicial > 0) {
      serie.push({ fecha: createdAt.toISOString(), precio: precioInicial, evento: "Precio inicial" });
    }
    for (const log of logs) {
      const precio = parseFloat(log.valorNuevo ?? "0");
      if (precio > 0) {
        serie.push({ fecha: log.fechaCambio.toISOString(), precio, evento: "Actualización" });
      }
    }
  } else {
    serie.push({ fecha: createdAt.toISOString(), precio: precioActual, evento: "Precio actual" });
  }

  // Métricas de la serie
  const precios        = serie.map((s) => s.precio);
  const precioMin      = Math.min(...precios);
  const precioMax      = Math.max(...precios);
  const precioInicial  = precios[0] ?? precioActual;
  const variacionTotal = precioInicial > 0
    ? Math.round(((precioActual - precioInicial) / precioInicial) * 100)
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      producto: found.normalized,
      serie,
      metricas: { precioMin, precioMax, precioActual, precioInicial, variacionTotal, cantidadCambios: logs.length },
    },
  });
}

