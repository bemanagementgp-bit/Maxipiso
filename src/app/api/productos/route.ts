import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseIntSafe, sanitizeText, verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

// Validación de producto
const CreateProductSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  nombre: z.string().trim().min(1).max(255),
  marca: z.string().trim().min(1).max(255),
  descripcion: z.string().trim().max(5000).optional(),
  precio: z.number().finite().positive().max(99_999_999),
  imagen: z.string().trim().max(500).optional(),
  categoria: z.string().trim().max(100).optional(),
  subcategoria: z.string().trim().max(100).optional(),
});

// GET: Listar productos con filtros y paginación
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = sanitizeText(searchParams.get("search") ?? "", 100);
    const marca = sanitizeText(searchParams.get("marca") ?? "", 100);
    const categoria = sanitizeText(searchParams.get("categoria") ?? "", 100);
    const subcategoria = sanitizeText(searchParams.get("subcategoria") ?? "", 100);
    const estado = searchParams.get("estado") ?? "activo"; // activo | inactivo | todos
    const skip = parseIntSafe(searchParams.get("skip"), 0, 0, 1_000_000);
    const take = parseIntSafe(searchParams.get("take"), 10, 1, 100);

    const where: {
      isActive?: boolean;
      OR?: Array<Record<string, { contains: string; mode: "insensitive" }>>;
      marca?: { contains: string; mode: "insensitive" };
      categoria?: { equals: string };
      subcategoria?: { equals: string };
    } = {};

    if (estado === "activo") where.isActive = true;
    else if (estado === "inactivo") where.isActive = false;

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { marca: { contains: search, mode: "insensitive" } },
      ];
    }

    if (marca) {
      where.marca = { contains: marca, mode: "insensitive" };
    }

    if (categoria) {
      where.categoria = { equals: categoria };
    }

    if (subcategoria) {
      where.subcategoria = { equals: subcategoria };
    }

    const [productos, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        productos,
        total,
        page: Math.floor(skip / take) + 1,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("[productos GET] error:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 },
    );
  }
}

// POST: Crear nuevo producto
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para crear productos" },
        { status: 403 },
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const validatedData = CreateProductSchema.parse(raw);

    const existingSku = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });
    if (existingSku) {
      return NextResponse.json({ error: "Este SKU ya existe" }, { status: 409 });
    }

    const producto = await prisma.product.create({ data: validatedData });

    await prisma.changeLog.create({
      data: {
        productId: producto.id,
        usuarioId: session.user.id,
        campo: "PRODUCTO",
        valorAnterior: null,
        valorNuevo: JSON.stringify(producto),
        tipo: "CREATE",
      },
    });

    return NextResponse.json(
      { success: true, data: producto },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 },
      );
    }
    console.error("[productos POST] error:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
