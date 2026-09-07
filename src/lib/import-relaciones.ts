import { prisma } from "@/lib/prisma";
import { TABLE_KEYS, getDelegate, type TableKey } from "@/lib/all-products";

/**
 * Stickers y complementarios en la planilla de importacion.
 *
 * En la base los dos son arrays de ids, pero **nadie va a tipear un cuid en un
 * Excel**. En la planilla se escribe lo que la persona ya conoce:
 *
 *   Stickers          Oferta | Waterproof | Bandera de Alemania
 *   Complementarios   ZOC-001 | PERF-220
 *
 * o sea el **nombre** del sticker y el **SKU** del producto. Aca se traduce eso
 * a ids. Lo que no se encuentra se avisa y se descarta: una fila con un sticker
 * mal escrito tiene que entrar igual, sin ese sticker, y no romper la
 * importacion entera.
 */

/** `|`, `,` o `;`: los tres separadores que alguien usaria en una celda. */
const SEPARADOR = /[|;,]/;

export function partirLista(valor: unknown): string[] {
  const texto = String(valor ?? "").trim();
  if (!texto) return [];
  return [...new Set(texto.split(SEPARADOR).map((s) => s.trim()).filter(Boolean))];
}

/** Sin acentos, sin mayusculas, sin espacios de mas: "Más Vendido" == "mas vendido". */
function clave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type Resolucion = {
  /** Ids encontrados, en el orden en que venian en la celda. */
  ids: string[];
  /** Lo que no se pudo resolver, tal cual estaba escrito. */
  noEncontrados: string[];
};

/**
 * Nombres de stickers → ids, como mapa para poder resolver por valor.
 *
 * Se acepta tambien el texto de la etiqueta ("OFERTA" ademas de "Oferta"),
 * porque es lo que se ve en la foto y es lo que alguien va a copiar.
 */
export async function mapaDeStickers(): Promise<Map<string, string>> {
  const filas = await prisma.sticker
    .findMany({ select: { id: true, nombre: true, texto: true } })
    .catch(() => []);

  const mapa = new Map<string, string>();
  for (const f of filas) {
    mapa.set(clave(f.nombre), f.id);
    // El nombre gana: si un sticker se llama igual que el texto de otro, el
    // nombre es lo que se muestra en el panel y es la referencia.
    if (f.texto && !mapa.has(clave(f.texto))) mapa.set(clave(f.texto), f.id);
  }
  return mapa;
}

/**
 * SKUs → ids de producto, buscando en las 8 tablas.
 *
 * Un complementario puede ser de cualquier categoria, asi que no alcanza con
 * mirar la tabla de la fila. Se consultan las 8 en paralelo con un `in`.
 *
 * Si un SKU existe en dos tablas gana la primera de `TABLE_KEYS`. Es un caso
 * que no deberia pasar —el SKU identifica al producto en el negocio— y elegir
 * uno es mejor que descartar los dos.
 */
export async function resolverProductosPorSku(skus: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (skus.length === 0) return mapa;

  const porTabla = await Promise.all(
    TABLE_KEYS.map(async (key: TableKey) => {
      const filas = await getDelegate(key)
        .findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } })
        .catch(() => []);
      return filas as { id: string; sku: string }[];
    }),
  );

  for (const filas of porTabla) {
    for (const f of filas) {
      const k = clave(f.sku);
      if (!mapa.has(k)) mapa.set(k, f.id);
    }
  }
  return mapa;
}

export function resolverConMapa(valores: string[], mapa: Map<string, string>): Resolucion {
  const ids: string[] = [];
  const noEncontrados: string[] = [];
  for (const v of valores) {
    const id = mapa.get(clave(v));
    if (id) { if (!ids.includes(id)) ids.push(id); }
    else noEncontrados.push(v);
  }
  return { ids, noEncontrados };
}
