import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;

function normalizeHeader(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pickWorksheet(workbook: XLSX.WorkBook) {
  const preferredSheet = workbook.SheetNames.find(
    (name) => normalizeHeader(name) === "productos extraidos"
  );

  if (preferredSheet) {
    return workbook.Sheets[preferredSheet];
  }

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    if (rows.length === 0) {
      continue;
    }

    const firstRowKeys = Object.keys(rows[0]).map(normalizeHeader);
    const hasProductHeaders =
      firstRowKeys.includes("codigo/sku") ||
      firstRowKeys.includes("sku") ||
      firstRowKeys.includes("producto") ||
      firstRowKeys.includes("nombre");

    if (hasProductHeaders) {
      return worksheet;
    }
  }

  return workbook.Sheets[workbook.SheetNames[0]];
}

function getField(row: Record<string, unknown>, aliases: string[]) {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

function buildDescription(row: Record<string, unknown>) {
  const parts = [
    getField(row, ["medidas"]),
    getField(row, ["ac/caracteristicas", "ac", "caracteristicas"]),
    getField(row, ["caja/base", "caja", "base"]),
    getField(row, ["observaciones"]),
    getField(row, ["texto extraido"]),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function parseProductRow(row: Record<string, unknown>) {
  const sku = String(
    getField(row, ["codigo/sku", "sku", "codigo", "codigo sku"]) || ""
  ).trim();

  const nombre = String(
    getField(row, ["producto", "nombre", "nombre producto"]) || ""
  ).trim();

  const marca = String(
    getField(row, ["marca", "categoria", "rubro", "linea"]) || ""
  ).trim();

  const precioRaw = getField(row, ["precio", "precio unitario", "valor"]);
  const precio = Number.parseFloat(String(precioRaw || "0").replace(",", "."));

  const imagen = String(getField(row, ["imagen", "image", "foto"]) || "").trim();

  return {
    sku,
    nombre,
    marca,
    descripcion: buildDescription(row),
    precio: Number.isFinite(precio) ? precio : 0,
    imagen: imagen || undefined,
  };
}

// POST: Importar productos desde Excel
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "import",
    limit: 3,
    windowMs: 10 * 60 * 1000,
  });
  if (rateErr) return rateErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para importar productos" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo no provisto" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo excede el límite (${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    // Opciones seguras: no permitir macros, no parsear estilos
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellHTML: false,
      cellFormula: false,
      bookVBA: false,
    });
    const worksheet = pickWorksheet(workbook);
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    if (data.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Demasiadas filas (máximo ${MAX_ROWS})` },
        { status: 400 },
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const userId = session.user.id;

    for (const row of data) {
      try {
        const product = parseProductRow(row);

        // Validate required fields y bounds básicos
        if (
          !product.sku ||
          !product.nombre ||
          !product.marca ||
          product.sku.length > 100 ||
          product.nombre.length > 255 ||
          product.marca.length > 255 ||
          !Number.isFinite(product.precio) ||
          product.precio < 0 ||
          product.precio > 99_999_999
        ) {
          skippedCount++;
          continue;
        }

        const existingProduct = await prisma.product.findUnique({
          where: { sku: product.sku },
        });

        if (existingProduct) {
          const updatedProduct = await prisma.product.update({
            where: { sku: product.sku },
            data: product,
          });

          for (const [key, value] of Object.entries(product)) {
            const valorAnterior = (existingProduct as unknown as Record<string, unknown>)[key];
            if (valorAnterior !== value && key !== "id") {
              await prisma.changeLog.create({
                data: {
                  productId: existingProduct.id,
                  usuarioId: userId,
                  campo: key,
                  valorAnterior: String(valorAnterior ?? ""),
                  valorNuevo: String(value ?? ""),
                  tipo: "UPDATE",
                },
              });
            }
          }

          updatedCount++;
          void updatedProduct;
        } else {
          const newProduct = await prisma.product.create({ data: product });

          await prisma.changeLog.create({
            data: {
              productId: newProduct.id,
              usuarioId: userId,
              campo: "PRODUCTO",
              valorAnterior: null,
              valorNuevo: JSON.stringify(newProduct),
              tipo: "CREATE",
            },
          });

          createdCount++;
        }
      } catch {
        // No exponer mensajes internos al cliente
        errors.push("Error procesando una fila");
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importación completada. ${createdCount} creados, ${updatedCount} actualizados, ${skippedCount} omitidos`,
      data: {
        createdCount,
        updatedCount,
        skippedCount,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      },
    });
  } catch (error) {
    console.error("[import] error:", error);
    return NextResponse.json(
      { error: "Error al importar Excel" },
      { status: 500 },
    );
  }
}
