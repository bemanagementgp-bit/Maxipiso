import { OPCIONES_FIJAS } from "@/lib/opciones-fijas";

/**
 * Deduce el tono de un producto a partir de como se llama.
 *
 * Es para completar de una vez los productos que ya estan cargados, que son
 * miles y tienen el tono en el nombre ("Roble Gris", "Nogal Chocolate") pero no
 * en la columna.
 *
 * **Es una adivinanza y se trata como tal**: se aplica solo donde el tono esta
 * vacio, nunca pisa lo cargado a mano, y el panel muestra que va a hacer antes
 * de hacerlo.
 *
 * NO se mapean especies de madera. "Roble" puede ser claro u oscuro segun el
 * acabado, y "Nogal" igual: usarlos como pista daria un catalogo lleno de tonos
 * plausibles y equivocados, que es peor que la columna vacia. Solo entran
 * palabras que nombran un color.
 */

type Regla = { tono: string; palabras: string[] };

/**
 * El orden importa: se prueba de arriba hacia abajo y gana la primera.
 *
 * Los compuestos van antes que los simples —"gris oscuro" antes que "gris"— o
 * "Roble Gris Oscuro" caeria en Gris.
 *
 * Van las dos formas de genero. En castellano el adjetivo concuerda, y el
 * catalogo tiene tanto "Roble Negro" como "Pizarra Negra": con una sola forma,
 * la mitad de los productos no se detectaba.
 */
const REGLAS: Regla[] = [
  { tono: "Gris Oscuro",   palabras: ["gris oscuro", "grafito", "antracita", "anthracite", "dark grey", "dark gray", "plomo"] },
  { tono: "Marrón Oscuro", palabras: ["marron oscuro", "marrona oscura", "wengue", "wenge", "chocolate", "tabaco", "mocha", "moka", "dark brown", "cafe"] },
  { tono: "Blanco",        palabras: ["blanco", "blanca", "white", "nieve", "polar", "artico", "artica"] },
  { tono: "Negro",         palabras: ["negro", "negra", "black", "ebano", "onix"] },
  { tono: "Rojizo",        palabras: ["rojizo", "rojiza", "rojo", "roja", "cerezo", "cherry", "caoba", "mahogany", "terracota", "cobre", "copper", "ladrillo"] },
  { tono: "Cremas",        palabras: ["crema", "cream", "marfil", "ivory", "vainilla", "hueso"] },
  { tono: "Beige",         palabras: ["beige", "arena", "sand", "trigo", "champagne", "champan"] },
  { tono: "Gris",          palabras: ["gris", "grey", "gray", "cemento", "concrete", "perla", "plata", "silver", "humo", "smoke"] },
  { tono: "Marrón",        palabras: ["marron", "marrona", "brown", "miel", "honey", "caramelo", "cognac", "castano", "castana", "avellana", "terra"] },
];

/** Sin acentos y en minuscula: "Marrón Oscuro" tiene que encontrar "marron oscuro". */
function clave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Campos donde se busca, en orden de confianza.
 *
 * El nombre primero porque es donde el color esta puesto a proposito. La
 * descripcion al final: puede mencionar un color de pasada ("combina con
 * muebles blancos") y por eso pesa menos, pero en muchos productos es el unico
 * lugar donde figura.
 */
export const CAMPOS_MIRADOS = ["nombre", "linea", "categoriaTerciaria", "acabado", "descripcion"] as const;

export function detectarTono(fila: Record<string, unknown>): string | null {
  for (const campo of CAMPOS_MIRADOS) {
    const texto = clave(String(fila[campo] ?? ""));
    if (!texto) continue;
    for (const regla of REGLAS) {
      // Con limites de palabra: "arena" no puede salir de "Serena", y "terra"
      // no de "Mediterraneo".
      if (regla.palabras.some((p) => new RegExp(`\\b${p}\\b`).test(texto))) {
        return regla.tono;
      }
    }
  }
  return null;
}

/** Los tonos que puede devolver son exactamente los de la lista del ABM. */
export function tonosValidos(): string[] {
  return OPCIONES_FIJAS.tono ?? [];
}
