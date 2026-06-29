import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
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

const FIELD_MAP: Record<string, string> = {
  sku: "sku",
  nombre: "nombre",
  "nombre de madera": "nombre",
  "nombre del producto": "nombre",
  especie: "nombre",
  marca: "marca",
  "precio x m2": "precio",
  "precio por m2": "precio",
  precio: "precio",
  imagen: "imagen",
  imagenes: "imagen",
  descripcion: "descripcion",
  stock: "stock",
  "unidad de medida": "unidadMedida",
  moneda: "moneda",
  "categoria principal": "categoria",
  categoria: "categoria",
  "categoria secundaria": "subcategoria",
  subcategoria: "subcategoria",
};

const SKIP_COLS = new Set([
  "__empty",
  "moneda_1", "moneda_2", "moneda1", "moneda2",
]);

function pickWorksheets(workbook: XLSX.WorkBook): { ws: XLSX.WorkSheet; sheetName: string }[] {
  const valid: { ws: XLSX.WorkSheet; sheetName: string }[] = [];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    const hasSku = keys.some((k) => k === "sku");
    const hasName = keys.some((k) => ["nombre", "nombre de madera", "especie"].includes(k));
    if (hasSku && hasName) valid.push({ ws, sheetName: name });
  }
  if (valid.length > 0) return valid;
  const name = workbook.SheetNames[0];
  return [{ ws: workbook.Sheets[name], sheetName: name }];
}

function parseRow(row: Record<string, unknown>): {
  sku: string; nombre: string; marca?: string; precio: number;
  imagen?: string; descripcion?: string; stock?: number;
  unidadMedida?: string; moneda?: string; categoria?: string; subcategoria?: string;
  specs?: string;
  _mapped: string[];
} {
  const mapped: Record<string, string> = {};
  const specs: Record<string, string> = {};
  const mappedCols: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = norm(rawKey);
    const val = String(rawValue ?? "").trim();
    if (SKIP_COLS.has(key) || !key || !val) continue;

    if (FIELD_MAP[key]) {
      if (!mapped[FIELD_MAP[key]]) {
        mapped[FIELD_MAP[key]] = val;
        mappedCols.push(`${rawKey.trim()} → ${FIELD_MAP[key]}`);
      }
    } else {
      specs[rawKey.trim()] = val;
    }
  }

  const sku = (mapped.sku ?? "").replace(/\.0$/, "").trim();
  const nombre = (mapped.nombre ?? "").trim();
  const precioRaw = (mapped.precio ?? "0").replace(/[^\d.,]/g, "").replace(",", ".");
  const precio = parseFloat(precioRaw);

  return {
    sku,
    nombre,
    marca: mapped.marca?.trim() || undefined,
    precio: isFinite(precio) && precio >= 0 ? precio : 0,
    imagen: mapped.imagen?.trim() || undefined,
    descripcion: mapped.descripcion?.trim() || undefined,
    stock: mapped.stock ? Math.round(parseFloat(mapped.stock)) || undefined : undefined,
    unidadMedida: mapped.unidadMedida?.trim() || undefined,
    moneda: mapped.moneda?.trim() || undefined,
    categoria: mapped.categoria?.trim() || undefined,
    subcategoria: mapped.subcategoria?.trim() || undefined,
    specs: Object.keys(specs).length > 0 ? JSON.stringify(specs) : undefined,
    _mapped: mappedCols,
  };
}

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "Archivo inválido o demasiado grande" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer", cellHTML: false, cellFormula: false, bookVBA: false });
  const sheets = pickWorksheets(workbook);
  const sheetNames = sheets.map((s) => s.sheetName);

  const rows: Record<string, unknown>[] = [];
  for (const { ws } of sheets) {
    rows.push(...XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" }));
  }

  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  // Columnas detectadas en la primera hoja (representativa)
  const firstSheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheets[0].ws, { defval: "" });
  const detectedColumns = firstSheetRows.length > 0
    ? Object.keys(firstSheetRows[0]).map((k) => {
        const n = norm(k);
        if (SKIP_COLS.has(n)) return { original: k, mapsTo: "ignorado" };
        return { original: k, mapsTo: FIELD_MAP[n] ?? "specs" };
      })
    : [];

  const parsed = rows.map(parseRow);

  const skusSeen = new Set<string>();
  const duplicateSkus = new Set<string>();
  for (const p of parsed) {
    if (!p.sku) continue;
    if (skusSeen.has(p.sku)) duplicateSkus.add(p.sku);
    skusSeen.add(p.sku);
  }

  const validSkus = [...skusSeen].filter((s) => !duplicateSkus.has(s));
  const existingProducts = await prisma.product.findMany({
    where: { sku: { in: validSkus } },
    select: { id: true, sku: true, nombre: true, precio: true, marca: true },
  });
  const existingMap = new Map(existingProducts.map((p) => [p.sku, p]));

  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const toSkip: any[] = [];
  const duplicates: any[] = [];

  for (const p of parsed) {
    if (!p.sku || !p.nombre || p.precio < 0 || p.precio > 99_999_999) {
      toSkip.push({ sku: p.sku, nombre: p.nombre, motivo: !p.sku ? "Sin SKU" : !p.nombre ? "Sin nombre" : "Precio inválido" });
      continue;
    }
    if (duplicateSkus.has(p.sku)) { duplicates.push(p); continue; }
    const existing = existingMap.get(p.sku);
    if (existing) {
      const cambios: string[] = [];
      if (existing.nombre !== p.nombre) cambios.push(`nombre: "${existing.nombre}" → "${p.nombre}"`);
      if (existing.precio !== p.precio) cambios.push(`precio: $${existing.precio} → $${p.precio}`);
      if (p.marca && existing.marca !== p.marca) cambios.push(`marca: "${existing.marca}" → "${p.marca}"`);
      toUpdate.push({ ...p, id: existing.id, cambios });
    } else {
      toCreate.push(p);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      sheetNames,
      detectedColumns,
      toCreate: toCreate.slice(0, 100),
      toUpdate: toUpdate.slice(0, 100),
      toSkip: toSkip.slice(0, 50),
      duplicates: duplicates.slice(0, 50),
      totals: {
        create: toCreate.length,
        update: toUpdate.length,
        skip: toSkip.length,
        duplicates: duplicates.length,
      },
    },
  });
}
