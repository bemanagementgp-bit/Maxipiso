export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  gridVisible?: boolean;
  gridWidth?: string;
  required?: boolean;
  options?: string[];
}

export interface CategoryConfig {
  tabla: string;
  label: string;
  dot: string;
  fields: FieldDef[];
}

const COMMON_FIELDS: FieldDef[] = [
  { key: "sku",         label: "SKU",         type: "text",   gridVisible: true, required: true },
  { key: "nombre",      label: "Nombre",      type: "text",   gridVisible: true, required: true },
  { key: "marca",       label: "Marca",       type: "text",   gridVisible: true },
  { key: "stock",       label: "Stock",       type: "number", gridVisible: true },
  { key: "moneda",      label: "Moneda",      type: "text" },
  { key: "descripcion", label: "Descripción", type: "textarea" },
  { key: "isActive",    label: "Estado",      type: "select", options: ["true", "false"] },
];

const FICHA_FIELDS: FieldDef[] = [
  { key: "fichaTecnica",       label: "Ficha técnica",       type: "text" },
  { key: "archivoInstalacion", label: "Archivo instalación", type: "text" },
  { key: "garantia",           label: "Garantía",            type: "text" },
];

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    tabla: "pisos_flotantes",
    label: "Pisos Flotantes",
    dot: "#f59e0b",
    fields: [
      ...COMMON_FIELDS,
      { key: "categoriaPrincipal",  label: "Cat. principal",   type: "text" },
      { key: "categoriaSecundaria", label: "Cat. secundaria",  type: "text" },
      { key: "categoriaTerciaria",  label: "Cat. terciaria",   type: "text" },
      { key: "tipoProducto",       label: "Tipo producto",    type: "text" },
      { key: "origen",             label: "Origen",           type: "text" },
      { key: "codigo",             label: "Código",           type: "text" },
      { key: "linea",              label: "Línea",            type: "text" },
      { key: "tipoDeUso",          label: "Tipo de uso",      type: "text",   gridVisible: true },
      { key: "espesor",            label: "Espesor",          type: "text",   gridVisible: true },
      { key: "abrasion",           label: "Abrasión",         type: "text",   gridVisible: true },
      { key: "mantoIncorporado",   label: "Manto incorporado",type: "text" },
      { key: "bisel",              label: "Bisel",            type: "text" },
      { key: "ancho",              label: "Ancho",            type: "text" },
      { key: "largo",              label: "Largo",            type: "text" },
      { key: "base",               label: "Base",             type: "text" },
      { key: "tablasPorCaja",      label: "Tablas x caja",    type: "number", gridVisible: true },
      { key: "precioM2",           label: "Precio x m²",      type: "number", gridVisible: true },
      { key: "precioCaja",         label: "Precio x caja",    type: "number" },
      { key: "pesoCaja",           label: "Peso x caja",      type: "number" },
      { key: "cajasPallet",        label: "Cajas x pallet",   type: "number" },
      { key: "pesoPallet",         label: "Peso x pallet",    type: "number" },
      { key: "precioEnvioCaja",    label: "Envío x caja",     type: "number" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "porcellanatos",
    label: "Porcelanatos",
    dot: "#8b5cf6",
    fields: [
      ...COMMON_FIELDS,
      { key: "categoriaPrincipal",  label: "Cat. principal",   type: "text" },
      { key: "categoriaSecundaria", label: "Cat. secundaria",  type: "text" },
      { key: "tipoProducto",       label: "Tipo producto",    type: "text" },
      { key: "acabado",            label: "Acabado",          type: "text",   gridVisible: true },
      { key: "terminacion",        label: "Terminación",      type: "text",   gridVisible: true },
      { key: "origen",             label: "Origen",           type: "text" },
      { key: "codigo",             label: "Código",           type: "text" },
      { key: "linea",              label: "Línea",            type: "text" },
      { key: "tipoDeUso",          label: "Tipo de uso",      type: "text",   gridVisible: true },
      { key: "espesor",            label: "Espesor",          type: "text",   gridVisible: true },
      { key: "ancho",              label: "Ancho",            type: "text" },
      { key: "largo",              label: "Largo",            type: "text" },
      { key: "base",               label: "Base",             type: "text" },
      { key: "precioM2",           label: "Precio x m²",      type: "number", gridVisible: true },
      { key: "precioCaja",         label: "Precio x caja",    type: "number" },
      { key: "precioEnvioCaja",    label: "Envío x caja",     type: "number" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "revestimientos",
    label: "Revestimientos",
    dot: "#0ea5e9",
    fields: [
      ...COMMON_FIELDS,
      { key: "categoriaPrincipal",  label: "Cat. principal",   type: "text" },
      { key: "tipoProducto",       label: "Tipo producto",    type: "text" },
      { key: "uso",                label: "Uso",              type: "text",   gridVisible: true },
      { key: "material",           label: "Material",         type: "text",   gridVisible: true },
      { key: "linea",              label: "Línea",            type: "text" },
      { key: "espesor",            label: "Espesor",          type: "text",   gridVisible: true },
      { key: "ancho",              label: "Ancho",            type: "text" },
      { key: "largo",              label: "Largo",            type: "text" },
      { key: "baseTabla",          label: "Base tabla",       type: "text" },
      { key: "precioTabla",        label: "Precio x tabla",   type: "number" },
      { key: "precioM2",           label: "Precio x m²",      type: "number", gridVisible: true },
      { key: "precioMl",           label: "Precio x ml",      type: "number" },
      { key: "flete",              label: "Flete",            type: "number" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "pisos_vinilicos",
    label: "Pisos Vinílicos",
    dot: "#f97316",
    fields: [
      ...COMMON_FIELDS,
      { key: "categoriaPrincipal",  label: "Cat. principal",   type: "text" },
      { key: "categoriaSecundaria", label: "Cat. secundaria",  type: "text" },
      { key: "categoriaTerciaria",  label: "Cat. terciaria",   type: "text" },
      { key: "tipoProducto",       label: "Tipo producto",    type: "text" },
      { key: "material",           label: "Material",         type: "text" },
      { key: "origen",             label: "Origen",           type: "text" },
      { key: "codigo",             label: "Código",           type: "text" },
      { key: "linea",              label: "Línea",            type: "text" },
      { key: "tipoDeUso",          label: "Tipo de uso",      type: "text",   gridVisible: true },
      { key: "espesorTotal",       label: "Espesor total",    type: "text",   gridVisible: true },
      { key: "espesorComposicion", label: "Espesor composición", type: "text" },
      { key: "capaDeUso",          label: "Capa de uso",      type: "text",   gridVisible: true },
      { key: "mantoIncorporado",   label: "Manto incorporado",type: "text" },
      { key: "tablasPorCaja",      label: "Tablas x caja",    type: "number" },
      { key: "ancho",              label: "Ancho",            type: "text" },
      { key: "largo",              label: "Largo",            type: "text" },
      { key: "base",               label: "Base",             type: "text" },
      { key: "bisel",              label: "Bisel",            type: "text" },
      { key: "precioM2",           label: "Precio x m²",      type: "number", gridVisible: true },
      { key: "precioCaja",         label: "Precio x caja",    type: "number" },
      { key: "cajasPallet",        label: "Cajas x pallet",   type: "number" },
      { key: "pesoCaja",           label: "Peso x caja",      type: "number" },
      { key: "pesoPallet",         label: "Peso x pallet",    type: "number" },
      { key: "precioEnvioCaja",    label: "Envío x caja",     type: "number" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "pisos_madera",
    label: "Pisos Madera e Ingeniería",
    dot: "#84cc16",
    fields: [
      { key: "sku",         label: "SKU",         type: "text",   gridVisible: true, required: true },
      { key: "especie",     label: "Especie",     type: "text",   gridVisible: true },
      { key: "marca",       label: "Marca",       type: "text",   gridVisible: true },
      { key: "stock",       label: "Stock",       type: "number", gridVisible: true },
      { key: "moneda",      label: "Moneda",      type: "text" },
      { key: "descripcion", label: "Descripción", type: "textarea" },
      { key: "isActive",    label: "Estado",      type: "select", options: ["true", "false"] },
      { key: "categoriaPrincipal",  label: "Cat. principal",   type: "text" },
      { key: "categoriaSecundaria", label: "Cat. secundaria",  type: "text" },
      { key: "categoriaTerciaria",  label: "Cat. terciaria",   type: "text" },
      { key: "subtipo",            label: "Subtipo",          type: "text",   gridVisible: true },
      { key: "subtipo2",           label: "Subtipo 2",        type: "text" },
      { key: "acabado",            label: "Acabado",          type: "text",   gridVisible: true },
      { key: "terminacion",        label: "Terminación",      type: "text" },
      { key: "origen",             label: "Origen",           type: "text" },
      { key: "linea",              label: "Línea",            type: "text" },
      { key: "espesor",            label: "Espesor",          type: "text",   gridVisible: true },
      { key: "espesorLamina",      label: "Espesor lámina",   type: "text" },
      { key: "ancho",              label: "Ancho",            type: "text" },
      { key: "largo",              label: "Largo",            type: "text" },
      { key: "base",               label: "Base",             type: "text" },
      { key: "bisel",              label: "Bisel",            type: "text" },
      { key: "precioM2",           label: "Precio x m²",      type: "number", gridVisible: true },
      { key: "precioCaja",         label: "Precio x caja",    type: "number" },
      { key: "precioEnvioCaja",    label: "Envío x caja",     type: "number" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "decks",
    label: "Decks",
    dot: "#10b981",
    fields: [
      ...COMMON_FIELDS,
      { key: "categoriaPrincipal",  label: "Cat. principal",   type: "text" },
      { key: "tipoProducto",       label: "Tipo producto",    type: "text" },
      { key: "material",           label: "Material",         type: "text",   gridVisible: true },
      { key: "linea",              label: "Línea",            type: "text" },
      { key: "espesor",            label: "Espesor",          type: "text",   gridVisible: true },
      { key: "ancho",              label: "Ancho",            type: "text" },
      { key: "largo",              label: "Largo",            type: "text" },
      { key: "baseTabla",          label: "Base tabla",       type: "text" },
      { key: "precioTabla",        label: "Precio x tabla",   type: "number" },
      { key: "precioM2",           label: "Precio x m²",      type: "number", gridVisible: true },
      { key: "precioMLineal",      label: "Precio m lineal",  type: "number", gridVisible: true },
      { key: "flete",              label: "Flete",            type: "number" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "maderas",
    label: "Maderas",
    dot: "#a16207",
    fields: [
      { key: "sku",                  label: "SKU",                type: "text",   gridVisible: true, required: true },
      { key: "nombre",               label: "Nombre de madera",   type: "text",   gridVisible: true, required: true },
      { key: "stock",                label: "Stock",              type: "number", gridVisible: true },
      { key: "moneda",               label: "Moneda",             type: "text" },
      { key: "descripcion",          label: "Descripción",        type: "textarea" },
      { key: "isActive",             label: "Estado",             type: "select", options: ["true", "false"] },
      { key: "tipoProducto",         label: "Tipo producto",      type: "text" },
      { key: "origen",               label: "Origen",             type: "text",   gridVisible: true },
      { key: "espesoresDisponibles", label: "Espesores disponibles", type: "text", gridVisible: true },
      { key: "medidas",              label: "Medidas",            type: "text",   gridVisible: true },
      { key: "secado",               label: "Secado",             type: "text",   gridVisible: true },
      { key: "precio",               label: "Precio",             type: "number", gridVisible: true },
      { key: "unidadMedida",         label: "Unidad de medida",   type: "text" },
      ...FICHA_FIELDS,
    ],
  },
  {
    tabla: "accesorios",
    label: "Accesorios",
    dot: "#6b7280",
    fields: [
      { key: "sku",          label: "SKU",          type: "text",   gridVisible: true, required: true },
      { key: "nombre",       label: "Nombre",       type: "text",   gridVisible: true, required: true },
      { key: "stock",        label: "Stock",        type: "number", gridVisible: true },
      { key: "descripcion",  label: "Descripción",  type: "textarea" },
      { key: "isActive",     label: "Estado",       type: "select", options: ["true", "false"] },
      { key: "tipoProducto", label: "Tipo producto",type: "text",   gridVisible: true },
      { key: "subtipo",      label: "Subtipo",      type: "text",   gridVisible: true },
      { key: "espesor",      label: "Espesor",      type: "text",   gridVisible: true },
      { key: "dimensiones",  label: "Dimensiones",  type: "text",   gridVisible: true },
      { key: "colores",      label: "Colores",      type: "text",   gridVisible: true },
    ],
  },
];

export function getCategoryConfig(tabla: string): CategoryConfig | undefined {
  return CATEGORY_CONFIGS.find((c) => c.tabla === tabla);
}

export function getGridColumns(tabla: string): FieldDef[] {
  const config = getCategoryConfig(tabla);
  if (!config) return [];
  return config.fields.filter((f) => f.gridVisible);
}

export function getEditFields(tabla: string): FieldDef[] {
  const config = getCategoryConfig(tabla);
  if (!config) return [];
  return config.fields.filter((f) => f.key !== "isActive");
}
