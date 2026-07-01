import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { verifyOrigin } from "@/lib/security";
import { norm, isSkipCol, detectSchema, parseRowWithSchema, SHEET_SCHEMAS } from "@/lib/sheet-schemas";

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

  // Procesar cada hoja por separado con su schema detectado
  type SheetResult = {
    sheetName: string;
    schemaId: string;
    schemaLabel: string;
    score: number;
    detectedColumns: { original: string; mapsTo: string }[];
    rowCount: number;
    toCreate: number;
    toUpdate: number;
    skip: number;
  };

  const sheetResults: SheetResult[] = [];
  const allParsed: ReturnType<typeof parseRowWithSchema>[] = [];
  const globalSeenSkus = new Set<string>();

  for (const { ws, sheetName } of sheets) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rawRows.length) continue;

    const headers = Object.keys(rawRows[0]);
    const { schema, score } = detectSchema(headers);

    // Columnas detectadas para esta hoja
    const detectedColumns = headers.map((h) => {
      const n = norm(h);
      if (isSkipCol(n)) return { original: h, mapsTo: "ignorado" };
      return { original: h, mapsTo: schema.fieldMap[n] ?? "specs" };
    });

    const parsed = rawRows.map((row) => parseRowWithSchema(row, schema));

    let sheetCreate = 0, sheetUpdate = 0, sheetSkip = 0;
    const sheetSkus = new Set<string>();

    for (const p of parsed) {
      if (!p.sku || !p.nombre || p.sku.length > 100 || p.nombre.length > 255 || p.precio < 0 || p.precio > 99_999_999) {
        sheetSkip++; continue;
      }
      if (sheetSkus.has(p.sku) || globalSeenSkus.has(p.sku)) { sheetSkip++; continue; }
      sheetSkus.add(p.sku);
      globalSeenSkus.add(p.sku);
      allParsed.push(p);
    }

    // Verificar existentes en DB para esta hoja
    const existingInDb = await prisma.product.findMany({
      where: { sku: { in: [...sheetSkus] } },
      select: { sku: true },
    });
    const existingSkus = new Set(existingInDb.map((p) => p.sku));

    for (const p of parsed) {
      if (!p.sku || !p.nombre || sheetSkus.has(p.sku) === false) continue;
      if (existingSkus.has(p.sku)) sheetUpdate++;
      else sheetCreate++;
    }

    // Corregir skip count
    sheetSkip = rawRows.length - sheetCreate - sheetUpdate;

    sheetResults.push({
      sheetName,
      schemaId: schema.id,
      schemaLabel: schema.label,
      score,
      detectedColumns,
      rowCount: rawRows.length,
      toCreate: sheetCreate,
      toUpdate: sheetUpdate,
      skip: Math.max(0, sheetSkip),
    });
  }

  if (allParsed.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  const totals = sheetResults.reduce(
    (acc, s) => ({ create: acc.create + s.toCreate, update: acc.update + s.toUpdate, skip: acc.skip + s.skip }),
    { create: 0, update: 0, skip: 0 },
  );

  return NextResponse.json({
    success: true,
    data: {
      sheetResults,
      totals,
      totalRows: allParsed.length,
    },
  });
}
