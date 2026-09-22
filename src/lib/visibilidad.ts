import { primeraImagen } from "@/lib/imagenes";

/**
 * Por que un producto cargado no aparece en el catalogo.
 *
 * El catalogo dibuja una card por grupo de variantes, y la card es la del
 * principal: `where` pide `isActive`, `imagenes` no vacio y `varianteDe` vacio
 * (ver `api/catalogo/todos`). De ahi salen los cuatro motivos, y los dos
 * grupos en que se parten.
 *
 * **El grupo apunta a la nada.** Se arregla solo, vaciando la columna:
 *  - `se-apunta-a-si-mismo`: un producto no puede ser su propia variante. La
 *    fila no sale como card porque se la toma por variante, y no sale dentro
 *    de ningun grupo porque el grupo es ella misma.
 *  - `principal-inexistente`: el SKU del principal no existe en esa tabla. Un
 *    error de tipeo en la planilla, o el principal se borro despues.
 *
 * En los dos casos la unica lectura posible es "este producto no es variante
 * de nada", asi que la reparacion es obvia y no pierde informacion.
 *
 * **El grupo esta bien pero la puerta esta cerrada.** No se arregla solo:
 *  - `principal-apagado`: el principal existe y esta en Inactivo. Las
 *    variantes no salen como card —es lo correcto— y el principal tampoco,
 *    asi que el grupo entero desaparece del catalogo.
 *  - `principal-sin-foto`: igual, pero al principal le falta la imagen.
 *
 * Estos dos no se tocan solos porque el grupo esta bien armado: lo que falta
 * es prender el principal o darle una foto, y eso es una decision de catalogo.
 * Desvincular las variantes "arreglaria" el sintoma rompiendo el grupo.
 *
 *  - `sin-boton-que-lleve`: el principal se ve, pero el selector de la ficha
 *    no tiene ningun boton que lleve a esta variante. Pasa cuando la fila
 *    quedo sin opciones, cuando todas las hermanas dicen lo mismo —siete
 *    niveladores cargados como "Color: Plata" dan un eje de un solo valor, y
 *    un eje de un solo valor no se dibuja— o cuando dos filas repiten la
 *    misma combinacion. Se arregla escribiendo el valor que de verdad las
 *    distingue en la columna de opciones. Ver `variantesInalcanzables`.
 *
 * Vive aparte de la ruta para poder probarlo sin base.
 */

export type MotivoInvisible =
  | "se-apunta-a-si-mismo"
  | "principal-inexistente"
  | "principal-apagado"
  | "principal-sin-foto"
  | "sin-boton-que-lleve";

export type FilaVisibilidad = {
  id: string;
  sku: string;
  nombre: string;
  isActive: boolean;
  imagenes: unknown;
};

/** Los motivos que el boton "Devolverlos al catalogo" puede reparar. */
export const SE_ARREGLA_SOLO: ReadonlySet<MotivoInvisible> = new Set<MotivoInvisible>([
  "se-apunta-a-si-mismo",
  "principal-inexistente",
]);

export const TEXTO_MOTIVO: Record<MotivoInvisible, string> = {
  "se-apunta-a-si-mismo": "se declara variante de sí mismo",
  "principal-inexistente": "apunta a un SKU que no existe",
  "principal-apagado": "su producto principal está inactivo",
  "principal-sin-foto": "su producto principal no tiene foto",
  "sin-boton-que-lleve": "ningún botón de la ficha lleva a ella",
};

/**
 * El motivo por el que esta fila no se ve, o `null` si se ve bien.
 *
 * `principal` es la fila cuyo SKU figura en `varianteDe`, o `null` si no
 * existe en esa tabla.
 */
export function motivoDeInvisibilidad(
  fila: FilaVisibilidad,
  varianteDe: string,
  principal: FilaVisibilidad | null,
): MotivoInvisible | null {
  const apunta = varianteDe.trim().toLowerCase();
  if (!apunta) return null;

  if (apunta === fila.sku.trim().toLowerCase()) return "se-apunta-a-si-mismo";
  if (!principal) return "principal-inexistente";

  // El grupo existe. Que la variante no salga como card es correcto: se ve
  // entrando al principal. Solo es un problema si el principal tampoco sale, y
  // solo vale la pena avisarlo si esta fila se veria de no ser por eso. Una
  // variante apagada o sin foto no la esconde el grupo, la esconde ella misma,
  // y para eso ya estan el filtro "Inactivos" y el "Sin imagen" del panel.
  if (!fila.isActive || !primeraImagen(fila.imagenes)) return null;

  if (!principal.isActive) return "principal-apagado";
  if (!primeraImagen(principal.imagenes)) return "principal-sin-foto";
  return null;
}
