import { sanitizeText } from "@/lib/security";
import { validateImageRef } from "@/lib/image-hosts";

/**
 * Las 8 cards de "Nuestras líneas de productos" del home.
 *
 * Viven en la base (`lineas_home`) para que la portada se cambie desde el panel
 * y no editando código: es lo que más rota del sitio.
 *
 * El `slug` es la clave y no se toca desde el panel — ancla la fila con la
 * categoría del catálogo (`/catalogo?categoria=<slug>`) y con el ícono, que es
 * un componente de React y por eso sigue viviendo en el código. Editable: la
 * foto, el rótulo, el orden y si se muestra o no.
 */

export type LineaHome = {
  slug: string;
  label: string;
  imagenUrl: string;
  orden: number;
  isActive: boolean;
};

/** El link de la card. La categoría del catálogo ES el slug. */
export function hrefDeLinea(slug: string): string {
  return `/catalogo?categoria=${slug}`;
}

/**
 * Lo mismo que siembra la migración.
 *
 * Es el fallback si la consulta falla o si la tabla todavía no existe en ese
 * entorno: preferimos un home con las portadas de siempre antes que un home sin
 * catálogo.
 */
export const LINEAS_DEFECTO: LineaHome[] = [
  { slug: "pisos-flotantes", label: "Pisos Laminados", imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/laminados-portada_s4ialn.png",     orden: 0, isActive: true },
  { slug: "pisos-vinilicos", label: "Pisos Vinílicos", imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/vinilico-portada_jtwqrp.png",      orden: 1, isActive: true },
  { slug: "porcellanatos",   label: "Porcelanatos",    imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784517/porcelanato-portada_vfp0ml.png",   orden: 2, isActive: true },
  { slug: "pisos-madera",    label: "Pisos de Madera", imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/pisos-madera-portada_skuv8k.png",  orden: 3, isActive: true },
  { slug: "decks",           label: "Deck",            imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784519/deck-portada_cah2hc.png",          orden: 4, isActive: true },
  { slug: "revestimientos",  label: "Revestimientos",  imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784475/revestimientos-portada_ou8yse.png", orden: 5, isActive: true },
  { slug: "maderas",         label: "Maderas",         imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784518/maderas-portada_ynx4dp.png",       orden: 6, isActive: true },
  { slug: "accesorios",      label: "Accesorios",      imagenUrl: "https://res.cloudinary.com/dnaom2evd/image/upload/v1788784475/accesorios-portada_pfjckc.png",    orden: 7, isActive: true },
];

/** Los únicos slugs válidos: los que tienen ícono y categoría en el catálogo. */
export const SLUGS_VALIDOS: readonly string[] = LINEAS_DEFECTO.map((l) => l.slug);

export function normalizarLinea(fila: Record<string, unknown>): LineaHome {
  return {
    slug: String(fila.slug ?? ""),
    label: String(fila.label ?? ""),
    imagenUrl: String(fila.imagenUrl ?? ""),
    orden: Number(fila.orden ?? 0),
    isActive: fila.isActive !== false,
  };
}

/**
 * Valida lo que manda el panel.
 *
 * Devuelve el error como texto en vez de lanzar, para poder responder 400 con
 * un mensaje que diga qué corregir. El slug NO se acepta del cuerpo: viene de
 * la URL de la ruta y se chequea contra la lista fija.
 */
export function validarLinea(
  raw: Record<string, unknown>,
): { data: { label: string; imagenUrl: string; orden: number; isActive: boolean } } | { error: string } {
  const label = sanitizeText(raw.label, 40);
  if (!label) return { error: "El rótulo es obligatorio" };

  const ref = validateImageRef(String(raw.imagenUrl ?? ""));
  // Misma lista de hosts que el resto de las imágenes del sitio: una portada no
  // merece una puerta propia.
  if (!ref.ok) return { error: `Imagen inválida: ${ref.error}` };

  const ordenCrudo = Number(raw.orden);
  const orden = Number.isFinite(ordenCrudo) ? Math.max(0, Math.min(99, Math.round(ordenCrudo))) : 0;

  return { data: { label, imagenUrl: ref.url, orden, isActive: raw.isActive !== false } };
}
