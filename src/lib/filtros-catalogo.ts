import { partirMultiple } from "@/lib/opciones-fijas";

/**
 * Los valores que ofrece un filtro del catalogo.
 *
 * Se arman con los valores distintos que hay cargados en esa columna, y ahi
 * aparecieron dos problemas que desde el mostrador son el mismo: el filtro no
 * ayuda a encontrar nada.
 *
 * **"interior" e "Interior" eran dos opciones.** Un `Set` sobre el texto crudo
 * toma por distinto lo que para quien busca es lo mismo, asi que el filtro de
 * Uso ofrecia las dos y cada una devolvia la mitad de los productos. Se
 * agrupan ignorando mayusculas y acentos, y se muestra **una sola** escritura.
 *
 * **Cual se muestra**: la mas cargada, que es la forma en que el catalogo esta
 * escrito de verdad. Si empatan gana la que arranca en mayuscula, porque es la
 * que se lee como titulo en un filtro; si sigue el empate, la primera
 * alfabeticamente, para que la misma base de siempre la misma lista.
 *
 * Elegir una tiene que traer **todas** las escrituras del grupo: por eso cada
 * opcion viaja con sus `equivalentes`, y la consulta usa `in` en vez de `=`.
 * Mostrar "Interior" y filtrar solo por "Interior" perderia los productos
 * cargados como "interior", que es peor que el problema original.
 */

export type OpcionFiltro = {
  /** Lo que se muestra y lo que viaja en la URL. */
  valor: string;
  /** Todas las escrituras que hay en la base, incluida `valor`. */
  equivalentes: string[];
};

/** Misma palabra a los ojos de quien busca: sin mayusculas, acentos ni dobles espacios. */
export function claveDeValor(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cuantos valores distintos tiene que tener un campo para que valga como
 * filtro.
 *
 * Con uno solo no separa nada: "Tipo de accesorio: Accesorios" ocupa lugar,
 * invita a un click y devuelve exactamente lo mismo que estaba. El ABM ya usa
 * esta misma regla para decidir que filtros ofrecer.
 */
export const MIN_VALORES = 2;

export function opcionesDeFiltro(
  crudos: unknown[],
  { multiple = false, alias = {} }: { multiple?: boolean; alias?: Record<string, string> } = {},
): OpcionFiltro[] {
  /** clave normalizada -> escritura -> cuantas veces aparece */
  const grupos = new Map<string, Map<string, number>>();

  for (const crudo of crudos) {
    if (typeof crudo !== "string" || crudo.trim() === "") continue;
    const partes = multiple ? partirMultiple(crudo) : [crudo.trim()];
    for (const parte of partes) {
      // El alias se aplica antes de agrupar: "Max Core" y "MaxCore" son la
      // misma marca por decision del negocio, no por como se escriben.
      const valor = alias[parte] ?? parte;
      const clave = claveDeValor(valor);
      if (!clave) continue;
      const escrituras = grupos.get(clave) ?? new Map<string, number>();
      escrituras.set(valor, (escrituras.get(valor) ?? 0) + 1);
      grupos.set(clave, escrituras);
    }
  }

  const opciones: OpcionFiltro[] = [];
  for (const escrituras of grupos.values()) {
    const ordenadas = [...escrituras.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const mayusA = /^\p{Lu}/u.test(a[0]) ? 0 : 1;
      const mayusB = /^\p{Lu}/u.test(b[0]) ? 0 : 1;
      if (mayusA !== mayusB) return mayusA - mayusB;
      return a[0].localeCompare(b[0], "es");
    });
    opciones.push({
      valor: ordenadas[0][0],
      equivalentes: ordenadas.map(([v]) => v),
    });
  }

  // Los numeros por valor y no como texto: "10" va despues de "9", no antes.
  return opciones.sort((a, b) => {
    const na = parseFloat(a.valor);
    const nb = parseFloat(b.valor);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.valor.localeCompare(b.valor, "es", { numeric: true });
  });
}
