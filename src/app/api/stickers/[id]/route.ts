import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { verifyOrigin } from "@/lib/security";
import { normalizarSticker } from "@/lib/stickers";
import { validarSticker } from "@/lib/sticker-validate";

export const runtime = "nodejs";

async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const authErr = await exigirAdmin();
  if (authErr) return authErr;

  const { id } = await params;

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const validado = validarSticker(raw);
  if ("error" in validado) return NextResponse.json({ error: validado.error }, { status: 400 });

  try {
    const actualizado = await prisma.sticker.update({ where: { id }, data: validado.data as never });
    clearCatalogCache();
    return NextResponse.json({
      success: true,
      data: normalizarSticker(actualizado as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[sticker PUT] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el sticker" }, { status: 500 });
  }
}

/**
 * Borra el sticker del catálogo.
 *
 * NO se limpian las referencias en los productos: `resolverStickers()` descarta
 * los ids que ya no existen, así que un producto con un sticker borrado
 * simplemente deja de mostrarlo. Recorrer las 8 tablas para limpiar cada array
 * sería costoso y no cambiaría nada de lo que se ve.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const authErr = await exigirAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  try {
    await prisma.sticker.delete({ where: { id } });
    clearCatalogCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sticker DELETE] error:", error);
    return NextResponse.json({ error: "No se pudo borrar el sticker" }, { status: 500 });
  }
}
