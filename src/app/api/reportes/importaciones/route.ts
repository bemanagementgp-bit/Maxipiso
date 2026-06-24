import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Agrupa eventos CREATE del changelog en "sesiones" (ventana de 5 minutos)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const logs = await prisma.changeLog.findMany({
    where: { tipo: "CREATE", campo: "PRODUCTO" },
    orderBy: { fechaCambio: "desc" },
    take: 200,
    select: { fechaCambio: true, productId: true },
  });

  if (!logs.length) return NextResponse.json({ success: true, data: { sesiones: [] } });

  // Agrupar por ventanas de 10 minutos
  const sesiones: { fecha: Date; cantidad: number; id: string }[] = [];
  let ventanaInicio = logs[0].fechaCambio;
  let ventanaFin = new Date(ventanaInicio.getTime() + 10 * 60 * 1000);
  let conteo = 0;

  for (const log of logs) {
    if (log.fechaCambio >= ventanaFin) {
      if (conteo > 0) {
        sesiones.push({ fecha: ventanaInicio, cantidad: conteo, id: ventanaInicio.toISOString() });
      }
      ventanaInicio = log.fechaCambio;
      ventanaFin = new Date(ventanaInicio.getTime() + 10 * 60 * 1000);
      conteo = 1;
    } else {
      conteo++;
    }
  }
  if (conteo > 0) {
    sesiones.push({ fecha: ventanaInicio, cantidad: conteo, id: ventanaInicio.toISOString() });
  }

  return NextResponse.json({
    success: true,
    data: { sesiones: sesiones.slice(0, 6) },
  });
}
