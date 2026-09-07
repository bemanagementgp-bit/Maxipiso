import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revisarBase } from "@/lib/db-health";

export const runtime = "nodejs";

/**
 * Estado de la base contra lo que el codigo espera.
 *
 * Solo ADMIN: el reporte dice que tablas y columnas existen, que es un mapa del
 * modelo de datos. No es secreto, pero tampoco tiene por que ser publico.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    return NextResponse.json({ success: true, data: await revisarBase() });
  } catch (error) {
    console.error("[diagnostico/base] error:", error);
    return NextResponse.json({ error: "No se pudo revisar la base" }, { status: 500 });
  }
}
