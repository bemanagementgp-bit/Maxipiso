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

export const OPCIONES_FIJAS: Record<string, string[]> = {
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
