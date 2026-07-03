// @ts-nocheck
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
const MAX_ROWS = 2000;

// Mapa tabla DB → clave Prisma
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

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(",", "."));
  return isFinite(n) ? n : undefined;
}

function cleanRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "tabla") continue;
    // Campos numéricos conocidos
    if (["precioM2","precioCaja","precioTabla","precioMl","precioMLineal","precioEnvioCaja","precio","flete","pesoCaja","pesoPallet"].includes(k)) {
      const n = toNumber(v);
      if (n !== undefined) out[k] = n;
    } else if (["tablasPorCaja","cajasPallet","stock"].includes(k)) {
      const n = toNumber(v);
      if (n !== undefined) out[k] = Math.round(n);
    } else {
      const s = String(v ?? "").trim();
      if (s !== "") out[k] = s;
    }
  }
  return out;
}

function pickWorksheets(workbook: XLSX.WorkBook): { ws: XLSX.WorkSheet; sheetName: string }[] {
  const valid: { ws: XLSX.WorkSheet; sheetName: string }[] = [];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    if (keys.some((k) => k === "sku")) valid.push({ ws, sheetName: name });
  }
  if (valid.length) return valid;
  const name = workbook.SheetNames[0];
  return name ? [{ ws: workbook.Sheets[name], sheetName: name }] : [];
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
    return NextResponse.json({ error: "Archivo invalido o demasiado grande" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer", cellHTML: false, cellFormula: false, bookVBA: false });
  const sheets = pickWorksheets(workbook);
  if (!sheets.length) return NextResponse.json({ error: "No se encontraron hojas validas" }, { status: 400 });

  // Parsear todas las hojas
  const allRows: (ReturnType<typeof parseRowWithSchema> & { tabla: string })[] = [];
  for (const { ws, sheetName } of sheets) {
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!rawRows.length) continue;
    const headers = Object.keys(rawRows[0]);
    const { schema } = detectSchema(headers);
    console.log(`[import] Hoja "${sheetName}" → schema: ${schema.id} (tabla: ${schema.tabla})`);
    for (const row of rawRows) {
      allRows.push(parseRowWithSchema(row, schema) as any);
    }
  }

  if (allRows.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (max ${MAX_ROWS})` }, { status: 400 });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const userId = session.user.id;
  const seenSkus = new Set<string>();

  // Agrupar por tabla
  const byTabla = new Map<string, typeof allRows>();
  for (const row of allRows) {
    const tabla = row.tabla as string;
    if (!tabla) { skippedCount++; continue; }
    const sku = String(row.sku ?? "").trim();
    if (!sku || sku.length > 100) { skippedCount++; continue; }
    if (seenSkus.has(sku)) { skippedCount++; continue; }
    seenSkus.add(sku);
    if (!byTabla.has(tabla)) byTabla.set(tabla, []);
    byTabla.get(tabla)!.push(row);
  }

  // Procesar cada tabla
  for (const [tablaNombre, rows] of byTabla.entries()) {
    const prismaKey = TABLE_TO_KEY[tablaNombre];
    if (!prismaKey) { skippedCount += rows.length; continue; }
    const delegate = (prisma as any)[prismaKey];

    const skus = rows.map((r) => String(r.sku));
    const existing = await delegate.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } });
    const existingMap = new Map(existing.map((e: any) => [e.sku, e]));

    for (const row of rows) {
      const sku = String(row.sku);
      const data = cleanRow(row as Record<string, unknown>);
      const existingRecord = existingMap.get(sku);

      try {
        if (existingRecord) {
          await delegate.update({ where: { sku }, data });
          await prisma.changeLog.create({
            data: {
              tablaNombre,
              entidadId: existingRecord.id,
              usuarioId: userId,
              campo: "PRODUCTO",
              valorAnterior: sku,
              valorNuevo: String(data.nombre ?? sku),
              tipo: "UPDATE",
            },
          });
          updatedCount++;
        } else {
          const created = await delegate.create({ data });
          await prisma.changeLog.create({
            data: {
              tablaNombre,
              entidadId: created.id,
              usuarioId: userId,
              campo: "PRODUCTO",
              valorAnterior: null,
              valorNuevo: String(data.nombre ?? sku),
              tipo: "CREATE",
            },
          });
          createdCount++;
        }
      } catch (e) {
        console.error(`[import] Error en SKU ${sku}:`, e);
        skippedCount++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Importacion completada: ${createdCount} creados, ${updatedCount} actualizados, ${skippedCount} omitidos`,
    data: { createdCount, updatedCount, skippedCount },
  });
}
