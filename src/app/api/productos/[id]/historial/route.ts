import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIntSafe } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";

const IdSchema = z.string().regex(/^c[a-z0-9]{20,30}$/i);

// GET: Obtener historial de cambios de un producto
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const idCheck = IdSchema.safeParse(rawId);
    if (!idCheck.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const id = idCheck.data;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const skip = parseIntSafe(searchParams.get("skip"), 0, 0, 1_000_000);
    const take = parseIntSafe(searchParams.get("take"), 20, 1, 100);

    const producto = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const [historial, total] = await Promise.all([
      prisma.changeLog.findMany({
        where: { productId: id },
        include: {
          usuario: { select: { id: true, email: true, name: true } },
        },
        orderBy: { fechaCambio: "desc" },
        skip,
        take,
      }),
      prisma.changeLog.count({ where: { productId: id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        historial,
        total,
        page: Math.floor(skip / take) + 1,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("[historial GET] error:", error);
    return NextResponse.json(
      { error: "Error al obtener historial" },
      { status: 500 },
    );
  }
}
