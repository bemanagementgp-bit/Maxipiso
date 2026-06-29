import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  await prisma.changeLog.create({
    data: {
      productId: id,
      usuarioId: session.user.id,
      campo: "isActive",
      valorAnterior: String(product.isActive),
      valorNuevo: String(updated.isActive),
      tipo: "UPDATE",
    },
  });

  return NextResponse.json({ success: true, data: { isActive: updated.isActive } });
}
