import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const IdSchema = z.string().regex(/^c[a-z0-9]{20,30}$/i, "ID inválido");

const UpdateProductSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  nombre: z.string().trim().min(1).max(255).optional(),
  marca: z.string().trim().min(1).max(255).optional(),
  descripcion: z.string().trim().max(5000).optional(),
  precio: z.number().finite().positive().max(99_999_999).optional(),
  imagen: z.string().trim().max(500).optional(),
  categoria: z.string().trim().max(100).optional(),
  subcategoria: z.string().trim().max(100).optional(),
});

// GET: Obtener un producto por ID
export async function GET(
  _req: NextRequest,
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

    const producto = await prisma.product.findUnique({
      where: { id },
      include: {
        imagenes: true,
        changeLogs: {
          orderBy: { fechaCambio: "desc" },
          take: 10,
          include: { usuario: { select: { email: true, name: true } } },
        },
      },
    });

    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: producto });
  } catch (error) {
    console.error("[producto GET] error:", error);
    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 },
    );
  }
}

// PUT: Actualizar producto
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para actualizar productos" },
        { status: 403 },
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }
    const validatedData = UpdateProductSchema.parse(raw);

    const productoAnterior = await prisma.product.findUnique({ where: { id } });
    if (!productoAnterior) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const productoActualizado = await prisma.product.update({
      where: { id },
      data: validatedData,
    });

    const userId = session.user.id;
    for (const [key, value] of Object.entries(validatedData)) {
      const valorAnterior = (productoAnterior as unknown as Record<string, unknown>)[key];
      if (valorAnterior !== value) {
        await prisma.changeLog.create({
          data: {
            productId: id,
            usuarioId: userId,
            campo: key,
            valorAnterior: String(valorAnterior ?? ""),
            valorNuevo: String(value ?? ""),
            tipo: "UPDATE",
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: productoActualizado });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[producto PUT] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 },
    );
  }
}

// DELETE: Eliminar producto (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar productos" },
        { status: 403 },
      );
    }

    const productoAnterior = await prisma.product.findUnique({ where: { id } });
    if (!productoAnterior) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.changeLog.create({
      data: {
        productId: id,
        usuarioId: session.user.id,
        campo: "isActive",
        valorAnterior: "true",
        valorNuevo: "false",
        tipo: "DELETE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Producto eliminado correctamente",
    });
  } catch (error) {
    console.error("[producto DELETE] error:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 },
    );
  }
}
