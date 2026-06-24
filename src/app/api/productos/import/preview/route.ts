import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

function normalizeHeader(value: unknown) {
  return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function pickWorksheet(workbook: XLSX.WorkBook) {
  const preferred = workbook.SheetNames.find((n) => normalizeHeader(n) === "productos extraidos");
  if (preferred) return workbook.Sheets[preferred];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]).map(normalizeHeader);
    if (keys.includes("codigo/sku") || keys.includes("sku") || keys.includes("nombre")) return ws;
  }
  return workbook.Sheets[workbook.SheetNames[0]];
}

function getField(row: Record<string, unknown>, aliases: string[]) {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeHeader(key))) return value;
  }
  return undefined;
}

function parseRow(row: Record<string, unknown>) {
  const sku = String(getField(row, ["codigo/sku", "sku", "codigo"]) || "").trim();
  const nombre = String(getField(row, ["producto", "nombre"]) || "").trim();
  const marca = String(getField(row, ["marca", "categoria", "rubro"]) || "").trim();
  const precioRaw = getField(row, ["precio", "precio unitario", "valor"]);
  const precio = parseFloat(String(precioRaw || "0").replace(",", "."));
  return { sku, nombre, marca, precio: isFinite(precio) ? precio : 0 };
}

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer", cellHTML: false, cellFormula: false, bookVBA: false });
  const worksheet = pickWorksheet(workbook);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Demasiadas filas (máx ${MAX_ROWS})` }, { status: 400 });

  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const toSkip: any[] = [];
  const duplicates: any[] = [];

  const allSkus = rows.map((r) => parseRow(r).sku).filter(Boolean);
  const skusSeen = new Set<string>();
  const duplicateSkus = new Set<string>();
  for (const sku of allSkus) {
    if (skusSeen.has(sku)) duplicateSkus.add(sku);
    skusSeen.add(sku);
  }

  for (const row of rows) {
    const p = parseRow(row);
    if (!p.sku || !p.nombre || !p.marca || p.precio < 0 || p.precio > 99_999_999) {
      toSkip.push({ ...p, motivo: "Campos requeridos faltantes o inválidos" });
      continue;
    }
    if (duplicateSkus.has(p.sku)) {
      duplicates.push(p);
      continue;
    }
    const existing = await prisma.product.findUnique({ where: { sku: p.sku }, select: { id: true, nombre: true, precio: true, marca: true } });
    if (existing) {
      const changes: string[] = [];
      if (existing.nombre !== p.nombre) changes.push(`nombre: "${existing.nombre}" → "${p.nombre}"`);
      if (existing.precio !== p.precio) changes.push(`precio: $${existing.precio} → $${p.precio}`);
      if (existing.marca !== p.marca) changes.push(`marca: "${existing.marca}" → "${p.marca}"`);
      toUpdate.push({ ...p, id: existing.id, cambios: changes });
    } else {
      toCreate.push(p);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      toCreate: toCreate.slice(0, 100),
      toUpdate: toUpdate.slice(0, 100),
      toSkip: toSkip.slice(0, 50),
      duplicates: duplicates.slice(0, 50),
      totals: { create: toCreate.length, update: toUpdate.length, skip: toSkip.length, duplicates: duplicates.length },
    },
  });
}
