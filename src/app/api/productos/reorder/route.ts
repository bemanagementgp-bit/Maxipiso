import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security";

const TABLE_MAP: Record<string, string> = {
  pisos_flotantes: "pisoFlotante",
  porcellanatos: "porcellanato",
  revestimientos: "revestimiento",
  pisos_vinilicos: "pisoVinilico",
  pisos_madera: "pisoMadera",
  decks: "deck",
  maderas: "madera",
  accesorios: "accesorio",
};

export async function PUT(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  let body: { items: { id: string; sortOrder: number }[]; tabla: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { items, tabla } = body;
  if (!items?.length || !tabla) {
    return NextResponse.json({ error: "Faltan items o tabla" }, { status: 400 });
  }

  const normalizedTabla = tabla === "revestimientos_ext" || tabla === "revestimientos_int"
    ? "revestimientos"
    : tabla;
  const delegateKey = TABLE_MAP[normalizedTabla];
  if (!delegateKey) {
    return NextResponse.json({ error: "Tabla desconocida" }, { status: 400 });
  }

  try {
    const delegate = (prisma as any)[delegateKey];

    if (items.length === 1) {
      const [item] = items;
      const rows = await delegate.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      const currentIndex = rows.findIndex((row: any) => row.id === item.id);
      if (currentIndex < 0) {
        return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
      }

      const targetIndex = Math.max(0, Math.min(item.sortOrder, rows.length - 1));
      const reordered = [...rows];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      await Promise.all(
        reordered.map((row: any, index: number) =>
          delegate.update({
            where: { id: row.id },
            data: { sortOrder: index },
          })
        )
      );

      return NextResponse.json({ success: true });
    }

    await Promise.all(
      items.map((item) =>
        delegate.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reorder] error:", error);
    return NextResponse.json({ error: "Error al reordenar" }, { status: 500 });
  }
}
