/**
 * Links a documentos del producto: garantía, ficha técnica e instalación.
 *
 * Son columnas de texto libre —las carga el panel y también llegan por la
 * importación de planillas—, así que lo que hay guardado va desde una URL
 * completa hasta "www.krono.com/ficha.pdf" o una celda con espacios. Todo pasa
 * por `normalizarLinkDoc()` antes de convertirse en un `href`: un link roto en
 * la ficha es peor que no mostrar nada.
 */

/** Los tres campos, en el orden en que se muestran en la ficha. */
export const CAMPOS_DOC = [
  { key: "archivoInstalacion", label: "Instalación" },
  { key: "fichaTecnica", label: "Ficha Técnica" },
  { key: "garantia", label: "Garantía" },
] as const;

export type CampoDoc = (typeof CAMPOS_DOC)[number]["key"];

/**
 * Devuelve un href usable, o `null` si lo guardado no es un link.
 *
 * - Se aceptan sólo `http` y `https`. Nada de `javascript:` ni `data:`: el
 *   valor viene de una planilla y termina en un `href` que el cliente clickea.
 * - Sin esquema pero con pinta de dominio (`www.x.com/f.pdf`) se asume https:
 *   es lo que alguien escribe cuando copia un link de la barra del navegador.
 * - Una ruta relativa (`/fichas/x.pdf`) sirve un archivo propio y se respeta.
 * - Cualquier otra cosa —un número de garantía, "12 meses", una nota— devuelve
 *   `null`, que es exactamente lo que hay que hacer: ese campo no es un link.
 */
export function normalizarLinkDoc(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  if (texto.startsWith("//")) return null;
  if (texto.startsWith("/")) return texto;

  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Sin punto en el host no es un dominio: es texto que quedó en la columna.
  if (!url.hostname.includes(".")) return null;

  return url.toString();
}

/** `true` si el valor guardado se puede abrir como link. */
export function esLinkDoc(valor: unknown): boolean {
  return normalizarLinkDoc(valor) !== null;
}
