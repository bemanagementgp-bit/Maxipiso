// ─────────────────────────────────────────────────────────────
//  Sheet Schemas — configuración de columnas por categoría
//  Cada schema define:
//    · signatureColumns: columnas únicas que identifican la categoría
//    · fieldMap: col normalizada → campo del producto
//  Todo lo que no esté en fieldMap va a `specs` (JSON).
// ─────────────────────────────────────────────────────────────

export function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Columnas que se descartan siempre (unidades de medida, ruido)
// Matches: u.m, u.m., u.m_1, um, um_1, moneda_1, moneda_2, __empty*, cantidad imagen
export function isSkipCol(key: string): boolean {
  return /^(u\.?m\.?(_\d+)?|um(_\d+)?|moneda_\d+|__empty.*|cantidad imagen)$/.test(key);
}

export interface SheetSchema {
  id: string;
  label: string;
  defaultCategoria: string;
  /** Columnas normalizadas que identifican unívocamente este schema */
  signatureColumns: string[];
  /** col normalizada → campo del producto */
  fieldMap: Record<string, string>;
}

export const SHEET_SCHEMAS: SheetSchema[] = [
  // ── 1. PISOS FLOTANTES ──────────────────────────────────────
  {
    id: "pisos-flotantes",
    label: "Pisos Flotantes",
    defaultCategoria: "Pisos Flotantes",
    signatureColumns: ["abrasion", "tablas x caja", "cajas por pallet"],
    fieldMap: {
      sku:                  "sku",
      nombre:               "nombre",
      marca:                "marca",
      "precio x m2":        "precio",
      moneda:               "moneda",
      stock:                "stock",
      imagenes:             "imagen",
      imagen:               "imagen",
      descripcion:          "descripcion",
      "categoria principal":"categoria",
      "categoria secundaria":"subcategoria",
    },
  },

  // ── 2. PORCELANATOS Y CERÁMICOS ─────────────────────────────
  // Firma: acabado + terminacion + tipo de uso (Pisos Madera tiene acabado+terminacion
  // pero NO tipo de uso, entonces porcelanatos gana con 3 puntos vs 2)
  {
    id: "porcelanatos",
    label: "Porcelanatos y Cerámicos",
    defaultCategoria: "Porcelanatos y Cerámicos",
    signatureColumns: ["acabado", "terminacion", "tipo de uso"],
    fieldMap: {
      sku:                  "sku",
      nombre:               "nombre",
      marca:                "marca",
      "precio x m2":        "precio",
      moneda:               "moneda",
      stock:                "stock",
      imagenes:             "imagen",
      imagen:               "imagen",
      descripcion:          "descripcion",
      "categoria principal":"categoria",
      "categoria secundaria":"subcategoria",
    },
  },

  // ── 3 & 4. REVESTIMIENTOS (Exteriores + Interiores) ─────────
  // Columnas idénticas en ambas hojas → se unifican en un schema.
  // La categoría real viene de la columna "Categoria Principal" de cada fila.
  // Precio principal: "Precio por M2" (los otros precios van a specs).
  {
    id: "revestimientos",
    label: "Revestimientos",
    defaultCategoria: "Revestimientos",
    signatureColumns: ["precio por ml", "uso"],
    fieldMap: {
      sku:                  "sku",
      nombre:               "nombre",
      marca:                "marca",
      "precio por m2":      "precio",
      moneda:               "moneda",
      stock:                "stock",
      imagen:               "imagen",
      imagenes:             "imagen",
      descripcion:          "descripcion",
      "categoria principal":"categoria",
    },
  },

  // ── 5. PISOS VINÍLICOS ──────────────────────────────────────
  {
    id: "pisos-vinilicos",
    label: "Pisos Vinílicos",
    defaultCategoria: "Pisos Vinílicos",
    signatureColumns: ["capa de uso", "espesor total", "cajas x pallet"],
    fieldMap: {
      sku:                  "sku",
      nombre:               "nombre",
      marca:                "marca",
      "precio x m2":        "precio",
      moneda:               "moneda",
      stock:                "stock",
      imagenes:             "imagen",
      imagen:               "imagen",
      descripcion:          "descripcion",
      "categoria principal":"categoria",
      "categoria secundaria":"subcategoria",
    },
  },

  // ── 6. PISOS DE MADERA E INGENIERÍA ─────────────────────────
  // Usa "Especie" como nombre del producto (no tiene columna "Nombre")
  {
    id: "pisos-madera",
    label: "Pisos de Madera e Ingeniería",
    defaultCategoria: "Pisos de Madera",
    signatureColumns: ["especie", "espesor lamina", "subtipo"],
    fieldMap: {
      sku:                  "sku",
      especie:              "nombre",   // "Especie" = nombre del producto
      marca:                "marca",
      "precio x m2":        "precio",
      moneda:               "moneda",
      stock:                "stock",
      imagenes:             "imagen",
      imagen:               "imagen",
      descripcion:          "descripcion",
      "categoria principal":"categoria",
      "categoria secundaria":"subcategoria",
    },
  },

  // ── 7. DECK WPC ─────────────────────────────────────────────
  // "Precio M Lineal" es exclusivo de Deck (Rev. usa "Precio por ml")
  {
    id: "deck",
    label: "Deck WPC",
    defaultCategoria: "Deck WPC",
    signatureColumns: ["precio m lineal"],
    fieldMap: {
      sku:                  "sku",
      nombre:               "nombre",
      marca:                "marca",
      "precio por m2":      "precio",
      moneda:               "moneda",
      stock:                "stock",
      imagen:               "imagen",
      imagenes:             "imagen",
      descripcion:          "descripcion",
      "categoria principal":"categoria",
    },
  },

  // ── 8. MADERAS ───────────────────────────────────────────────
  // Sin "Precio x m2" — usa "Precio" directo + "Unidad de Medida"
  {
    id: "maderas",
    label: "Maderas",
    defaultCategoria: "Maderas",
    signatureColumns: ["nombre de madera", "espesores disponibles", "secado"],
    fieldMap: {
      sku:                  "sku",
      "nombre de madera":   "nombre",
      precio:               "precio",
      "unidad de medida":   "unidadMedida",
      moneda:               "moneda",
      stock:                "stock",
      imagen:               "imagen",
      imagenes:             "imagen",
      descripcion:          "descripcion",
    },
  },

  // ── 9. ACCESORIOS ────────────────────────────────────────────
  // Hoja muy corta (7 cols), sin precio ni marca
  {
    id: "accesorios",
    label: "Accesorios",
    defaultCategoria: "Accesorios",
    signatureColumns: ["dimensiones", "colores"],
    fieldMap: {
      sku:              "sku",
      nombre:           "nombre",
      subtipo:          "subcategoria",
      "tipo de producto":"categoria",
      descripcion:      "descripcion",
    },
  },
];

