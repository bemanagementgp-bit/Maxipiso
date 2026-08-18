import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIntSafe } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const skip = parseIntSafe(sp.get("skip"), 0, 0, 1_000_000);
    const take = parseIntSafe(sp.get("take"), 20, 1, 100);

    const [logs, total] = await Promise.all([
      prisma.changeLog.findMany({
        where: { entidadId: id },
        orderBy: { fechaCambio: "desc" },
        skip,
        take,
        include: { usuario: { select: { email: true, name: true } } },
      }),
      prisma.changeLog.count({ where: { entidadId: id } }),
    ]);

    return NextResponse.json({ success: true, data: { logs, total } });
  } catch (error) {
    console.error("[historial GET] error:", error);
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}
