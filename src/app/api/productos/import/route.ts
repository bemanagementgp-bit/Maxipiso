import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";
import { norm, detectSchema, parseRowWithSchema } from "@/lib/sheet-schemas";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

function pickWorksheets(workbook: XLSX.WorkBook): { ws: XLSX.WorkSheet; sheetName: string }[] {
  const valid: { ws: XLSX.WorkSheet; sheetName: string }[] = [];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    if (keys.some((k) => k === "sku")) valid.push({ ws, sheetName: name });
  }
  if (valid.length > 0) return valid;
  const name = workbook.SheetNames[0];
  return name ? [{ ws: workbook.Sheets[name], sheetName: name }] : [];
}

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, { key: "import", limit: 5, windowMs: 10 * 60 * 1000 });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "Archivo inválido o demasiado grande" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer", cellHTML: false, cellFormula: false, bookVBA: false });

  const sheets = pickWorksheets(workbook);
  if (!sheets.length)
    return NextResponse.json({ error: "No se encontraron hojas válidas en el archivo" }, { status: 400 });

  const allRows: ReturnType<typeof parseRowWithSchema>[] = [];
  for (const { ws, sheetName } of sheets) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rawRows.length) continue;
    const headers = Object.keys(rawRows[0]);
    const { schema } = detectSchema(headers);
    console.log(`[import] Hoja "${sheetName}" → schema: ${schema.id} (${schema.label})`);
    for (const row of rawRows) {
      allRows.push(parseRowWithSchema(row, schema));
    }
  }

  if (allRows.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const userId = session.user.id;

  const seenSkus = new Set<string>();
  const validRows: typeof allRows = [];
  for (const p of allRows) {
    if (!p.sku || !p.nombre || p.sku.length > 100 || p.nombre.length > 255 || p.precio < 0 || p.precio > 99_999_999) {
      skippedCount++; continue;
    }
    if (seenSkus.has(p.sku)) { skippedCount++; continue; }
    seenSkus.add(p.sku);
    validRows.push(p);
  }

  const existingProducts = await prisma.product.findMany({ where: { sku: { in: [...seenSkus] } } });
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
        .map((p) => ({ productId: skuToId.get(p.sku)!, usuarioId: userId, campo: "PRODUCTO", valorAnterior: null, valorNuevo: p.nombre, tipo: "CREATE" as const }))
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
            productId: existing.id, usuarioId: userId, campo,
            valorAnterior: String((existing as any)[campo] ?? ""),
            valorNuevo: String(valorNuevo), tipo: "UPDATE" as const,
          })),
        });
      }
      updatedCount++;
    } catch { skippedCount++; }
  }

  return NextResponse.json({
    success: true,
    message: `Importación completada: ${createdCount} creados, ${updatedCount} actualizados, ${skippedCount} omitidos`,
    data: { createdCount, updatedCount, skippedCount },
  });
}
