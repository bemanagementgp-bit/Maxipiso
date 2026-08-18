import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

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
  if (!Array.isArray(items) || items.length === 0 || typeof tabla !== "string" || !tabla) {
    return NextResponse.json({ error: "Faltan items o tabla" }, { status: 400 });
  }
  if (items.length > 500) {
    return NextResponse.json({ error: "Demasiados items" }, { status: 400 });
  }
  const itemsValidos = items.every(
    (i) => i && typeof i.id === "string" && Number.isInteger(i.sortOrder) && i.sortOrder >= 0,
  );
  if (!itemsValidos) {
    return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
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

    // ── Mover un item a una posicion concreta ────────────────────────────────
    // Antes esto reescribia la tabla entera: un findMany() completo mas un
    // update por cada fila. Mover un producto en una tabla de 200 disparaba
    // 200 UPDATEs a Turso. Ahora solo se tocan las filas entre el origen y el
    // destino, y solo si el orden guardado ya esta normalizado.
    if (items.length === 1) {
      const [item] = items;
      const rows: { id: string; sortOrder: number }[] = await delegate.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, sortOrder: true },
      });

      const currentIndex = rows.findIndex((row) => row.id === item.id);
      if (currentIndex < 0) {
        return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
      }

      const targetIndex = Math.max(0, Math.min(item.sortOrder, rows.length - 1));

      // `sortOrder` puede no ser una permutacion 0..n-1 todavia (por ejemplo si
      // nunca se ordeno y estan todos en 0). En ese caso hay que normalizar una
      // vez; a partir de ahi los movimientos son incrementales.
      const yaNormalizado = rows.every((row, i) => row.sortOrder === i);

      if (currentIndex === targetIndex && yaNormalizado) {
        return NextResponse.json({ success: true });
      }

      const reordered = [...rows];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      const desde = yaNormalizado ? Math.min(currentIndex, targetIndex) : 0;
      const hasta = yaNormalizado ? Math.max(currentIndex, targetIndex) : reordered.length - 1;

      const updates = [];
      for (let i = desde; i <= hasta; i++) {
        const row = reordered[i];
        if (row.sortOrder === i) continue;
        updates.push(delegate.update({ where: { id: row.id }, data: { sortOrder: i } }));
      }

      if (updates.length > 0) await prisma.$transaction(updates);
      return NextResponse.json({ success: true, data: { updated: updates.length } });
    }

    // ── Reordenar un lote (drag & drop de una pagina) ────────────────────────
    // En transaccion: si falla a la mitad, el orden no queda corrupto.
    await prisma.$transaction(
      items.map((item) =>
        delegate.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
    return NextResponse.json({ success: true, data: { updated: items.length } });
  } catch (error) {
    console.error("[reorder] error:", error);
    return NextResponse.json({ error: "Error al reordenar" }, { status: 500 });
  }
}
