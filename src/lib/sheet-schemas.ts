// ─────────────────────────────────────────────────────────────
//  Sheet Schemas — configuración de columnas por categoría
//  Schema v2: tablas separadas, campos mapean al nuevo schema Prisma.
// ─────────────────────────────────────────────────────────────

export function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isSkipCol(key: string): boolean {
  return /^(u\.?m\.?(_\d+)?|um(_\d+)?|moneda_\d+|__empty.*|cantidad imagen)$/.test(key);
}

export interface SheetSchema {
  id: string;
  label: string;
  tabla: string;             // nombre de tabla en DB
  signatureColumns: string[];
  fieldMap: Record<string, string>;
}

export const SHEET_SCHEMAS: SheetSchema[] = [
  // 1. PISOS FLOTANTES
  {
    id: "pisos-flotantes",
    label: "Pisos Flotantes",
    tabla: "pisos_flotantes",
    signatureColumns: ["abrasion", "tablas x caja", "cajas por pallet"],
    fieldMap: {
      sku:                    "sku",
      "categoria principal":  "categoriaPrincipal",
      "categoria secundaria": "categoriaSecundaria",
      "categoria terciaria":  "categoriaTerciaria",
      "tipo producto":        "tipoProducto",
      origen:                 "origen",
      nombre:                 "nombre",
      codigo:                 "codigo",
      marca:                  "marca",
      linea:                  "linea",
      "tipo de uso":          "tipoDeUso",
      espesor:                "espesor",
      abrasion:               "abrasion",
      "manto incorporado":    "mantoIncorporado",
      bisel:                  "bisel",
      ancho:                  "ancho",
      largo:                  "largo",
      base:                   "base",
      "tablas x caja":        "tablasPorCaja",
      "precio x m2":          "precioM2",
      moneda:                 "moneda",
      "precio x caja":        "precioCaja",
      "peso por caja":        "pesoCaja",
      "cajas por pallet":     "cajasPallet",
      "peso x pallet":        "pesoPallet",
      stock:                  "stock",
      imagenes:               "imagenes",
      imagen:                 "imagenes",
      "precio envio x caja":  "precioEnvioCaja",
      garantia:               "garantia",
      "ficha tecnica":        "fichaTecnica",
      "archivo instalacion":  "archivoInstalacion",
      descripcion:            "descripcion",
    },
  },

  // 2. PORCELLANATOS
  {
    id: "porcellanatos",
    label: "Porcelanatos",
    tabla: "porcellanatos",
    signatureColumns: ["acabado", "terminacion", "tipo de uso"],
    fieldMap: {
      sku:                    "sku",
      "categoria principal":  "categoriaPrincipal",
      "categoria secundaria": "categoriaSecundaria",
      "tipo producto":        "tipoProducto",
      acabado:                "acabado",
      terminacion:            "terminacion",
      origen:                 "origen",
      nombre:                 "nombre",
      codigo:                 "codigo",
      marca:                  "marca",
      linea:                  "linea",
      "tipo de uso":          "tipoDeUso",
      espesor:                "espesor",
      ancho:                  "ancho",
      largo:                  "largo",
      base:                   "base",
      "precio x m2":          "precioM2",
      moneda:                 "moneda",
      "precio x caja":        "precioCaja",
      stock:                  "stock",
      imagenes:               "imagenes",
      imagen:                 "imagenes",
      "precio envio x caja":  "precioEnvioCaja",
      garantia:               "garantia",
      "ficha tecnica":        "fichaTecnica",
      "archivo instalacion":  "archivoInstalacion",
      descripcion:            "descripcion",
    },
  },

  // 3 & 4. REVESTIMIENTOS (Exteriores + Interiores)
  {
    id: "revestimientos",
    label: "Revestimientos",
    tabla: "revestimientos",
    signatureColumns: ["precio por ml", "uso"],
    fieldMap: {
      sku:                    "sku",
      "categoria principal":  "categoriaPrincipal",
      "tipo de producto":     "tipoProducto",
      uso:                    "uso",
      material:               "material",
      marca:                  "marca",
      linea:                  "linea",
      nombre:                 "nombre",
      espesor:                "espesor",
      ancho:                  "ancho",
      largo:                  "largo",
      "base de tabla":        "baseTabla",
      "precio por tabla":     "precioTabla",
      "precio por m2":        "precioM2",
      "precio por ml":        "precioMl",
      moneda:                 "moneda",
      imagen:                 "imagenes",
      flete:                  "flete",
      stock:                  "stock",
      "ficha tecnica":        "fichaTecnica",
      "archivo instalacion":  "archivoInstalacion",
      descripcion:            "descripcion",
    },
  },

  // 5. PISOS VINILICOS
  {
    id: "pisos-vinilicos",
    label: "Pisos Vinilicos",
    tabla: "pisos_vinilicos",
    signatureColumns: ["capa de uso", "espesor total", "cajas x pallet"],
    fieldMap: {
      sku:                      "sku",
      "categoria principal":    "categoriaPrincipal",
      "categoria secundaria":   "categoriaSecundaria",
      "categoria terciaria":    "categoriaTerciaria",
      "tipo producto":          "tipoProducto",
      material:                 "material",
      origen:                   "origen",
      nombre:                   "nombre",
      codigo:                   "codigo",
      marca:                    "marca",
      linea:                    "linea",
      "tipo de uso":            "tipoDeUso",
      "espesor total":          "espesorTotal",
      "espesor composicion":    "espesorComposicion",
      "capa de uso":            "capaDeUso",
      "manto incorporado":      "mantoIncorporado",
      "tablas x caja":          "tablasPorCaja",
      ancho:                    "ancho",
      largo:                    "largo",
      base:                     "base",
      bisel:                    "bisel",
      "precio x m2":            "precioM2",
      moneda:                   "moneda",
      "precio x caja":          "precioCaja",
      "cajas x pallet":         "cajasPallet",
      "peso x caja":            "pesoCaja",
      "peso por pallet":        "pesoPallet",
      stock:                    "stock",
      imagenes:                 "imagenes",
      imagen:                   "imagenes",
      "precio envio x caja":    "precioEnvioCaja",
      garantia:                 "garantia",
      "ficha tecnica":          "fichaTecnica",
      "archivo instalacion":    "archivoInstalacion",
      descripcion:              "descripcion",
    },
  },

  // 6. PISOS DE MADERA E INGENIERIA
  {
    id: "pisos-madera",
    label: "Pisos de Madera e Ingenieria",
    tabla: "pisos_madera",
    signatureColumns: ["especie", "espesor lamina", "subtipo"],
    fieldMap: {
      sku:                    "sku",
      "categoria principal":  "categoriaPrincipal",
      "categoria secundaria": "categoriaSecundaria",
      "categoria terciaria":  "categoriaTerciaria",
      subtipo:                "subtipo",
      "subtipo 2":            "subtipo2",
      especie:                "especie",
      acabado:                "acabado",
      terminacion:            "terminacion",
      origen:                 "origen",
      marca:                  "marca",
      linea:                  "linea",
      espesor:                "espesor",
      "espesor lamina":       "espesorLamina",
      ancho:                  "ancho",
      largo:                  "largo",
      base:                   "base",
      bisel:                  "bisel",
      "precio x m2":          "precioM2",
      moneda:                 "moneda",
      "precio x caja":        "precioCaja",
      stock:                  "stock",
      imagenes:               "imagenes",
      imagen:                 "imagenes",
      "precio envio x caja":  "precioEnvioCaja",
      garantia:               "garantia",
      "ficha tecnica":        "fichaTecnica",
      "archivo instalacion":  "archivoInstalacion",
      descripcion:            "descripcion",
    },
  },

  // 7. DECK
  {
    id: "deck",
    label: "Deck",
    tabla: "decks",
    signatureColumns: ["precio m lineal"],
    fieldMap: {
      sku:                    "sku",
      "categoria principal":  "categoriaPrincipal",
      "tipo de producto":     "tipoProducto",
      material:               "material",
      marca:                  "marca",
      linea:                  "linea",
      nombre:                 "nombre",
      espesor:                "espesor",
      ancho:                  "ancho",
      largo:                  "largo",
      "base de tabla":        "baseTabla",
      "precio por tabla":     "precioTabla",
      "precio por m2":        "precioM2",
      "precio m lineal":      "precioMLineal",
      moneda:                 "moneda",
      imagen:                 "imagenes",
      flete:                  "flete",
      stock:                  "stock",
      "ficha tecnica":        "fichaTecnica",
      "archivo instalacion":  "archivoInstalacion",
      descripcion:            "descripcion",
    },
  },

  // 8. MADERAS
  {
    id: "maderas",
    label: "Maderas",
    tabla: "maderas",
    signatureColumns: ["nombre de madera", "espesores disponibles", "secado"],
    fieldMap: {
      sku:                    "sku",
      "tipo de producto":     "tipoProducto",
      "nombre de madera":     "nombre",
      origen:                 "origen",
      "espesores disponibles":"espesoresDisponibles",
      medidas:                "medidas",
      secado:                 "secado",
      precio:                 "precio",
      "unidad de medida":     "unidadMedida",
      moneda:                 "moneda",
      stock:                  "stock",
      imagen:                 "imagenes",
      descripcion:            "descripcion",
      "ficha tecnica":        "fichaTecnica",
      "archivo instalacion":  "archivoInstalacion",
    },
  },

  // 9. ACCESORIOS
  {
    id: "accesorios",
    label: "Accesorios",
    tabla: "accesorios",
    signatureColumns: ["dimensiones", "colores"],
    fieldMap: {
      sku:              "sku",
      "tipo de producto":"tipoProducto",
      subtipo:          "subtipo",
      nombre:           "nombre",
      espesor:          "espesor",
      dimensiones:      "dimensiones",
      colores:          "colores",
      stock:            "stock",
      imagen:           "imagen",
      descripcion:      "descripcion",
    },
  },
];

// Deteccion automatica de schema por headers
export function detectSchema(headers: string[]): { schema: SheetSchema; score: number } {
  const headerSet = new Set(headers.map(norm));
  let best = SHEET_SCHEMAS[0];
  let bestScore = -1;
  for (const schema of SHEET_SCHEMAS) {
    const score = schema.signatureColumns.filter((col) => headerSet.has(col)).length;
    if (score > bestScore) { bestScore = score; best = schema; }
  }
  return { schema: best, score: bestScore };
}

export type ParsedRow = Record<string, unknown> & {
  sku: string;
  tabla: string;
};

export function parseRow(row: Record<string, unknown>, schema: SheetSchema): ParsedRow {
  const result: Record<string, unknown> = { tabla: schema.tabla };
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = norm(rawKey);
    if (isSkipCol(key)) continue;
    const field = schema.fieldMap[key];
    if (field) result[field] = rawVal;
  }
  return result as ParsedRow;
}

// Alias para compatibilidad con el import wizard
export const parseRowWithSchema = parseRow;

