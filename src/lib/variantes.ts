import { sanitizeText } from "@/lib/security";
import { getDelegate, type TableKey } from "@/lib/all-products";
import { primeraImagen } from "@/lib/imagenes";

/**
 * Variantes de producto: el mismo producto en otro color, otra medida.
 *
 * **Una variante ES un producto**, no un dato adentro de otro. Tiene su foto,
 * su precio, su stock, su SKU y su ficha, y se edita como cualquier otro. Lo
 * único que se agrega es a qué grupo pertenece y en qué se diferencia:
 *
 *   varianteDe        SKU del principal del grupo. Vacío = es el principal.
 *   varianteOpciones  "Color: Roble ; Medidas: 120x20"
 *
 * Se eligió agrupar filas y no meter las opciones como JSON adentro del
 * principal porque **el catálogo ya tiene esos productos cargados por
 * separado** — ése es el problema que se está resolviendo. Agruparlos es
 * completar dos columnas; meterlos adentro de otro habría obligado a borrar
 * siete productos y recargar a mano sus precios, fotos y medidas.
 *
 * Las opciones son **pares tipo/valor** y no un rótulo suelto, porque un
 * producto puede variar en dos cosas a la vez: seis filas pueden ser tres
 * colores por dos medidas, y la ficha tiene que mostrar dos filas de botones,
 * no seis botones sueltos.
 */

export type Opcion = { tipo: string; valor: string };

/** Los tipos que el ABM ofrece de entrada. No es una lista cerrada. */
export const TIPOS_SUGERIDOS = ["Color", "Medidas"] as const;

const MAX_TIPO = 30;
const MAX_VALOR = 40;
/** Tope de seguridad: lo que llega del panel y de las planillas no se confía. */
const MAX_OPCIONES = 6;

function limpiar(texto: unknown, largo: number): string {
  return sanitizeText(texto, largo).replace(/\s+/g, " ").trim();
}

/**
 * Lee la columna: `"Color: Roble ; Medidas: 120x20"`.
 *
 * `;` separa opciones y `:` separa el tipo de su valor — la misma familia de
 * separadores que Stickers y Complementarios, para no tener que recordar una
 * convención distinta por columna.
 *
 * Lo que no tiene `:` se ignora en vez de romper la fila. Un tipo repetido se
 * queda con el primero: "Color" dos veces en la misma variante no significa
 * nada.
 */
export function parseOpciones(valor: unknown): Opcion[] {
  const crudo = String(valor ?? "").trim();
  if (!crudo) return [];

  const vistos = new Set<string>();
  const salida: Opcion[] = [];
  for (const parte of crudo.split(";")) {
    const corte = parte.indexOf(":");
    if (corte === -1) continue;
    const tipo = limpiar(parte.slice(0, corte), MAX_TIPO);
    const val = limpiar(parte.slice(corte + 1), MAX_VALOR);
    if (!tipo || !val) continue;
    const clave = tipo.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ tipo, valor: val });
    if (salida.length >= MAX_OPCIONES) break;
  }
  return salida;
}

/** Lo que se guarda en la columna. Cadena vacía cuando no hay nada. */
export function serializarOpciones(opciones: Opcion[]): string {
  return opciones
    .map((o) => ({ tipo: limpiar(o.tipo, MAX_TIPO), valor: limpiar(o.valor, MAX_VALOR) }))
    .filter((o) => o.tipo && o.valor)
    .slice(0, MAX_OPCIONES)
    .map((o) => `${o.tipo}: ${o.valor}`)
    .join(" ; ");
}

/**
 * Las hermanas de verdad: las del grupo que no son la principal.
 *
 * Una fila no puede ser variante de si misma. Si `varianteDe` apunta a su
 * propio SKU —lo deja una importacion con la columna mal completada, o un
 * `variante de` copiado de mas— la consulta por `varianteDe` devuelve tambien
 * a la principal, y el editor la mostraba dos veces: como cabecera y como su
 * propia variante. Al guardar, eso era un "SKU repetido" que ademas bloqueaba
 * la edicion entera del producto.
 */
