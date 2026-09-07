/**
 * Stickers: etiquetas que se dibujan encima de la foto de portada del producto.
 *
 * Este archivo es el contrato compartido entre el panel (donde se crean y se
 * eligen) y el catálogo (donde se muestran). Todo lo que sea "qué forma tiene un
 * sticker" vive acá y no duplicado en cada lado.
 */

export type PosicionSticker = "arriba-izq" | "arriba-der" | "abajo-izq" | "abajo-der";

export const POSICIONES: { value: PosicionSticker; label: string }[] = [
  { value: "arriba-izq", label: "Arriba a la izquierda" },
  { value: "arriba-der", label: "Arriba a la derecha" },
  { value: "abajo-izq", label: "Abajo a la izquierda" },
  { value: "abajo-der", label: "Abajo a la derecha" },
];

const POSICIONES_VALIDAS = new Set<string>(POSICIONES.map((p) => p.value));

export type TipoSticker = "imagen" | "texto";

export type Sticker = {
  id: string;
  nombre: string;
  tipo: TipoSticker;
  imagenUrl: string | null;
  texto: string | null;
  colorFondo: string | null;
  colorTexto: string | null;
  posicion: PosicionSticker;
  orden: number;
  isActive: boolean;
};

/** Colores por defecto de una etiqueta de texto, si no se eligen. */
export const COLOR_FONDO_DEFECTO = "#DF8635";
export const COLOR_TEXTO_DEFECTO = "#FFFFFF";

export function esPosicionValida(valor: unknown): valor is PosicionSticker {
  return typeof valor === "string" && POSICIONES_VALIDAS.has(valor);
}

/**
 * Normaliza una fila de la tabla al tipo público.
 *
 * Prisma devuelve `tipo` y `posicion` como `string` sueltos: acá se acotan a los
 * valores que el resto del código sabe manejar, para que un dato viejo o
 * cargado a mano no rompa el render.
 */
export function normalizarSticker(row: Record<string, unknown>): Sticker {
  const tipo: TipoSticker = row.tipo === "imagen" ? "imagen" : "texto";
  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ""),
    tipo,
    imagenUrl: (row.imagenUrl as string | null) ?? null,
    texto: (row.texto as string | null) ?? null,
    colorFondo: (row.colorFondo as string | null) ?? null,
    colorTexto: (row.colorTexto as string | null) ?? null,
    posicion: esPosicionValida(row.posicion) ? row.posicion : "arriba-izq",
    orden: Number(row.orden ?? 0),
    isActive: row.isActive !== false,
  };
}

/**
 * Lee la columna `stickers` de un producto.
 *
 * Es un JSON array de ids, igual que `imagenes` es un JSON array de URLs.
 * Tolera null, vacío y basura: un producto sin stickers es el caso normal, no
 * un error.
 */
export function parseStickerIds(valor: unknown): string[] {
  if (typeof valor !== "string" || !valor.trim()) return [];
  try {
    const arr = JSON.parse(valor);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && !!x) : [];
  } catch {
    return [];
  }
}

/**
 * Resuelve los ids de un producto contra el catálogo de stickers.
 *
 * Descarta los que ya no existen o fueron desactivados —borrar un sticker no
 * puede dejar productos rotos— y respeta el orden en que fueron elegidos.
 */
export function resolverStickers(ids: string[], catalogo: Map<string, Sticker>): Sticker[] {
  const vistos = new Set<string>();
  const resueltos: Sticker[] = [];
  for (const id of ids) {
    if (vistos.has(id)) continue;
    vistos.add(id);
    const sticker = catalogo.get(id);
    if (sticker && sticker.isActive) resueltos.push(sticker);
  }
  return resueltos;
}

/** Agrupa por esquina, respetando `orden` dentro de cada una. */
export function agruparPorPosicion(stickers: Sticker[]): Record<PosicionSticker, Sticker[]> {
  const grupos: Record<PosicionSticker, Sticker[]> = {
    "arriba-izq": [],
    "arriba-der": [],
    "abajo-izq": [],
    "abajo-der": [],
  };
  for (const s of stickers) grupos[s.posicion].push(s);
  for (const clave of Object.keys(grupos) as PosicionSticker[]) {
    grupos[clave].sort((a, b) => a.orden - b.orden);
  }
  return grupos;
}
