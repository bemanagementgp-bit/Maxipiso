/**
 * Hosts remotos permitidos para imágenes.
 *
 * Es la única fuente de verdad: la consume `next.config.ts` para armar
 * `images.remotePatterns` y el panel para validar una URL antes de guardarla.
 * Si estuviera duplicado, el admin podría guardar una URL que después
 * `next/image` rechaza en runtime y el catálogo mostraría el placeholder.
 *
 * Agregar un host acá implica que Next lo va a optimizar y servir: solo hosts
 * de confianza.
 */
export const ALLOWED_IMAGE_HOSTS = [
  // Destino de los uploads del panel (ver lib/storage.ts).
  "res.cloudinary.com",
  "maxipiso.com.ar",
  "cdn.shopify.com",
  "images.unsplash.com",
  "cdnjs.cloudflare.com",
] as const;

/**
 * Valida una referencia de imagen tal como se guarda en el campo `imagenes`.
 *
 * Se aceptan dos formas:
 *  - ruta relativa servida desde `public/` o desde el storage local (`/foo.jpg`)
 *  - URL https de un host de la lista
 */
export function validateImageRef(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Ingresá una URL o una ruta" };

  // Ruta relativa: sirve para los archivos de public/ y de uploads/
  if (value.startsWith("/")) {
    if (value.startsWith("//")) return { ok: false, error: "Ruta inválida" };
    return { ok: true, url: value };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "No es una URL válida. Usá https://… o una ruta /imagen.jpg" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Solo se aceptan URLs https" };
  }

  if (!(ALLOWED_IMAGE_HOSTS as readonly string[]).includes(parsed.hostname)) {
    return {
      ok: false,
      error: `Host no permitido. Habilitados: ${ALLOWED_IMAGE_HOSTS.join(", ")}`,
    };
  }

  return { ok: true, url: parsed.toString() };
}
