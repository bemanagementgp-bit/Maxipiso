import { CATEGORY_CONFIGS, type FieldDef } from "@/lib/category-fields";

/**
 * Qué campos de dinero y stock tiene cada categoría.
 *
 * Se derivan de `CATEGORY_CONFIGS` en vez de listarse a mano: esa config ya es
 * la fuente de verdad del ABM, y duplicarla acá garantizaba que en la próxima
 * columna nueva las dos listas quedaran desincronizadas.
 *
 * Las 8 tablas NO comparten los mismos campos:
 *  - `maderas` tiene `precio` a secas, no `precioM2`.
 *  - `revestimientos` usa `precioMl` y `decks` usa `precioMLineal` para lo mismo.
 *  - `accesorios` no tiene ningún precio ni moneda: solo `stock`.
 * Cualquier operación masiva tiene que respetar eso o termina mandando a Prisma
 * una columna que no existe (que es exactamente el 500 que rompía `garantia`).
 */

/** Todo campo cuyo nombre empieza con `precio` es un importe editable. */
const ES_PRECIO = (f: FieldDef) => f.key.startsWith("precio");

export type CamposDeDinero = {
  tabla: string;
  label: string;
  dot: string;
  precios: FieldDef[];
  /** `stock` si la tabla lo tiene. Todas menos ninguna, pero se chequea igual. */
  stock: FieldDef | null;
  /** `moneda` si la tabla la tiene. `accesorios` no. */
  moneda: FieldDef | null;
};

const CACHE = new Map<string, CamposDeDinero>();

export function getCamposDeDinero(tabla: string): CamposDeDinero | null {
  const cacheado = CACHE.get(tabla);
  if (cacheado) return cacheado;

  const config = CATEGORY_CONFIGS.find((c) => c.tabla === tabla);
  if (!config) return null;

  const resultado: CamposDeDinero = {
    tabla: config.tabla,
    label: config.label,
    dot: config.dot,
    precios: config.fields.filter(ES_PRECIO),
    stock: config.fields.find((f) => f.key === "stock") ?? null,
    moneda: config.fields.find((f) => f.key === "moneda") ?? null,
  };
  CACHE.set(tabla, resultado);
  return resultado;
}

export function getTodasLasCategorias(): CamposDeDinero[] {
  return CATEGORY_CONFIGS.map((c) => getCamposDeDinero(c.tabla)!).filter(Boolean);
}

/**
 * Unión ordenada de las columnas de precio de varias categorías.
 *
 * La grilla la usa para decidir qué columnas mostrar: filtrando por una
 * categoría quedan solo las suyas, y sin filtro aparecen todas, con un guion en
 * las celdas que no aplican.
 */
export function unirColumnasDePrecio(tablas: string[]): FieldDef[] {
  const vistas = new Map<string, FieldDef>();
  for (const tabla of tablas) {
    for (const campo of getCamposDeDinero(tabla)?.precios ?? []) {
      if (!vistas.has(campo.key)) vistas.set(campo.key, campo);
    }
  }
  return [...vistas.values()];
}

/** `true` si esa tabla acepta ese campo de dinero/stock. */
export function aceptaCampo(tabla: string, key: string): boolean {
  const campos = getCamposDeDinero(tabla);
  if (!campos) return false;
  if (key === "stock") return campos.stock !== null;
  if (key === "moneda") return campos.moneda !== null;
  return campos.precios.some((f) => f.key === key);
}

/** Columnas que la grilla necesita leer de cada fila, además de los precios. */
export const CAMPOS_IDENTIDAD = ["id", "sku", "nombre", "marca", "isActive", "updatedAt"] as const;

/**
 * Nombre visible de una fila.
 *
 * `pisos_madera` guarda la especie y deja `nombre` opcional, así que sin este
 * fallback media grilla se veía sin nombre.
 */
export function nombreDeFila(row: Record<string, unknown>): string {
  const nombre = String(row.nombre ?? "").trim();
  if (nombre) return nombre;
  const especie = String(row.especie ?? "").trim();
  if (especie) return especie;
  return String(row.sku ?? "");
}
