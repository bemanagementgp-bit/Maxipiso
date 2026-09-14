import { getDelegate, type TableKey } from "@/lib/all-products";
import { primeraImagen } from "@/lib/imagenes";

/**
 * Variantes de producto: el mismo producto en otro color, otra medida.
 *
 * **Una variante ES un producto**, no un dato adentro de otro. Tiene su foto,
 * su precio, su stock, su SKU y su ficha, y se edita en el ABM como cualquier
 * otro. Lo único que se agrega es a qué grupo pertenece.
 *
 * Se eligió así y no un JSON con las opciones adentro del principal por una
 * razón concreta: **el catálogo ya tiene esos productos cargados por separado**.
 * Agruparlos es completar una columna; meterlos adentro de otro habría obligado
 * a borrar siete y recargar sus precios, fotos y medidas a mano.
 *
 * El grupo se arma con el **SKU del principal**, que es lo que la persona
 * conoce y escribe en la planilla. Un código de grupo generado habría que
 * buscarlo antes de poder cargar nada.
 *
 * El listado del catálogo muestra sólo los principales, así que el mismo piso
 * en ocho colores ocupa una card en vez de ocho; la ficha ofrece las ocho.
 */

export type Variante = {
  id: string;
  sku: string;
  etiqueta: string;
  imagen: string | null;
  /** La que se está viendo. */
  actual: boolean;
};

/** El SKU del principal del grupo, o `null` si esta fila ES la principal. */
export function skuDelPrincipal(fila: Record<string, unknown>): string | null {
  const valor = String(fila.varianteDe ?? "").trim();
  return valor || null;
}

/**
 * Cómo se llama una variante en el selector.
 *
 * Si nadie le puso etiqueta cae al nombre del producto: es peor que un rótulo
 * corto, pero muchísimo mejor que un botón en blanco.
 */
export function etiquetaDe(fila: Record<string, unknown>): string {
  const etiqueta = String(fila.varianteEtiqueta ?? "").trim();
  if (etiqueta) return etiqueta;
  const nombre = String(fila.nombre ?? fila.especie ?? "").trim();
  return nombre || String(fila.sku ?? "");
}

/**
 * Todas las variantes del grupo al que pertenece un producto, el principal
 * incluido y en primer lugar.
 *
 * Devuelve lista vacía cuando el producto no tiene hermanos: la ficha no
 * dibuja el selector para un producto que no es parte de ningún grupo.
 *
 * Son dos consultas sobre la misma tabla —el principal y sus variantes— y no
 * ocho como los complementarios: una variante siempre está en la tabla de su
 * principal, porque un piso flotante no es variante de un porcelanato.
 */
export async function variantesDelGrupo(
  tabla: TableKey,
  fila: Record<string, unknown>,
): Promise<Variante[]> {
  const idActual = String(fila.id ?? "");
  const skuPropio = String(fila.sku ?? "").trim();
  const skuPrincipal = skuDelPrincipal(fila) ?? skuPropio;
  if (!skuPrincipal) return [];

  const delegate = getDelegate(tabla);
  const [principal, hermanas] = await Promise.all([
    // Si la fila abierta YA es la principal no hace falta ir a buscarla.
    skuPrincipal === skuPropio
      ? Promise.resolve(fila)
      : delegate.findUnique({ where: { sku: skuPrincipal } }).catch(() => null),
    delegate
      .findMany({ where: { varianteDe: skuPrincipal, isActive: true } })
      .catch((err: unknown) => {
        // Un grupo que no se pudo leer deja la ficha sin selector, no sin ficha.
        console.error("[variantes] no se pudieron leer las del grupo:", err);
        return [];
      }),
  ]);

  const filas = [principal, ...(hermanas as Record<string, unknown>[])].filter(
    (f): f is Record<string, unknown> => Boolean(f),
  );
  // Una sola fila no es un grupo: es un producto suelto.
  if (filas.length < 2) return [];

  const vistos = new Set<string>();
  const variantes: Variante[] = [];
  for (const f of filas) {
    const id = String(f.id ?? "");
    if (!id || vistos.has(id)) continue;
    // El principal desactivado no se muestra, pero su grupo sigue en pie.
    if (id !== idActual && f.isActive === false) continue;
    vistos.add(id);
    variantes.push({
      id,
      sku: String(f.sku ?? ""),
      etiqueta: etiquetaDe(f),
      imagen: primeraImagen(f.imagenes),
      actual: id === idActual,
    });
  }
  return variantes.length >= 2 ? variantes : [];
}
