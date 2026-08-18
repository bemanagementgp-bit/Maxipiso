import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Agrupa eventos CREATE del changelog en "sesiones" (ventana de 5 minutos)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const logs = await prisma.changeLog.findMany({
    where: { tipo: "CREATE", campo: "PRODUCTO" },
    orderBy: { fechaCambio: "desc" },
    take: 200,
    select: { fechaCambio: true, entidadId: true },
  });

  if (!logs.length) return NextResponse.json({ success: true, data: { sesiones: [] } });

  // Agrupar por ventanas de 10 minutos.
  //
  // Los logs vienen en orden DESCENDENTE (mas nuevo primero), asi que la ventana
  // avanza hacia atras en el tiempo: se corta cuando un log es mas viejo que
  // (inicio - 10 min). La version anterior comparaba `>= inicio + 10min`, que
  // con orden descendente nunca se cumple, y colapsaba todo en una sola sesion.
  const VENTANA_MS = 10 * 60 * 1000;
  const sesiones: { fecha: Date; cantidad: number; id: string }[] = [];

  let ventanaMasReciente = logs[0].fechaCambio;
  let ventanaCorte = new Date(ventanaMasReciente.getTime() - VENTANA_MS);
  let conteo = 0;

  const cerrarVentana = () => {
    if (conteo > 0) {
      sesiones.push({
        fecha: ventanaMasReciente,
        cantidad: conteo,
        id: ventanaMasReciente.toISOString(),
      });
    }
  };

  for (const log of logs) {
    if (log.fechaCambio < ventanaCorte) {
      cerrarVentana();
      ventanaMasReciente = log.fechaCambio;
      ventanaCorte = new Date(ventanaMasReciente.getTime() - VENTANA_MS);
      conteo = 1;
    } else {
      conteo++;
    }
  }
  cerrarVentana();

  return NextResponse.json({
    success: true,
    data: { sesiones: sesiones.slice(0, 6) },
  });
}

