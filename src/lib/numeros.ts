/**
 * Como se tipea y como se muestra un importe en el panel.
 *
 * Vivia dentro de `PriceGrid`, que fue donde aparecio el problema: un input
 * cuyo `value` sale de parsear lo tipeado **no deja escribir decimales**.
 * Tipear "1180," pasa por `Number("1180.")` = 1180, el input se redibuja como
 * "1180" y la coma desaparece en el momento de escribirla. Se siente como que
 * el teclado no toma la coma, y es imposible de adivinar mirando la pantalla.
 *
 * La salida es la misma en los dos lados: se guarda un borrador con el texto
 * crudo mientras la celda esta enfocada, y recien al salir se parsea. Por eso
 * estas dos funciones viven aca y no en un componente: la grilla de precios y
 * el editor de variantes tienen que coincidir en que es un numero valido.
 */

/**
 * Parsea lo que se tipea en una celda.
 *
 * Se aceptan las dos convenciones porque en la practica se pega texto de
 * planillas: "14372,45" y "14372.45" son lo mismo. Con ambos separadores
 * presentes ("1.234,56") el punto es de miles.
 */
export function parsearNumero(texto: string): number | null | "invalido" {
  const limpio = texto.trim().replace(/\s/g, "");
  if (limpio === "") return null;

  let normalizado = limpio;
  if (limpio.includes(",") && limpio.includes(".")) {
    normalizado = limpio.replace(/\./g, "").replace(",", ".");
  } else if (limpio.includes(",")) {
    normalizado = limpio.replace(",", ".");
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) return "invalido";
  return n;
}

/** Como se muestra un importe dentro del input: coma decimal, sin miles. */
export function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 100) / 100).replace(".", ",");
}
