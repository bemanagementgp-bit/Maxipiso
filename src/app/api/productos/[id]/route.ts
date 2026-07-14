// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DB_NAMES, findProductById, TABLE_KEYS } from "@/lib/all-products";
import { getCategoryConfig } from "@/lib/category-fields";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const SYSTEM_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "_tabla",
  "_tablaLabel",
]);

const JSON_STRING_FIELDS = new Set(["metadatos", "imagenes"]);

function sanitizeProductData(tablaNombre: string, raw: Record<string, unknown>) {
  const config = getCategoryConfig(tablaNombre);
  if (!config) {
    throw new Error(`Tabla desconocida: ${tablaNombre}`);
  }

  const numberFields = new Set(
    config.fields.filter((field) => field.type === "number").map((field) => field.key),
  );
  const allowedFields = new Set(config.fields.map((field) => field.key));
  allowedFields.add("metadatos");
  allowedFields.add("imagenes");

  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (SYSTEM_FIELDS.has(key) || !allowedFields.has(key)) continue;
    if (value === undefined) continue;

    if (numberFields.has(key)) {
      if (value === null || value === "") {
        data[key] = null;
        continue;
      }

      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) continue;
      data[key] = parsed;
      continue;
    }

    if (key === "isActive") {
      data[key] = value === true || value === "true";
      continue;
    }

    if (JSON_STRING_FIELDS.has(key)) {
      if (typeof value === "string" && value.trim()) {
        data[key] = value;
      } else if (value === null) {
        data[key] = null;
      }
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      data[key] = trimmed === "" ? null : trimmed;
      continue;
    }

    if (value === null) {
      data[key] = null;
    }
  }

  const requiredFields = config.fields.filter((field) => field.required).map((field) => field.key);

  return { config, data, requiredFields };
}

function missingRequiredFields(requiredFields: string[], data: Record<string, unknown>) {
  return requiredFields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });
}

// GET
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const found = await findProductById(id);
    if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data: { ...found.raw, _tabla: found.tablaNombre } });
  } catch (error) {
    console.error("[producto GET] error:", error);
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

// PUT
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    let raw: Record<string, unknown>;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: "Cuerpo invalido" }, { status: 400 }); }

    const found = await findProductById(id);
    if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const delegate = (prisma as any)[found.tableKey];
    const { config, data, requiredFields } = sanitizeProductData(found.tablaNombre, raw);

    const merged = { ...(found.raw as Record<string, unknown>), ...data };
    const missing = missingRequiredFields(requiredFields, merged);
    if (missing.length > 0) {
      const labels = config.fields
        .filter((field) => missing.includes(field.key))
        .map((field) => field.label);
      return NextResponse.json({ error: `Faltan campos requeridos: ${labels.join(", ")}` }, { status: 400 });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin cambios válidos para aplicar" }, { status: 400 });
    }

    const updated = await delegate.update({ where: { id }, data });

    // Changelogs por campo
    for (const [key, value] of Object.entries(data)) {
      const prev = (found.raw as any)[key];
      if (prev !== value) {
        await prisma.changeLog.create({
          data: {
            tablaNombre: found.tablaNombre,
            entidadId: id,
            usuarioId: session.user.id,
            campo: key,
            valorAnterior: String(prev ?? ""),
            valorNuevo: String(value ?? ""),
            tipo: "UPDATE",
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[producto PUT] error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

// DELETE (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const found = await findProductById(id);
    if (!found) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const delegate = (prisma as any)[found.tableKey];
    await delegate.update({ where: { id }, data: { isActive: false } });

    await prisma.changeLog.create({
      data: {
        tablaNombre: found.tablaNombre,
        entidadId: id,
        usuarioId: session.user.id,
        campo: "isActive",
        valorAnterior: "true",
        valorNuevo: "false",
        tipo: "DELETE",
      },
    });

    return NextResponse.json({ success: true, message: "Producto eliminado" });
  } catch (error) {
    console.error("[producto DELETE] error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
