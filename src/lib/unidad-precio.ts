/**
 * Por que unidad se cobra un precio.
 *
 * Un cliente pregunto si los $11.200 de una manta bajo piso eran por metro,
 * por rollo o por unidad, y la ficha no lo decia. La card sabia poner "/m²"
 * cuando el precio venia en `precioM2` y "/caja" cuando venia en `precioCaja`,
 * pero un accesorio cobra `precio` a secas y ahi no habia nada que deducir: se
 * mostraba el numero solo. En un mayorista eso no es un detalle de formato,
 * es la diferencia entre cotizar bien y cotizar mal.
 *
 * Ahora las 8 tablas tienen `unidadMedida` y se puede cargar a mano. Lo que ya
 * estaba cargado no tiene valor, y por eso sigue existiendo la deduccion: sin
 * `unidadMedida`, un `precioM2` se muestra como siempre. Solo cambia donde
 * antes no se podia decir nada.
 */

/** La unidad que implica cada columna de precio, cuando la implica. */
const POR_COLUMNA: Record<string, string> = {
  precioM2: "m²",
  precioMl: "ml",
  precioMLineal: "ml",
  precioCaja: "caja",
  precioTabla: "tabla",
};

/**
 * Las unidades que ofrece el ABM. Es una lista abierta —el campo sigue
 * aceptando lo que se escriba— pero tenerla evita que el mismo rollo quede
 * cargado como "rollo", "Rollo" y "x rollo", que en el catalogo se leen como
 * tres cosas distintas.
 */
export const UNIDADES = [
  "m²",
  "ml",
  "m³",
  "unidad",
  "rollo",
  "caja",
  "bolsa",
  "pallet",
  "juego",
  "par",
  "kg",
  "litro",
] as const;

/**
 * Lo que va despues del precio, sin la barra. `null` si no se sabe.
 *
 * `explicita` es lo cargado en `unidadMedida` y manda siempre: si alguien dice
 * que su piso se vende por caja aunque el precio este en `precioM2`, sabe algo
 * que la columna no cuenta.
 */
export function unidadDePrecio(explicita: unknown, columnaDePrecio?: string | null): string | null {
  const cargada = String(explicita ?? "").trim();
  if (cargada) return cargada;
  return (columnaDePrecio && POR_COLUMNA[columnaDePrecio]) ?? null;
}

/**
 * La unidad de una fila del catalogo, mirando que columna de precio trae.
 *
 * La card recibe la fila entera y no sabe de que tabla salio, asi que la
 * columna se descubre por cual tiene valor. El orden importa: `precioM2` antes
 * que `precioCaja` porque un piso que tiene los dos se cotiza por metro.
 */
const ORDEN_COLUMNAS = ["precioM2", "precioMl", "precioMLineal", "precioCaja", "precioTabla", "precio"];

export function unidadDeFila(fila: Record<string, unknown>): string | null {
  const explicita = String(fila.unidadMedida ?? "").trim();
  if (explicita) return explicita;
  for (const columna of ORDEN_COLUMNAS) {
    const v = fila[columna];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      return POR_COLUMNA[columna] ?? null;
    }
  }
  return null;
}
