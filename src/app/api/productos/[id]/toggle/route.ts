// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const TABLE_KEYS = ["pisoFlotante","porcellanato","revestimiento","pisoVinilico","pisoMadera","deck","madera","accesorio"];
const DB_NAMES: Record<string,string> = { pisoFlotante:"pisos_flotantes",porcellanato:"porcellanatos",revestimiento:"revestimientos",pisoVinilico:"pisos_vinilicos",pisoMadera:"pisos_madera",deck:"decks",madera:"maderas",accesorio:"accesorios" };

async function findInAllTables(id: string) {
  for (const key of TABLE_KEYS) {
    const delegate = (prisma as any)[key];
    if (!delegate) continue;
    const row = await delegate.findUnique({ where: { id } }).catch(() => null);
    if (row) return { row, tableKey: key, tablaNombre: DB_NAMES[key] };
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const newState = !(found.row as any).isActive;
    const updated = await delegate.update({ where: { id }, data: { isActive: newState } });

    await prisma.changeLog.create({
      data: {
        tablaNombre: found.tablaNombre,
        entidadId: id,
        usuarioId: session.user.id,
        campo: "isActive",
        valorAnterior: String(!newState),
        valorNuevo: String(newState),
        tipo: newState ? "UPDATE" : "DELETE",
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[toggle] error:", error);
    return NextResponse.json({ error: "Error al cambiar estado" }, { status: 500 });
  }
}
