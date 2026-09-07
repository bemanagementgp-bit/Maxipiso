import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LINEAS_DEFECTO, normalizarLinea } from "@/lib/lineas-home";

export const runtime = "nodejs";

/**
 * Portadas de las líneas del home.
 *
 * El GET es público: es exactamente lo que ya se ve en la portada, no hay nada
 * reservado en el rótulo y la foto de una card. Editar es sólo ADMIN y vive en
 * `[slug]/route.ts`.
 */
export async function GET(req: NextRequest) {
  try {
    // El panel las quiere todas para poder reactivar una apagada; cualquier
    // otro consumidor sólo las visibles.
    const soloActivas = req.nextUrl.searchParams.get("todos") !== "1";
    const filas = await prisma.lineaHome.findMany({
      where: soloActivas ? { isActive: true } : {},
      orderBy: [{ orden: "asc" }, { label: "asc" }],
    });
    const lineas =
      filas.length > 0
        ? filas.map((f) => normalizarLinea(f as unknown as Record<string, unknown>))
        : LINEAS_DEFECTO;
    return NextResponse.json({ success: true, data: { lineas } });
  } catch (error) {
    console.error("[lineas GET] error:", error);
    return NextResponse.json({ error: "Error al obtener las portadas" }, { status: 500 });
  }
}
