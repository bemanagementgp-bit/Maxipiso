import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { verifyOrigin } from "@/lib/security";
import { normalizarSticker } from "@/lib/stickers";
import { validarSticker } from "@/lib/sticker-validate";

export const runtime = "nodejs";

/**
 * Catálogo de stickers.
 *
 * El `GET` es público: el catálogo necesita las definiciones para dibujarlos, y
 * no hay nada sensible en un nombre y un color. Crear y modificar es sólo ADMIN.
 */

export async function GET(req: NextRequest) {
  try {
    // El catálogo público sólo necesita los activos; el panel los quiere todos
    // para poder reactivar uno apagado.
    const soloActivos = req.nextUrl.searchParams.get("todos") !== "1";
    const filas = await prisma.sticker.findMany({
      where: soloActivos ? { isActive: true } : {},
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return NextResponse.json({
      success: true,
      data: { stickers: filas.map((f) => normalizarSticker(f as unknown as Record<string, unknown>)) },
    });
  } catch (error) {
    console.error("[stickers GET] error:", error);
    return NextResponse.json({ error: "Error al obtener los stickers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const validado = validarSticker(raw);
  if ("error" in validado) return NextResponse.json({ error: validado.error }, { status: 400 });

  try {
    const creado = await prisma.sticker.create({ data: validado.data as never });
    // Los productos ya cacheados traen los stickers resueltos: si no se limpia,
    // el sticker nuevo no aparece hasta que venza el caché.
    clearCatalogCache();
    return NextResponse.json(
      { success: true, data: normalizarSticker(creado as unknown as Record<string, unknown>) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[stickers POST] error:", error);
    return NextResponse.json({ error: "Error al crear el sticker" }, { status: 500 });
  }
}