export function soloHermanas<T extends { id?: unknown; sku?: unknown }>(
  principal: T | null,
  candidatas: T[],
): T[] {
  const idPrincipal = String(principal?.id ?? "");
  const skuPrincipal = String(principal?.sku ?? "").trim().toLowerCase();
  return candidatas.filter((c) => {
    if (idPrincipal && String(c.id ?? "") === idPrincipal) return false;
    if (skuPrincipal && String(c.sku ?? "").trim().toLowerCase() === skuPrincipal) return false;
    return true;
  });
}

/** El SKU del principal del grupo, o `null` si esta fila ES la principal. */
export function skuDelPrincipal(fila: Record<string, unknown>): string | null {
  return String(fila.varianteDe ?? "").trim() || null;
}

// ─── Lo que necesita la ficha ────────────────────────────────────────────────

export type VarianteFila = {
  id: string;
  sku: string;
  /** Para nombrar a las que ningún eje alcanza. Ver `variantesInalcanzables`. */
  nombre: string;
  opciones: Opcion[];
  imagen: string | null;
  actual: boolean;
};

/** Un tipo con todos sus valores: una fila de botones en la ficha. */
export type EjeVariante = {
  tipo: string;
  valores: {
    valor: string;
    /** A qué producto lleva este botón. */
    id: string;
    imagen: string | null;
    elegido: boolean;
  }[];
};

/**
 * Arma los ejes del selector a partir de las filas del grupo.
 *
 * Un eje por tipo ("Color", "Medidas"), y en cada uno sus valores distintos.
 *
 * **A qué producto lleva cada botón**: al que tiene ese valor y **coincide en
 * todo lo demás** con lo que está elegido ahora. Elegir "Nogal" tiene que
 * mantener la medida que el cliente venía mirando, no mandarlo a una fila al
 * azar. Si esa combinación no existe —no todas se fabrican— cae al primero que
 * tenga ese valor, que es preferible a un botón muerto.
 */
export function ejesDeVariantes(filas: VarianteFila[]): EjeVariante[] {
  const actual = filas.find((f) => f.actual);
  const tipos: string[] = [];
  for (const f of filas) {
    for (const o of f.opciones) {
      if (!tipos.some((t) => t.toLowerCase() === o.tipo.toLowerCase())) tipos.push(o.tipo);
    }
  }

  const valorDe = (f: VarianteFila, tipo: string) =>
    f.opciones.find((o) => o.tipo.toLowerCase() === tipo.toLowerCase())?.valor ?? "";

  return tipos
    .map((tipo) => {
      const vistos = new Set<string>();
      const valores: EjeVariante["valores"] = [];

      for (const f of filas) {
        const valor = valorDe(f, tipo);
        if (!valor || vistos.has(valor.toLowerCase())) continue;
        vistos.add(valor.toLowerCase());

        // Entre las filas que tienen este valor, la que más coincide con la
        // combinación que se está viendo.
        const candidatas = filas.filter((c) => valorDe(c, tipo).toLowerCase() === valor.toLowerCase());
        const mejor = actual
          ? candidatas.reduce((a, b) => (coincidencias(b, actual, tipo, valorDe) > coincidencias(a, actual, tipo, valorDe) ? b : a))
          : candidatas[0];

        valores.push({
          valor,
          id: mejor.id,
          imagen: mejor.imagen,
          elegido: !!actual && valorDe(actual, tipo).toLowerCase() === valor.toLowerCase(),
        });
      }
      return { tipo, valores };
    })
    // Un tipo con un solo valor no es una opción: no se muestra.
    .filter((eje) => eje.valores.length > 1);
}

