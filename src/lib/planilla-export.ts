import { prisma } from "@/lib/prisma";
import { SHEET_SCHEMAS, type SheetSchema } from "@/lib/sheet-schemas";
import { getDelegate, tableKeyFromDbName } from "@/lib/all-products";
import { imagenesParaPlanilla } from "@/lib/imagenes";
import { parseComplementarios } from "@/lib/all-products";
import { parseStickerIds } from "@/lib/stickers";

/**
 * Exportacion del catalogo con la forma de la plantilla de importacion.
 *
 * Una hoja por categoria y **exactamente las mismas columnas que la plantilla**,
 * en el mismo orden. Una columna sin cargar —`tono`, por ejemplo— viaja vacia
 * pero viaja: lo que se exporta se completa y se vuelve a importar sin tocar
 * encabezados. Ese ida y vuelta es el punto de la funcion.
 *
 * Los encabezados salen del `fieldMap` del schema, el mismo que usan la
 * plantilla y el parser de importacion, asi que los tres no se pueden
 * desincronizar.
 */

/**
 * Un encabezado por columna de la base, en el orden del maestro.
 *
 * Identica a la de la plantilla: el `fieldMap` mapea varias claves al mismo
 * campo (`imagen` e `imagenes`) para aceptar las dos formas al importar, y aca
 * se emite una sola.
 */
export function encabezadosDe(schema: SheetSchema): string[] {
  const vistos = new Set<string>();
  const headers: string[] = [];
  for (const [header, campo] of Object.entries(schema.fieldMap)) {
    if (vistos.has(campo)) continue;
    vistos.add(campo);
    headers.push(header);
  }
  return headers;
}

/** Los ids que guarda la base se escriben como los entiende la importacion. */
type Catalogos = {
  /** id de sticker → nombre. */
  stickers: Map<string, string>;
  /** id de producto → SKU, de las 8 tablas. */
  skus: Map<string, string>;
};

async function cargarCatalogos(): Promise<Catalogos> {
  const [stickers, porTabla] = await Promise.all([
    prisma.sticker.findMany({ select: { id: true, nombre: true } }).catch(() => []),
    Promise.all(
      SHEET_SCHEMAS.map(async (sch) => {
        const key = tableKeyFromDbName(sch.tabla);
        if (!key) return [] as { id: string; sku: string }[];
        return (await getDelegate(key)
          .findMany({ select: { id: true, sku: true } })
          .catch(() => [])) as { id: string; sku: string }[];
      }),
    ),
  ]);

  return {
    stickers: new Map(stickers.map((s) => [s.id, s.nombre])),
    skus: new Map(porTabla.flat().map((p) => [p.id, p.sku])),
  };
}

/**
 * Convierte un valor de la base en lo que va en la celda.
 *
 * Las tres columnas especiales se traducen al formato que la plantilla dice
 * usar —nombres, SKUs y URLs separados por ` | `— y no a los ids crudos: un
 * archivo con cuids no se puede leer ni editar, y al reimportarlo la columna
 * quedaria mal.
 *
 * Todo lo demas sale tal cual. `null` se vuelve celda vacia, que es lo que
 * pidio el pedido original: la columna esta, sin dato.
 */
function valorDeCelda(campo: string, crudo: unknown, catalogos: Catalogos): string | number {
  if (crudo === null || crudo === undefined) return "";

  if (campo === "imagenes") return imagenesParaPlanilla(crudo);

  if (campo === "stickers") {
    return parseStickerIds(crudo)
      .map((id) => catalogos.stickers.get(id))
      .filter((n): n is string => Boolean(n))
      .join(" | ");
  }

  if (campo === "complementarios") {
    return parseComplementarios(crudo)
      .map((id) => catalogos.skus.get(id))
      .filter((s): s is string => Boolean(s))
      .join(" | ");
  }

  // Los numeros van como numeros para que Excel los trate como tales: si van
  // como texto, no se pueden sumar ni ordenar en la planilla.
  if (typeof crudo === "number") return crudo;
  if (typeof crudo === "boolean") return crudo ? "si" : "no";
  if (crudo instanceof Date) return crudo.toISOString().split("T")[0];
  return String(crudo);
}

export type HojaExportada = {
  nombre: string;
  encabezados: string[];
  filas: (string | number)[][];
};

/**
 * Arma una hoja por categoria.
 *
 * `soloActivos` por defecto en `false`: la exportacion sirve para editar el
 * catalogo en masa, y dejar afuera los productos apagados haria que volverlos
 * a importar los perdiera de vista. Quien exporta quiere todo.
 */
export async function construirHojas(opciones?: {
  categoria?: string | null;
  soloActivos?: boolean;
}): Promise<HojaExportada[]> {
  const { categoria = null, soloActivos = false } = opciones ?? {};
  const schemas = categoria
    ? SHEET_SCHEMAS.filter((s) => s.id === categoria || s.tabla === categoria)
    : SHEET_SCHEMAS;
  if (schemas.length === 0) return [];

  const catalogos = await cargarCatalogos();

  return Promise.all(
    schemas.map(async (schema): Promise<HojaExportada> => {
      const encabezados = encabezadosDe(schema);
      const key = tableKeyFromDbName(schema.tabla);
      if (!key) return { nombre: schema.label, encabezados, filas: [] };

      const filas = (await getDelegate(key)
        .findMany({
          where: soloActivos ? { isActive: true } : {},
          orderBy: [{ sortOrder: "asc" }, { sku: "asc" }],
        })
        .catch((err: unknown) => {
          // Que falle una tabla no puede dejar sin archivo a las otras siete:
          // esa hoja sale vacia, con sus encabezados.
          console.error(`[export] no se pudo leer ${schema.tabla}:`, err);
          return [];
        })) as Record<string, unknown>[];

      return {
        nombre: schema.label,
        encabezados,
        filas: filas.map((fila) =>
          encabezados.map((header) => valorDeCelda(schema.fieldMap[header], fila[schema.fieldMap[header]], catalogos)),
        ),
      };
    }),
  );
}
