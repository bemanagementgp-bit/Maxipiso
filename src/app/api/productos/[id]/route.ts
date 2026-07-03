// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

// Tablas disponibles
const TABLE_KEYS = [
  "pisoFlotante","porcellanato","revestimiento","pisoVinilico",
  "pisoMadera","deck","madera","accesorio",
] as const;

const DB_NAMES: Record<string, string> = {
  pisoFlotante:"pisos_flotantes", porcellanato:"porcellanatos",
  revestimiento:"revestimientos", pisoVinilico:"pisos_vinilicos",
  pisoMadera:"pisos_madera", deck:"decks", madera:"maderas", accesorio:"accesorios",
};

// Busca el producto en todas las tablas
async function findInAllTables(id: string) {
  for (const key of TABLE_KEYS) {
    const delegate = (prisma as any)[key];
    if (!delegate) continue;
    const row = await delegate.findUnique({ where: { id } }).catch(() => null);
    if (row) return { row, tableKey: key, tablaNombre: DB_NAMES[key] };
  }
  return null;
}

// GET
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const found = await findInAllTables(id);
    if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data: { ...found.row, _tabla: found.tablaNombre } });
  } catch (error) {
    console.error("[producto GET] error:", error);
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

// PUT
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    let raw: Record<string, unknown>;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: "Cuerpo invalido" }, { status: 400 }); }

    const found = await findInAllTables(id);
    if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const delegate = (prisma as any)[found.tableKey];
    const { _tabla, _tablaLabel, id: _id, createdAt, updatedAt, ...data } = raw;
    const updated = await delegate.update({ where: { id }, data });

    // Changelogs por campo
    for (const [key, value] of Object.entries(data)) {
      const prev = (found.row as any)[key];
      if (prev !== value) {
        await prisma.changeLog.create({
          data: {
            tablaNombre: found.tablaNombre,
            entidadId: id,
            usuarioId: session.user.id,
            campo: key,
            valorAnterior: String(prev ?? ""),
            valorNuevo: String(value ?? ""),
            tipo: "UPDATE",
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[producto PUT] error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

// DELETE (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const found = await findInAllTables(id);
    if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const delegate = (prisma as any)[found.tableKey];
    await delegate.update({ where: { id }, data: { isActive: false } });

    await prisma.changeLog.create({
      data: {
        tablaNombre: found.tablaNombre,
        entidadId: id,
        usuarioId: session.user.id,
        campo: "isActive",
        valorAnterior: "true",
        valorNuevo: "false",
        tipo: "DELETE",
      },
    });

    return NextResponse.json({ success: true, message: "Producto eliminado" });
  } catch (error) {
    console.error("[producto DELETE] error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