/**
 * Las filas del grupo a las que **ningún botón del selector lleva**.
 *
 * Los ejes no garantizan llegar a todo el grupo, y cuando no llegan el
 * producto queda cargado, activo, con foto, agrupado — y sin forma de abrirlo
 * desde ningún lado. Es el caso más difícil de ver de todos, porque en el ABM
 * está todo bien y en la ficha del principal simplemente no hay botones.
 *
 * Pasa de tres maneras, y las tres las deja una planilla:
 *
 *  - **La fila no tiene opciones.** Sin un par tipo/valor no entra en ningún
 *    eje. Es lo que queda al completar "variante de" y olvidar la columna de
 *    al lado.
 *  - **Todas las hermanas dicen lo mismo.** Siete niveladores cargados como
 *    "Color: Plata" dan un eje de un solo valor, y un eje de un solo valor no
 *    se dibuja —con razón: no es una opción, es un dato del producto—. El
 *    grupo entero queda detrás de un selector que no existe.
 *  - **Dos filas con la misma combinación.** Cada valor lleva a una sola fila,
 *    así que la segunda no tiene botón propio.
 *
 * Se calcula desde los ejes ya armados y no en paralelo: lo que importa es a
 * dónde llevan los botones que realmente se van a dibujar.
 */
export function variantesInalcanzables(filas: VarianteFila[]): VarianteFila[] {
  if (filas.length <= 1) return [];

  // Se recorre el grupo a saltos, no de una: en un grupo de 3 colores por 2
  // medidas, "Nogal 90x15" no tiene boton desde "Roble 120x20" —los ejes
  // mantienen lo demas igual— pero se llega en dos clicks, pasando por Nogal.
  // Mirar un solo salto marcaria como rota la mitad de una grilla sana.
  const inicio = filas.find((f) => f.actual) ?? filas[0];
  const alcanzables = new Set<string>([inicio.id]);
  const pendientes = [inicio];

  while (pendientes.length > 0) {
    const desde = pendientes.shift()!;
    // Los ejes dependen de donde uno esta parado, asi que se recalculan en
    // cada salto: es literalmente lo que veria quien navega.
    const ejes = ejesDeVariantes(filas.map((f) => ({ ...f, actual: f.id === desde.id })));
    for (const eje of ejes) {
      for (const v of eje.valores) {
        if (alcanzables.has(v.id)) continue;
        alcanzables.add(v.id);
        const fila = filas.find((f) => f.id === v.id);
        if (fila) pendientes.push(fila);
      }
    }
  }

  return filas.filter((f) => !alcanzables.has(f.id));
}

/** Cuántos tipos, además del que se está cambiando, comparte con la actual. */
function coincidencias(
  candidata: VarianteFila,
  actual: VarianteFila,
  tipoQueCambia: string,
  valorDe: (f: VarianteFila, tipo: string) => string,
): number {
  let n = 0;
  for (const o of actual.opciones) {
    if (o.tipo.toLowerCase() === tipoQueCambia.toLowerCase()) continue;
    if (valorDe(candidata, o.tipo).toLowerCase() === o.valor.toLowerCase()) n++;
  }
  return n;
}

/**
 * Todas las filas del grupo al que pertenece un producto, la principal incluida.
 *
 * Devuelve lista vacía cuando el producto no tiene hermanas: la ficha no dibuja
 * el selector para un producto suelto.
 *
 * Son dos consultas sobre la misma tabla y no ocho como los complementarios:
 * una variante siempre está en la tabla de su principal, porque un piso
 * flotante no es variante de un porcelanato.
 */
export async function filasDelGrupo(
  tabla: TableKey,
  fila: Record<string, unknown>,
): Promise<VarianteFila[]> {
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

  const crudas = [principal, ...(hermanas as Record<string, unknown>[])].filter(
    (f): f is Record<string, unknown> => Boolean(f),
  );

  const vistos = new Set<string>();
  const salida: VarianteFila[] = [];
  for (const f of crudas) {
    const id = String(f.id ?? "");
    if (!id || vistos.has(id)) continue;
    // La principal desactivada no se muestra, pero su grupo sigue en pie.
    if (id !== idActual && f.isActive === false) continue;
    vistos.add(id);
    salida.push({
      id,
      sku: String(f.sku ?? ""),
      nombre: String(f.nombre ?? f.especie ?? f.sku ?? ""),
      opciones: parseOpciones(f.varianteOpciones),
      imagen: primeraImagen(f.imagenes),
      actual: id === idActual,
    });
  }
  return salida.length >= 2 ? salida : [];
}
