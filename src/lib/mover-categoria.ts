/**
 * Mover un producto de una categoria a otra.
 *
 * Las 8 categorias son 8 tablas, asi que "cambiar la categoria" no es editar
 * un campo: es crear la fila en la tabla destino y borrarla de la de origen.
 * Por eso no alcanzaba con desbloquear el desplegable del editor.
 *
 * **El id se conserva.** Es lo que hace que la mudanza no rompa nada
 * alrededor: la URL publica del producto (`/catalogo/<id>`) sigue andando, los
 * otros productos que lo tienen como complementario lo siguen encontrando, y
 * el historial de cambios queda colgado del mismo id. Con un id nuevo habria
 * que salir a reescribir los tres, y cualquiera que se escape queda roto sin
 * avisar. Nada lo impide: el id es la clave primaria de cada tabla por
 * separado, y el producto existe en una sola a la vez.
 *
 * **Que se conserva.** Las 8 tablas comparten 17 columnas -sku, nombre, fotos,
 * stickers, complementarios, descripcion, stock, moneda, unidad, orden, fecha
 * de alta- asi que lo que define al producto viaja entero. Lo que puede
 * perderse son las especificaciones propias de la categoria vieja: la abrasion
 * de un piso flotante no existe en accesorios. Eso **se dice antes de mover**,
 * con nombre y valor, y no se descubre despues.
 */

export type PlanDeMudanza = {
  /** Lo que se escribe en la tabla destino. */
  data: Record<string, unknown>;
  /** Campos con valor que la categoria destino no tiene. Se avisan antes. */
  sePierden: { key: string; valor: string }[];
  /** El precio cambio de columna: `precioM2` no existe en accesorios. */
  precioMovido: { desde: string; hasta: string } | null;
  /** Estaba en un grupo de variantes y sale de el. Ver abajo. */
  salioDelGrupo: boolean;
};

/**
 * Las pone Prisma y no se copian: `updatedAt` tiene que marcar la mudanza, y
 * `createdAt` viaja aparte porque queremos conservar la fecha de alta real.
 */
const NO_SE_COPIAN = new Set(["updatedAt"]);

/**
 * El grupo de variantes se arma con el SKU del principal **dentro de la misma
 * tabla**, asi que al cambiar de categoria el vinculo deja de significar algo:
 * apuntaria a un SKU que en la tabla nueva no existe, y eso es exactamente lo
 * que deja un producto invisible (ver `lib/visibilidad`). Sale del grupo.
 */
const DEL_GRUPO = ["varianteDe", "varianteOpciones"];

const vacio = (v: unknown) => v === null || v === undefined || v === "";

export function planearMudanza(
  fila: Record<string, unknown>,
  columnasDestino: Set<string>,
  { precioOrigen = null, precioDestino = null }: { precioOrigen?: string | null; precioDestino?: string | null } = {},
): PlanDeMudanza {
  const data: Record<string, unknown> = {};
  const sePierden: { key: string; valor: string }[] = [];
  let precioMovido: PlanDeMudanza["precioMovido"] = null;
  let salioDelGrupo = false;

  for (const [key, valor] of Object.entries(fila)) {
    if (NO_SE_COPIAN.has(key)) continue;

    if (DEL_GRUPO.includes(key)) {
      if (!vacio(valor)) salioDelGrupo = true;
      continue;
    }

    if (columnasDestino.has(key)) {
      data[key] = valor;
      continue;
    }

    if (vacio(valor)) continue;

    // La columna de precio se llama distinto en cada tabla —`precioM2` en los
    // pisos, `precio` en accesorios— y perder el precio en una mudanza es la
    // clase de cosa que se descubre cuando alguien cotiza mal.
    if (key === precioOrigen && precioDestino && columnasDestino.has(precioDestino)) {
      data[precioDestino] = valor;
      precioMovido = { desde: key, hasta: precioDestino };
      continue;
    }

    sePierden.push({ key, valor: String(valor) });
  }

  // Sale del grupo explicitamente y no por omision: la fila destino es nueva,
  // pero dejarlo escrito evita que un default futuro lo resucite.
  for (const key of DEL_GRUPO) {
    if (columnasDestino.has(key)) data[key] = null;
  }

  return { data, sePierden, precioMovido, salioDelGrupo };
}
