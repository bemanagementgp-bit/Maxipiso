import { UNIDADES } from "@/lib/unidad-precio";

/**
 * Listas cerradas que ofrece el ABM para algunos campos.
 *
 * El resto de los campos de texto se autocompletan con lo que ya hay cargado
 * (`/api/productos/valores`), que sirve para no repetir pero deja entrar
 * variantes del mismo valor: "Gris", "gris", "Gris claro". En los campos donde
 * el negocio tiene una lista acordada, la lista manda.
 *
 * Siguen siendo un `Combobox` y no un `<select>`: se puede escribir un valor
 * que no esté, porque el catálogo cambia antes que esta lista. Lo que se gana
 * es que el valor de siempre esté a un click y escrito igual todas las veces —
 * y eso importa de verdad, porque **los filtros del catálogo se arman con los
 * valores distintos que hay cargados**: "Gris" y "gris" serían dos opciones
 * distintas en el filtro.
 */

/**
 * Las categorías del catálogo, tal como las nombra el sitio.
 *
 * Es la lista que ofrece "Compatible con": un zócalo sirve para pisos
 * flotantes y vinílicos, y decirlo con las mismas palabras que usan los
 * botones del catálogo es lo que permite que el filtro funcione. Escrito a
 * mano una vez más sería "Pisos flotantes" acá y "Pisos Flotantes" allá: dos
 * opciones distintas en el filtro para la misma cosa.
 */
export const CATEGORIAS_DEL_CATALOGO = [
  "Pisos Flotantes",
  "Porcelanatos",
  "Revestimientos",
  "Pisos Vinílicos",
  "Pisos Madera",
  "Decks",
  "Maderas",
  "Accesorios",
] as const;

/**
 * Campos que guardan varios valores en una celda, separados por ` | `.
 *
 * El catálogo los parte para armar el filtro, así que un accesorio cargado
 * como "Pisos Flotantes | Pisos Vinílicos" aparece bajo los dos. Con una sola
 * cadena —"Pisos flotantes y vinílicos"— el filtro ofrecía esa frase entera
 * como opción y no matcheaba con ninguna de las dos categorías.
 */
export const SEPARADOR_MULTIPLE = " | ";
export const CAMPOS_MULTIPLES = new Set(["compatibleCon", "espesoresDisponibles"]);

/** Los valores de una celda multivalor, sin vacíos ni repetidos. */
export function partirMultiple(valor: unknown): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const parte of String(valor ?? "").split("|")) {
    const limpio = parte.trim();
    if (!limpio || vistos.has(limpio.toLowerCase())) continue;
    vistos.add(limpio.toLowerCase());
    salida.push(limpio);
  }
  return salida;
}

/** Los vuelve a juntar como se guardan. */
export function unirMultiple(valores: string[]): string {
  return partirMultiple(valores.join("|")).join(SEPARADOR_MULTIPLE);
}

export const OPCIONES_FIJAS: Record<string, string[]> = {
  compatibleCon: [...CATEGORIAS_DEL_CATALOGO],
  // Por qué unidad se cobra. Sigue siendo abierta —se puede escribir otra—
  // pero tenerla evita que el mismo rollo quede cargado como "rollo", "Rollo"
  // y "x rollo", que en la ficha se leen como tres cosas distintas.
  unidadMedida: [...UNIDADES],
  tono: [
    "Beige",
    "Blanco",
    "Cremas",
    "Gris",
    "Gris Oscuro",
    "Marrón",
    "Marrón Oscuro",
    "Negro",
    "Rojizo",
  ],
};

/**
 * Las opciones de un campo: la lista fija primero, y después lo que ya está
 * cargado y no figura en ella.
 *
 * No se descarta lo cargado: si un producto viejo dice "Arena", tiene que
 * seguir apareciendo o editarlo lo perdería sin avisar.
 */
export function opcionesDe(campo: string, cargados: string[] = []): string[] {
  const fijas = OPCIONES_FIJAS[campo];
  if (!fijas) return cargados;

  const yaEstan = new Set(fijas.map((v) => v.toLowerCase()));
  return [...fijas, ...cargados.filter((v) => !yaEstan.has(v.trim().toLowerCase()))];
}
