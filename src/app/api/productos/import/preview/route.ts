// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { verifyOrigin } from "@/lib/security";
import { norm, isSkipCol, detectSchema, parseRowWithSchema, SHEET_SCHEMAS } from "@/lib/sheet-schemas";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

const TABLE_TO_KEY: Record<string, string> = {
  pisos_flotantes: "pisoFlotante",
  porcellanatos:   "porcellanato",
  revestimientos:  "revestimiento",
  pisos_vinilicos: "pisoVinilico",
  pisos_madera:    "pisoMadera",
  decks:           "deck",
  maderas:         "madera",
  accesorios:      "accesorio",
};

function pickWorksheets(workbook: XLSX.WorkBook): { ws: XLSX.WorkSheet; sheetName: string }[] {
  const valid: { ws: XLSX.WorkSheet; sheetName: string }[] = [];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
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
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "Archivo invalido o demasiado grande" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer", cellHTML: false, cellFormula: false, bookVBA: false });
  const sheets = pickWorksheets(workbook);
  if (!sheets.length)
    return NextResponse.json({ error: "No se encontraron hojas validas en el archivo" }, { status: 400 });

  type SheetResult = {
    sheetName: string;
    schemaId: string;
    schemaLabel: string;
    tabla: string;
    score: number;
    detectedColumns: { original: string; mapsTo: string }[];
    rowCount: number;
    toCreate: number;
    toUpdate: number;
    skip: number;
  };

  const sheetResults: SheetResult[] = [];
  const globalSeenSkus = new Set<string>();

  for (const { ws, sheetName } of sheets) {
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!rawRows.length) continue;

    const headers = Object.keys(rawRows[0]);
    const { schema, score } = detectSchema(headers);

    const detectedColumns = headers.map((h) => {
      const n = norm(h);
      if (isSkipCol(n)) return { original: h, mapsTo: "ignorado" };
      return { original: h, mapsTo: schema.fieldMap[n] ?? "ignorado" };
    });

    const parsed = rawRows.map((row) => parseRowWithSchema(row, schema));

    const sheetSkus = new Set<string>();
    let sheetSkip = 0;

    for (const p of parsed) {
      const sku = String(p.sku ?? "").trim();
      if (!sku || sku.length > 100) { sheetSkip++; continue; }
      if (sheetSkus.has(sku) || globalSeenSkus.has(sku)) { sheetSkip++; continue; }
      sheetSkus.add(sku);
      globalSeenSkus.add(sku);
    }

    // Verificar existentes en la tabla correspondiente
    const prismaKey = TABLE_TO_KEY[schema.tabla];
    let existingSkus = new Set<string>();
    if (prismaKey) {
      const delegate = (prisma as any)[prismaKey];
      const existing = await delegate.findMany({
        where: { sku: { in: [...sheetSkus] } },
        select: { sku: true },
      });
      existingSkus = new Set(existing.map((e: any) => e.sku));
    }

    let sheetCreate = 0;
    let sheetUpdate = 0;
    for (const sku of sheetSkus) {
      if (existingSkus.has(sku)) sheetUpdate++;
      else sheetCreate++;
    }

    sheetResults.push({
      sheetName,
      schemaId: schema.id,
      schemaLabel: schema.label,
      tabla: schema.tabla,
      score,
      detectedColumns,
      rowCount: rawRows.length,
      toCreate: sheetCreate,
      toUpdate: sheetUpdate,
      skip: sheetSkip,
    });
  }

  const allParsedCount = sheetResults.reduce((a, s) => a + s.toCreate + s.toUpdate, 0);
  if (allParsedCount > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (max ${MAX_ROWS})` }, { status: 400 });

  const totals = sheetResults.reduce(
    (acc, s) => ({ create: acc.create + s.toCreate, update: acc.update + s.toUpdate, skip: acc.skip + s.skip }),
    { create: 0, update: 0, skip: 0 },
  );

  return NextResponse.json({
    success: true,
    data: { sheetResults, totals },
  });
}
