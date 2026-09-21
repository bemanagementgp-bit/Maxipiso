/**
 * Los filtros del ABM, en la URL.
 *
 * Vivian solo en `useState`, asi que cualquier navegacion los perdia: editar un
 * producto y guardar devolvia a /panel en blanco, y para seguir trabajando en
 * el mismo rubro habia que volver a elegir categoria, subtipo y lo que hubiera
 * puesto. Cargando veinte terminaciones de aluminio seguidas, son veinte veces.
 *
 * En la URL el estado sobrevive a la ida y vuelta al editor, a recargar la
 * pagina y al boton "atras" del navegador, y ademas la pantalla se puede
 * compartir tal como se la esta mirando.
 *
 * Las claves son cortas porque quedan a la vista. Los filtros por
 * caracteristica —que dependen de la categoria elegida y no son una lista
 * fija— van con el prefijo `f_`: `f_subtipo=Terminaciones+de+Aluminio`.
 */

export type FiltrosPanel = {
  buscar: string;
  tabla: string;
  marca: string;
  /** "activo" | "inactivo" | "todos". */
  estado: string;
  /** "" | "con" | "sin". */
  imagen: string;
  /** Filtros por caracteristica, segun la categoria. */
  extra: Record<string, string>;
};

/** El estado con el que abre el ABM cuando la URL no dice nada. */
export const FILTROS_VACIOS: FiltrosPanel = {
  buscar: "",
  tabla: "",
  marca: "",
  estado: "activo",
  imagen: "",
  extra: {},
};

const PREFIJO_EXTRA = "f_";

type Params = { get(name: string): string | null; entries(): IterableIterator<[string, string]> };

export function leerFiltros(sp: Params): FiltrosPanel {
  const extra: Record<string, string> = {};
  for (const [clave, valor] of sp.entries()) {
    if (!clave.startsWith(PREFIJO_EXTRA) || !valor) continue;
    extra[clave.slice(PREFIJO_EXTRA.length)] = valor;
  }
  return {
    buscar: sp.get("buscar") ?? "",
    tabla: sp.get("cat") ?? "",
    marca: sp.get("marca") ?? "",
    estado: sp.get("estado") ?? FILTROS_VACIOS.estado,
    imagen: sp.get("img") ?? "",
    extra,
  };
}

/**
 * El query string, sin `?`. Vacio cuando no hay nada filtrado.
 *
 * Los valores por defecto no se escriben: una URL limpia para la vista limpia,
 * que es la que se comparte y la que queda en el historial al entrar.
 */
export function escribirFiltros(f: FiltrosPanel): string {
  const p = new URLSearchParams();
  if (f.buscar) p.set("buscar", f.buscar);
  if (f.tabla) p.set("cat", f.tabla);
  if (f.marca) p.set("marca", f.marca);
  if (f.estado && f.estado !== FILTROS_VACIOS.estado) p.set("estado", f.estado);
  if (f.imagen) p.set("img", f.imagen);
  // Ordenadas para que el mismo estado de pantalla de siempre la misma URL: si
  // no, cada cambio deja una entrada distinta en el historial por el orden de
  // las claves.
  for (const clave of Object.keys(f.extra).sort()) {
    if (f.extra[clave]) p.set(PREFIJO_EXTRA + clave, f.extra[clave]);
  }
  return p.toString();
}

/** `true` si hay algo filtrado, para decidir si mostrar "Limpiar". */
export function hayFiltros(f: FiltrosPanel): boolean {
  return escribirFiltros(f) !== "";
}
