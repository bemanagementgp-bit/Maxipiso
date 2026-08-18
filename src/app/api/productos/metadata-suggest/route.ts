import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDelegate, tableKeyFromDbName } from "@/lib/all-products";
import { verifyOrigin } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "metadata-suggest",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  let tabla: unknown;
  try {
    ({ tabla } = await req.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof tabla !== "string" || !tabla) {
    return NextResponse.json({ error: "Tabla requerida" }, { status: 400 });
  }

  const prismaKey = tableKeyFromDbName(tabla);
  if (!prismaKey) return NextResponse.json({ error: "Tabla desconocida" }, { status: 400 });

  try {
    const delegate = getDelegate(prismaKey);
    const rows = await delegate.findMany({
      where: { NOT: { metadatos: null } },
      select: { metadatos: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const keyCount: Record<string, number> = {};
    for (const row of rows) {
      if (typeof row.metadatos !== "string") continue;
      try {
        const metas = JSON.parse(row.metadatos) as { clave?: string }[];
        if (!Array.isArray(metas)) continue;
        for (const m of metas) {
          const k = m?.clave?.trim();
          if (k) keyCount[k] = (keyCount[k] || 0) + 1;
        }
      } catch { /* skip malformed */ }
    }

    const topKeys = Object.entries(keyCount)
      .sort((a, b) => b[1] - a[1])
      .map(([clave, count]) => ({ clave, count }));

    return NextResponse.json({ success: true, data: topKeys });
  } catch (err: unknown) {
    console.error("[metadata-suggest]", err);
    return NextResponse.json({ error: "Error al obtener sugerencias" }, { status: 500 });
  }
}
