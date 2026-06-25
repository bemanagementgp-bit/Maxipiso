import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

// Normaliza un encabezado: minúsculas, sin tildes, sin espacios extra
function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Mapeo de columnas conocidas → campo del producto
const KNOWN_FIELDS: Record<string, string> = {
  // SKU
  sku: "sku", codigo: "sku", "codigo/sku": "sku", "cod": "sku", item: "sku",
  // Nombre
  nombre: "nombre", producto: "nombre", "nombre de madera": "nombre",
  "nombre del producto": "nombre", "nombre producto": "nombre",
  // Marca / Tipo
  marca: "marca", rubro: "marca", linea: "marca", "tipo de producto": "marca",
  // Precio
  precio: "precio", "precio unitario": "precio", valor: "precio", price: "precio",
  // Imagen
  imagen: "imagen", image: "imagen", foto: "imagen", img: "imagen",
  // Descripción directa
  descripcion: "descripcion", "descripcion del producto": "descripcion",
  observaciones: "descripcion",
  // Stock
  stock: "stock",
  // Unidad de medida
  "unidad de medida": "unidadMedida", unidad: "unidadMedida", um: "unidadMedida",
  // Moneda
  moneda: "moneda", currency: "moneda",
  // Categoría
  categoria: "categoria", "categoria prod": "categoria",
  subcategoria: "subcategoria",
};

// Columnas que van a specs (JSON) en lugar de campos directos
const SPECS_FIELDS = new Set([
  "medidas", "espesores disponibles", "espesores", "secado", "origen",
  "ficha tecnica", "archivo instalacion", "instalacion",
  "ac/caracteristicas", "caracteristicas", "caja/base", "caja", "base",
  "texto extraido",
]);

function pickWorksheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  // Preferir hoja llamada "productos extraidos"
  const preferred = workbook.SheetNames.find(
    (n) => norm(n) === "productos extraidos"
  );
  if (preferred) return workbook.Sheets[preferred];

  // Elegir la primera hoja con datos y algún encabezado reconocible
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(norm);
    if (keys.some((k) => ["sku", "codigo", "nombre", "producto", "precio"].includes(k))) {
      return ws;
    }
  }
  return workbook.Sheets[workbook.SheetNames[0]];
}

// Parsea una fila de forma dinámica, mapeando lo que conoce
function parseRow(row: Record<string, unknown>): {
  sku: string; nombre: string; marca: string; precio: number;
  imagen?: string; descripcion?: string; stock?: number;
  unidadMedida?: string; moneda?: string; categoria?: string; subcategoria?: string;
  specs?: string;
  _unmapped: Record<string, string>;
} {
  const mapped: Record<string, unknown> = {};
  const specsData: Record<string, string> = {};
  const unmapped: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = norm(rawKey);
    const val = String(rawValue ?? "").trim();
    if (!val) continue;

    if (KNOWN_FIELDS[key]) {
      const field = KNOWN_FIELDS[key];
      if (!mapped[field]) mapped[field] = val; // first match wins
    } else if (SPECS_FIELDS.has(key)) {
      specsData[rawKey.trim()] = val;
    } else if (key && val) {
      unmapped[rawKey.trim()] = val;
    }
  }

  // Combinar specs + unmapped en JSON
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
    _unmapped: unmapped,
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
  const worksheet = pickWorksheet(workbook);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  // Detectar columnas detectadas en este archivo
  const detectedColumns = rows.length > 0
    ? Object.keys(rows[0]).map((k) => ({
        original: k,
        mapsTo: KNOWN_FIELDS[norm(k)] ?? (SPECS_FIELDS.has(norm(k)) ? "specs" : "ignorado"),
      }))
    : [];

  // Parsear todas las filas primero
  const parsed = rows.map(parseRow);

  // Detectar duplicados dentro del archivo
  const skusSeen = new Set<string>();
  const duplicateSkus = new Set<string>();
  for (const p of parsed) {
    if (!p.sku) continue;
    if (skusSeen.has(p.sku)) duplicateSkus.add(p.sku);
    skusSeen.add(p.sku);
  }

  // UNA sola query para todos los SKUs válidos del archivo
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
    if (duplicateSkus.has(p.sku)) {
      duplicates.push(p);
      continue;
    }
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