// ─────────────────────────────────────────────────────────────
//  Detección automática de schema por headers de la hoja
// ─────────────────────────────────────────────────────────────
export function detectSchema(
  headers: string[],
): { schema: SheetSchema; score: number } {
  const headerSet = new Set(headers.map(norm));
  let best = SHEET_SCHEMAS[0];
  let bestScore = -1;

  for (const schema of SHEET_SCHEMAS) {
    const score = schema.signatureColumns.filter((col) =>
      headerSet.has(col),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      best = schema;
    }
  }

  return { schema: best, score: bestScore };
}

// ─────────────────────────────────────────────────────────────
//  Parser de fila con schema
// ─────────────────────────────────────────────────────────────
export type ParsedRow = {
  sku: string;
  nombre: string;
  marca: string;
  precio: number;
  imagen?: string;
  descripcion?: string;
  stock?: number;
  unidadMedida?: string;
  moneda?: string;
  categoria?: string;
  subcategoria?: string;
  specs?: string;
};

export function parseRowWithSchema(
  row: Record<string, unknown>,
  schema: SheetSchema,
): ParsedRow {
  const mapped: Record<string, string> = {};
  const specs: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = norm(rawKey);
    const val = String(rawValue ?? "").trim();

    if (!val || !key || isSkipCol(key)) continue;

    const field = schema.fieldMap[key];
    if (field) {
      if (!mapped[field]) mapped[field] = val; // first-match-wins
    } else {
      specs[rawKey.trim()] = val;
    }
  }

  const sku = (mapped.sku ?? "").replace(/\.0$/, "").trim();
  const nombre = (mapped.nombre ?? "").trim();
  const marca = (mapped.marca ?? "").trim();
  const precioRaw = (mapped.precio ?? "0")
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  const precio = parseFloat(precioRaw);

  return {
    sku,
    nombre,
    marca: marca || "",
    precio: isFinite(precio) && precio >= 0 ? precio : 0,
    imagen: mapped.imagen?.trim() || undefined,
    descripcion: mapped.descripcion?.trim() || undefined,
    stock: mapped.stock
      ? Math.round(parseFloat(mapped.stock)) || undefined
      : undefined,
    unidadMedida: mapped.unidadMedida?.trim() || undefined,
    moneda: mapped.moneda?.trim() || undefined,
    categoria: mapped.categoria?.trim() || schema.defaultCategoria,
    subcategoria: mapped.subcategoria?.trim() || undefined,
    specs: Object.keys(specs).length > 0 ? JSON.stringify(specs) : undefined,
  };
}
