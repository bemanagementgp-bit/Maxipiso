import { sanitizeText } from "@/lib/security";
import { validateImageRef } from "@/lib/image-hosts";
import { ESCALA_DEFECTO, esEscalaValida, esPosicionValida } from "@/lib/stickers";

/**
 * Validacion de un sticker que llega del panel.
 *
 * Vive fuera de la ruta porque la comparten el alta y la edicion, y porque un
 * archivo `route.ts` de Next solo puede exportar los metodos HTTP.
 */

/** Un color CSS que aceptamos: hex de 3 o 6 dígitos. Nada más entra al style. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function limpiarColor(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  return HEX.test(texto) ? texto : null;
}

/**
 * Valida y normaliza lo que llega del panel.
 *
 * Devuelve el error como string en vez de lanzar, para poder responder 400 con
 * un mensaje que diga qué corregir.
 */
export function validarSticker(raw: Record<string, unknown>): { data: Record<string, unknown> } | { error: string } {
  const nombre = sanitizeText(raw.nombre, 60);
  if (!nombre) return { error: "El nombre es obligatorio" };

  const tipo = raw.tipo === "imagen" ? "imagen" : "texto";

  // Se guardan los dos lados, no solo el del tipo elegido. Un sticker se pasa a
  // texto para probar y se vuelve a imagen: si al pasar a texto se borraba la
  // URL, había que volver a subir el archivo. Se dibuja el que dice `tipo`.
  let imagenUrl: string | null = null;
  const urlCruda = String(raw.imagenUrl ?? "").trim();
  if (urlCruda) {
    const ref = validateImageRef(urlCruda);
    // Se valida contra la misma lista de hosts que el resto de las imágenes:
    // un sticker es una imagen más y no merece una puerta propia.
    if (!ref.ok) return { error: `Imagen inválida: ${ref.error}` };
    imagenUrl = ref.url;
  }

  const texto = sanitizeText(raw.texto, 30) || null;

  if (tipo === "imagen" && !imagenUrl) {
    return { error: "Subí la imagen del sticker, o cambiálo a etiqueta de texto" };
  }
  if (tipo === "texto" && !texto) {
    return { error: "El texto de la etiqueta es obligatorio" };
  }

  const posicion = esPosicionValida(raw.posicion) ? raw.posicion : "arriba-izq";
  const ordenCrudo = Number(raw.orden);
  const orden = Number.isFinite(ordenCrudo) ? Math.max(0, Math.min(999, Math.round(ordenCrudo))) : 0;

  const escalaCruda = Number(raw.escala);
  const escala = esEscalaValida(escalaCruda) ? escalaCruda : ESCALA_DEFECTO;

  return {
    data: {
      nombre,
      tipo,
      imagenUrl,
      texto,
      colorFondo: limpiarColor(raw.colorFondo),
      colorTexto: limpiarColor(raw.colorTexto),
      posicion,
      orden,
      escala,
      isActive: raw.isActive !== false,
    },
  };
}
