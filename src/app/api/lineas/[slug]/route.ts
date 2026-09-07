import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security";
import { LINEAS_DEFECTO, SLUGS_VALIDOS, normalizarLinea, validarLinea } from "@/lib/lineas-home";

export const runtime = "nodejs";

/**
 * Edita una card del home.
 *
 * Es un `upsert` y no un `update`: el slug es una lista cerrada del código, así
 * que si la fila todavía no está sembrada en ese entorno la primera edición la
 * crea en vez de fallar con "no encontrado".
 *
 * No hay POST ni DELETE a propósito: las líneas son las 8 categorías del
 * catálogo, no una lista libre. Para sacar una del home se la apaga.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { slug } = await params;
  if (!SLUGS_VALIDOS.includes(slug)) {
    return NextResponse.json({ error: "Línea desconocida" }, { status: 404 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const validado = validarLinea(raw);
  if ("error" in validado) return NextResponse.json({ error: validado.error }, { status: 400 });

  try {
    const defecto = LINEAS_DEFECTO.find((l) => l.slug === slug)!;
    const fila = await prisma.lineaHome.upsert({
      where: { slug },
      update: validado.data,
      create: { ...defecto, ...validado.data, slug },
    });
    // El home es ISR: sin esto el cambio no se vería hasta que venza el
    // revalidate, y quien acaba de guardar creería que no se guardó.
    revalidatePath("/");
    return NextResponse.json({
      success: true,
      data: normalizarLinea(fila as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[linea PUT] error:", error);
    return NextResponse.json({ error: "No se pudo guardar la portada" }, { status: 500 });
  }
}
