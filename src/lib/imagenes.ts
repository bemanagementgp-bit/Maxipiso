/**
 * Lectura de la columna `imagenes`.
 *
 * El valor guardado puede tener tres formas, porque llega por tres caminos:
 *  - Un JSON array, que es lo que escribe el ABM.
 *  - Una lista separada por `|`, `;` o `,`, que es como se carga por planilla.
 *  - Una sola URL suelta, de las cargas viejas.
 *
 * Esto vivia copiado en cinco archivos —la card, la ficha, la grilla del panel,
 * el selector de complementarios y `all-products`— y ninguna copia aceptaba el
 * `|`, que es el separador que la plantilla de importacion dice usar. Una sola
 * funcion, y el que carga una planilla obtiene lo que la plantilla le prometio.
 *
 * El `|` va primero en la expresion porque es el unico que no puede aparecer
 * dentro de una URL: la coma si aparece en las transformaciones de Cloudinary
 * (`f_auto,q_auto,w_384`), asi que se acepta por compatibilidad pero no es el
 * separador que recomendamos.
 */

const SEPARADORES = /[|;,]/;

export function parseImagenes(valor: unknown): string[] {
  const texto = String(valor ?? "").trim();
  if (!texto) return [];

  let partes: string[];
  if (texto.startsWith("[")) {
    try {
      const parsed = JSON.parse(texto);
      // Solo las cadenas. Con `map(String)` un `null` dentro del array —que
      // aparece cuando se borra una foto del medio— se volvia la cadena "null"
      // y terminaba pedida como `/null`: un 404 en la card, sin error visible
      // en ningun lado.
      partes = Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : typeof parsed === "string"
          ? [parsed]
          : [];
    } catch {
      partes = [];
    }
  } else {
    partes = texto.split(SEPARADORES);
  }

  return partes
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/") ? s : `/${s}`));
}

/** La portada: la primera de la lista. `null` si no hay ninguna. */
export function primeraImagen(valor: unknown): string | null {
  return parseImagenes(valor)[0] ?? null;
}

/**
 * Como se escriben las imagenes en la planilla de exportacion.
 *
 * Con ` | ` y no como JSON: el archivo se abre en Excel y tiene que poder
 * editarse a mano. Vuelve a entrar por `parseImagenes()` sin perder nada.
 */
export function imagenesParaPlanilla(valor: unknown): string {
  return parseImagenes(valor).join(" | ");
}
