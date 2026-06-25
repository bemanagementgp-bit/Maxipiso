import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const KNOWN_FIELDS: Record<string, string> = {
  sku: "sku", codigo: "sku", "codigo/sku": "sku", cod: "sku", item: "sku",
  nombre: "nombre", producto: "nombre", "nombre de madera": "nombre",
  "nombre del producto": "nombre", "nombre producto": "nombre",
  marca: "marca", rubro: "marca", linea: "marca", "tipo de producto": "marca",
  precio: "precio", "precio unitario": "precio", valor: "precio", price: "precio",
  imagen: "imagen", image: "imagen", foto: "imagen", img: "imagen",
  descripcion: "descripcion", "descripcion del producto": "descripcion", observaciones: "descripcion",
  stock: "stock",
  "unidad de medida": "unidadMedida", unidad: "unidadMedida", um: "unidadMedida",
  moneda: "moneda", currency: "moneda",
  categoria: "categoria", "categoria prod": "categoria",
  subcategoria: "subcategoria",
};

const SPECS_FIELDS = new Set([
  "medidas", "espesores disponibles", "espesores", "secado", "origen",
  "ficha tecnica", "archivo instalacion", "instalacion",
  "ac/caracteristicas", "caracteristicas", "caja/base", "caja", "base",
  "texto extraido",
]);

function pickWorksheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const preferred = workbook.SheetNames.find((n) => norm(n) === "productos extraidos");
  if (preferred) return workbook.Sheets[preferred];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    if (keys.some((k) => ["sku", "codigo", "nombre", "producto", "precio"].includes(k))) return ws;
  }
  return workbook.Sheets[workbook.SheetNames[0]];
}

function parseRow(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  const specsData: Record<string, string> = {};
  const unmapped: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = norm(rawKey);
    const val = String(rawValue ?? "").trim();
    if (!val) continue;
    if (KNOWN_FIELDS[key]) {
      if (!mapped[KNOWN_FIELDS[key]]) mapped[KNOWN_FIELDS[key]] = val;
    } else if (SPECS_FIELDS.has(key)) {
      specsData[rawKey.trim()] = val;
    } else if (key) {
      unmapped[rawKey.trim()] = val;
    }
  }

  const allSpecs = { ...specsData, ...unmapped };
  const specsJson = Object.keys(allSpecs).length > 0 ? JSON.stringify(allSpecs) : undefined;

  const sku = String(mapped.sku ?? "").trim();
  const nombre = String(mapped.nombre ?? "").trim();
  const marca = String(mapped.marca ?? "").trim();
  const precioRaw = String(mapped.precio ?? "0").replace(/[^\d.,]/g, "").replace(",", ".");
  const precio = parseFloat(precioRaw);

  return {
    sku,
    nombre,
    marca,
    precio: isFinite(precio) ? precio : 0,
    imagen: String(mapped.imagen ?? "").trim() || undefined,
    descripcion: String(mapped.descripcion ?? "").trim() || undefined,
    stock: mapped.stock ? parseInt(String(mapped.stock)) || undefined : undefined,
    unidadMedida: String(mapped.unidadMedida ?? "").trim() || undefined,
    moneda: String(mapped.moneda ?? "").trim() || undefined,
    categoria: String(mapped.categoria ?? "").trim() || undefined,
    subcategoria: String(mapped.subcategoria ?? "").trim() || undefined,
    specs: specsJson,
  };
}

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, { key: "import", limit: 5, windowMs: 10 * 60 * 1000 });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "Archivo inválido o demasiado grande" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer", cellHTML: false, cellFormula: false, bookVBA: false });
  const worksheet = pickWorksheet(workbook);
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (data.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const userId = session.user.id;

  // Parsear y deduplicar en memoria
  const parsed = data.map(parseRow);
  const seenSkus = new Set<string>();
  const validRows: ReturnType<typeof parseRow>[] = [];

  for (const p of parsed) {
    if (!p.sku || !p.nombre || p.sku.length > 100 || p.nombre.length > 255 ||
      !isFinite(p.precio) || p.precio < 0 || p.precio > 99_999_999) {
      skippedCount++; continue;
    }
    if (seenSkus.has(p.sku)) { skippedCount++; continue; }
    seenSkus.add(p.sku);
    validRows.push(p);
  }

  // UNA query para saber qué SKUs ya existen
  const existingProducts = await prisma.product.findMany({
    where: { sku: { in: [...seenSkus] } },
  });
  const existingMap = new Map(existingProducts.map((p) => [p.sku, p]));

  // Separar creaciones y actualizaciones
  const toCreate = validRows.filter((p) => !existingMap.has(p.sku));
  const toUpdate = validRows.filter((p) => existingMap.has(p.sku));

  // Crear en lote con createMany (sin changelog individual — registramos una entrada por sesión)
  if (toCreate.length > 0) {
    await prisma.product.createMany({ data: toCreate, skipDuplicates: true });
    // Recuperar los IDs creados para el changelog
    const created = await prisma.product.findMany({
      where: { sku: { in: toCreate.map((p) => p.sku) } },
      select: { id: true, sku: true },
    });
    const skuToId = new Map(created.map((p) => [p.sku, p.id]));
    await prisma.changeLog.createMany({
      data: toCreate.map((p) => ({
        productId: skuToId.get(p.sku)!,
        usuarioId: userId,
        campo: "PRODUCTO",
        valorAnterior: null,
        valorNuevo: p.nombre,
        tipo: "CREATE" as const,
      })).filter((e) => e.productId),
    });
    createdCount = toCreate.length;
  }

  // Actualizar uno a uno (necesario para changelog de campos)
  for (const p of toUpdate) {
    const existing = existingMap.get(p.sku)!;
    try {
      await prisma.product.update({ where: { sku: p.sku }, data: p });
      // Solo registrar si hubo cambios reales
      const changedFields = Object.entries(p).filter(([key, value]) => {
        if (key === "specs") return false; // skip specs diff
        return (existing as any)[key] !== value && value !== undefined;
      });
      if (changedFields.length > 0) {
        await prisma.changeLog.createMany({
          data: changedFields.map(([campo, valorNuevo]) => ({
            productId: existing.id,
            usuarioId: userId,
            campo,
            valorAnterior: String((existing as any)[campo] ?? ""),
            valorNuevo: String(valorNuevo),
            tipo: "UPDATE" as const,
          })),
        });
      }
      updatedCount++;
    } catch {
      skippedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Importación completada: ${createdCount} creados, ${updatedCount} actualizados, ${skippedCount} omitidos`,
    data: { createdCount, updatedCount, skippedCount },
  });
}
