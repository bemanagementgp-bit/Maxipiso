// @ts-nocheck
/**
 * all-products.ts
 * Utilities for querying the multi-table product schema.
 * The app stores products in 8 category-specific Prisma models instead of
 * a single Product table.  All routes that need to work across tables should
 * import from here.
 */
import { prisma } from "@/lib/prisma";

// ─── Table registry ──────────────────────────────────────────────────────────

export type TableKey =
  | "pisoFlotante"
  | "porcellanato"
  | "revestimiento"
  | "pisoVinilico"
  | "pisoMadera"
  | "deck"
  | "madera"
  | "accesorio";

export const TABLE_KEYS: TableKey[] = [
  "pisoFlotante",
  "porcellanato",
  "revestimiento",
  "pisoVinilico",
  "pisoMadera",
  "deck",
  "madera",
  "accesorio",
];

export const DB_NAMES: Record<TableKey, string> = {
  pisoFlotante:  "pisos_flotantes",
  porcellanato:  "porcellanatos",
  revestimiento: "revestimientos",
  pisoVinilico:  "pisos_vinilicos",
  pisoMadera:    "pisos_madera",
  deck:          "decks",
  madera:        "maderas",
  accesorio:     "accesorios",
};

export const TABLE_CATEGORIA: Record<TableKey, string> = {
  pisoFlotante:  "Pisos",
  porcellanato:  "Porcellanatos",
  revestimiento: "Revestimientos",
  pisoVinilico:  "Pisos",
  pisoMadera:    "Pisos",
  deck:          "Decks",
  madera:        "Maderas",
  accesorio:     "Accesorios",
};

/** Tables that store multiple images as a JSON array in the `imagenes` field */
export const TABLES_WITH_IMAGENES_ARRAY: TableKey[] = [
  "pisoFlotante",
  "porcellanato",
  "pisoVinilico",
  "pisoMadera",
];

/**
 * Price-field names that may appear in any product table.
 * Used for ChangeLog queries (campo filter).
 */
export const PRICE_FIELDS = [
  "precioM2",
  "precioCaja",
  "precio",
  "precioTabla",
  "precioMLineal",
  "precioMl",
] as const;

// ─── Normalised shape ─────────────────────────────────────────────────────────

