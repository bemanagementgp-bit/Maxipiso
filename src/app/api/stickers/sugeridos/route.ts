import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { verifyOrigin } from "@/lib/security";
import { STICKERS_SUGERIDOS } from "@/lib/stickers-sugeridos";

export const runtime = "nodejs";

/**
 * Carga los diez stickers iniciales desde el panel.
 *
 * Es un `createMany` con `skipDuplicates`: los ids son fijos, asi que apretar
 * el boton dos veces no duplica nada y no pisa lo que alguien haya editado a
 * mano. Nunca borra ni modifica: solo agrega los que faltan.
 */
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const existentes = await prisma.sticker.findMany({
      where: { id: { in: STICKERS_SUGERIDOS.map((s) => s.id) } },
      select: { id: true },
    });
    const yaEstan = new Set(existentes.map((e) => e.id));
    const faltan = STICKERS_SUGERIDOS.filter((s) => !yaEstan.has(s.id));

    if (faltan.length > 0) {
      // Uno por uno y no createMany: son diez filas, y asi un fallo puntual no
      // deja la carga a medias sin decir cual fue.
      for (const s of faltan) {
        await prisma.sticker.create({ data: { ...s, isActive: true } });
      }
      clearCatalogCache();
    }

    return NextResponse.json({
      success: true,
      data: { creados: faltan.length, yaEstaban: yaEstan.size },
    });
  } catch (error) {
    console.error("[stickers/sugeridos] error:", error);
    return NextResponse.json({ error: "No se pudieron cargar los stickers" }, { status: 500 });
  }
}
