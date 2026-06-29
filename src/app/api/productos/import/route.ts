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
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Columnas que mapean a campos de primer nivel del producto.
// Para precio: "precio x m2" y "precio por m2" son las columnas canónicas.
// "precio" cubre MADERAS y Accesorios (precio directo por unidad).
// "precio x caja", "precio por tabla", "precio por ml" NO se mapean aquí → van a specs.
const FIELD_MAP: Record<string, string> = {
  // SKU — solo la columna SKU exacta
  sku: "sku",
  // Nombre — múltiples variantes según hoja
  // "especie" cubre la hoja PISOS DE MADERA E INGENIERIA que no tiene columna Nombre
  nombre: "nombre",
  "nombre de madera": "nombre",
  "nombre del producto": "nombre",
  especie: "nombre",
  // Marca
  marca: "marca",
  // Precio canónico: precio por m2 tiene prioridad; "precio" para maderas/accesorios
  "precio x m2": "precio",
  "precio por m2": "precio",
  precio: "precio",
  // Imagen
  imagen: "imagen",
  imagenes: "imagen",
  // Descripción
  descripcion: "descripcion",
  // Stock
  stock: "stock",
  // Unidad de medida: solo la columna explícita (MADERAS="p2", Accesorios="Unidad")
  // NO mapear u.m / u.m. — en pisos son unidades de espesor/dimensión, no de precio
  "unidad de medida": "unidadMedida",
  // Moneda — solo el primer match; Moneda_1, MOneda_1, etc. van a specs
  moneda: "moneda",
  // Categorías jerárquicas
  "categoria principal": "categoria",
  categoria: "categoria",
  "categoria secundaria": "subcategoria",
  subcategoria: "subcategoria",
};

// Columnas que se descartan completamente (ruido o duplicados)
const SKIP_COLS = new Set([
  "__empty",          // columna vacía Accesorios
  "moneda_1",         // segunda moneda REVESTIMIENTOS/DECK
  "moneda_2",         // tercera moneda
  "moneda1",
  "moneda2",
  "moneda_1",
]);

function pickWorksheets(workbook: XLSX.WorkBook): XLSX.WorkSheet[] {
  const valid: XLSX.WorkSheet[] = [];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    const hasSku = keys.some((k) => k === "sku");
    const hasName = keys.some((k) => ["nombre", "nombre de madera", "especie"].includes(k));
    if (hasSku && hasName) valid.push(ws);
  }
  return valid.length > 0 ? valid : [workbook.Sheets[workbook.SheetNames[0]]];
}

function parseRow(row: Record<string, unknown>) {
  const mapped: Record<string, string> = {};
  const specs: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = norm(rawKey);
    const val = String(rawValue ?? "").trim();

    // Siempre ignorar columnas de ruido o vacías
    if (SKIP_COLS.has(key) || !key || !val) continue;

    if (FIELD_MAP[key]) {
      // First-match-wins: el primer valor no vacío para cada campo gana
      if (!mapped[FIELD_MAP[key]]) mapped[FIELD_MAP[key]] = val;
    } else {
      // Todo lo demás va a specs preservando nombre original de columna
      specs[rawKey.trim()] = val;
    }
  }

  const skuRaw = mapped.sku ?? "";
  const sku = String(skuRaw).replace(/\.0$/, "").trim(); // quitar .0 de números enteros
  const nombre = (mapped.nombre ?? "").trim();
  const marca = (mapped.marca ?? "").trim();
  const precioRaw = (mapped.precio ?? "0").replace(/[^\d.,]/g, "").replace(",", ".");
  const precio = parseFloat(precioRaw);

  return {
    sku,
    nombre,
    marca: marca || "",
    precio: isFinite(precio) && precio >= 0 ? precio : 0,
    imagen: mapped.imagen?.trim() || undefined,
    descripcion: mapped.descripcion?.trim() || undefined,
    stock: mapped.stock ? Math.round(parseFloat(mapped.stock)) || undefined : undefined,
    unidadMedida: mapped.unidadMedida?.trim() || undefined,
    moneda: mapped.moneda?.trim() || undefined,
    categoria: mapped.categoria?.trim() || undefined,
    subcategoria: mapped.subcategoria?.trim() || undefined,
    specs: Object.keys(specs).length > 0 ? JSON.stringify(specs) : undefined,
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
  const worksheets = pickWorksheets(workbook);

  const data: Record<string, unknown>[] = [];
  for (const ws of worksheets) {
    data.push(...XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" }));
  }

  if (data.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const userId = session.user.id;

  const parsed = data.map(parseRow);
  const seenSkus = new Set<string>();
  const validRows: ReturnType<typeof parseRow>[] = [];

  for (const p of parsed) {
    if (!p.sku || !p.nombre || p.sku.length > 100 || p.nombre.length > 255 ||
      p.precio < 0 || p.precio > 99_999_999) {
      skippedCount++; continue;
    }
    if (seenSkus.has(p.sku)) { skippedCount++; continue; }
    seenSkus.add(p.sku);
    validRows.push(p);
  }

  const existingProducts = await prisma.product.findMany({
    where: { sku: { in: [...seenSkus] } },
  });
  const existingMap = new Map(existingProducts.map((p) => [p.sku, p]));

  const toCreate = validRows.filter((p) => !existingMap.has(p.sku));
  const toUpdate = validRows.filter((p) => existingMap.has(p.sku));

  if (toCreate.length > 0) {
    await prisma.product.createMany({ data: toCreate });
    const created = await prisma.product.findMany({
      where: { sku: { in: toCreate.map((p) => p.sku) } },
      select: { id: true, sku: true },
    });
    const skuToId = new Map(created.map((p) => [p.sku, p.id]));
    await prisma.changeLog.createMany({
      data: toCreate
        .map((p) => ({
          productId: skuToId.get(p.sku)!,
          usuarioId: userId,
          campo: "PRODUCTO",
          valorAnterior: null,
          valorNuevo: p.nombre,
          tipo: "CREATE" as const,
        }))
        .filter((e) => e.productId),
    });
    createdCount = toCreate.length;
  }

  for (const p of toUpdate) {
    const existing = existingMap.get(p.sku)!;
    try {
      await prisma.product.update({ where: { sku: p.sku }, data: p });
      const changedFields = Object.entries(p).filter(([key, value]) => {
        if (key === "specs") return false;
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