export interface NormalizedProduct {
  id:          string;
  sku:         string;
  nombre:      string;
  marca:       string | null;
  categoria:   string;
  precio:      number;
  imagen:      string | null;
  isActive:    boolean;
  stock:       number | null;
  createdAt:   Date | string;
  tablaNombre: string;
  tableKey:    TableKey;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function firstImage(row: Record<string, unknown>): string | null {
  if (row.imagen) return row.imagen as string;
  if (row.imagenes) {
    try {
      const arr = JSON.parse(row.imagenes as string);
      return Array.isArray(arr) && arr[0] ? (arr[0] as string) : null;
    } catch {}
  }
  return null;
}

function firstPrice(row: Record<string, unknown>): number {
  for (const field of PRICE_FIELDS) {
    const v = row[field];
    if (v !== null && v !== undefined && (v as number) > 0) return v as number;
  }
  return 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function normalizeRow(row: Record<string, unknown>, tableKey: TableKey): NormalizedProduct {
  return {
    id:          row.id as string,
    sku:         row.sku as string,
    nombre:      ((row.nombre ?? row.especie ?? row.sku) as string) || "",
    marca:       (row.marca as string) ?? null,
    categoria:   (row.categoriaPrincipal as string) || TABLE_CATEGORIA[tableKey],
    precio:      firstPrice(row),
    imagen:      firstImage(row),
    isActive:    row.isActive as boolean,
    stock:       (row.stock as number) ?? null,
    createdAt:   row.createdAt as Date | string,
    tablaNombre: DB_NAMES[tableKey],
    tableKey,
  };
}

/** Fetch and normalise every product from every table. */
export async function getAllProducts(options?: {
  isActive?: boolean;
  search?: string;
}): Promise<NormalizedProduct[]> {
  const results = await Promise.all(
    TABLE_KEYS.map(async (key) => {
      const delegate = (prisma as any)[key];
      if (!delegate) return [];

      const where: Record<string, unknown> = {};
      if (options?.isActive !== undefined) where.isActive = options.isActive;
      if (options?.search) {
        where.OR = [
          { sku:    { contains: options.search } },
          { nombre: { contains: options.search } },
        ];
      }

      const rows = await delegate
        .findMany({ where, orderBy: { createdAt: "desc" } })
        .catch(() => []);
      return (rows as Record<string, unknown>[]).map((r) => normalizeRow(r, key));
    }),
  );
  return results.flat();
}

/** Find a single product by ID across all tables (sequential, stops on first match). */
export async function findProductById(id: string): Promise<{
  normalized:  NormalizedProduct;
  raw:         Record<string, unknown>;
  tableKey:    TableKey;
  tablaNombre: string;
} | null> {
  for (const key of TABLE_KEYS) {
    const delegate = (prisma as any)[key];
    if (!delegate) continue;
    const row = await delegate.findUnique({ where: { id } }).catch(() => null);
    if (row) {
      return {
        normalized:  normalizeRow(row as Record<string, unknown>, key),
        raw:         row as Record<string, unknown>,
        tableKey:    key,
        tablaNombre: DB_NAMES[key],
      };
    }
  }
  return null;
}

/** Batch-fetch products by IDs in parallel across all tables. Returns Map<id, NormalizedProduct>. */
export async function findProductsByIds(ids: string[]): Promise<Map<string, NormalizedProduct>> {
  if (!ids.length) return new Map();
  const map = new Map<string, NormalizedProduct>();
  await Promise.all(
    TABLE_KEYS.map(async (key) => {
      const delegate = (prisma as any)[key];
      if (!delegate) return;
      const rows = await delegate
        .findMany({ where: { id: { in: ids } } })
        .catch(() => []);
      for (const row of rows as Record<string, unknown>[]) {
        map.set(row.id as string, normalizeRow(row, key));
      }
    }),
  );
  return map;
}

/** Full-text search by SKU or nombre across all tables. */
export async function searchProducts(q: string, limit = 8): Promise<NormalizedProduct[]> {
  if (!q || q.length < 2) return [];
  const results = await Promise.all(
    TABLE_KEYS.map(async (key) => {
      const delegate = (prisma as any)[key];
      if (!delegate) return [];
      const rows = await delegate
        .findMany({
          where: { OR: [{ sku: { contains: q } }, { nombre: { contains: q } }] },
          take: limit,
        })
        .catch(() => []);
      return (rows as Record<string, unknown>[]).map((r) => normalizeRow(r, key));
    }),
  );
  return results.flat().slice(0, limit);
}

/**
 * Build a specs object from available fields in a raw product row.
 * Used by the public catalog product page.
 */
export function buildSpecsFromRow(row: Record<string, unknown>): Record<string, string> {
  const set = (key: string, val: unknown, unit?: unknown) => {
    if (val === null || val === undefined || val === "") return;
    specs[key] = unit ? `${val} ${unit}` : String(val);
  };

  const specs: Record<string, string> = {};
  set("Tipo",               row.tipoProducto);
  set("Origen",             row.origen);
  set("Especie",            row.especie);
  set("Espesor",            row.espesor,    row.espesorUm);
  set("Ancho",              row.ancho,      row.anchoUm);
  set("Largo",              row.largo,      row.largoUm);
  set("Bisel",              row.bisel);
  set("Línea",              row.linea);
  set("Uso",                row.uso ?? row.tipoDeUso);
  set("Material",           row.material);
  set("Capa de Uso",        row.capaDeUso);
  set("Acabado",            row.acabado);
  set("Terminación",        row.terminacion);
  set("Manto Incorporado",  row.mantoIncorporado);
  set("Abrasión",           row.abrasion);
  set("Espesores Disponibles", row.espesoresDisponibles);
  set("Medidas",            row.medidas);
  set("Secado",             row.secado);
  return specs;
}
