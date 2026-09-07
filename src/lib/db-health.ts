import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Compara lo que Prisma espera de la base con lo que la base realmente tiene.
 *
 * Existe por una tarde entera perdida: se deployo codigo que leia una columna
 * nueva antes de aplicar la migracion en Turso, y el catalogo quedo mostrando
 * "0 productos" sin decir nada. Cada tabla del catalogo esta envuelta en un
 * `catch` que devuelve lista vacia —para que una tabla lenta no tire abajo la
 * pagina—, y ese mismo catch se traga el "no such column".
 *
 * La lista de columnas esperadas sale del DMMF del cliente generado, no de una
 * lista escrita a mano: una lista a mano se desactualiza justo cuando importa.
 */

export type EstadoTabla = {
  modelo: string;
  tabla: string;
  existe: boolean;
  faltantes: string[];
  /** Los ALTER TABLE que dejarian la tabla al dia. Vacio si no falta nada. */
  sql: string[];
};

export type Reporte = {
  ok: boolean;
  tablas: EstadoTabla[];
  /** Todo el SQL pendiente junto, en orden, listo para pegar. */
  sqlPendiente: string[];
};

/** Nombres de tabla y columna que aceptamos interpolar en una query. */
const IDENTIFICADOR = /^[A-Za-z_][A-Za-z0-9_]*$/;

const TIPO_SQL: Record<string, string> = {
  String: "TEXT",
  Int: "INTEGER",
  BigInt: "INTEGER",
  Float: "REAL",
  Decimal: "REAL",
  Boolean: "BOOLEAN",
  DateTime: "DATETIME",
  Json: "TEXT",
  Bytes: "BLOB",
};

async function columnasDe(tabla: string): Promise<string[] | null> {
  // El nombre viene del DMMF, no del usuario, pero se valida igual: es lo unico
  // que separa esto de una interpolacion cruda en SQL.
  if (!IDENTIFICADOR.test(tabla)) return null;
  try {
    const filas = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM pragma_table_info('${tabla}')`,
    );
    // Una tabla que no existe devuelve cero filas, no un error.
    return filas.length === 0 ? null : filas.map((f) => f.name);
  } catch {
    return null;
  }
}

export async function revisarBase(): Promise<Reporte> {
  const modelos = Prisma.dmmf.datamodel.models;

  const tablas = await Promise.all(
    modelos.map(async (modelo): Promise<EstadoTabla> => {
      const tabla = modelo.dbName ?? modelo.name;
      const escalares = modelo.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
      const esperadas = escalares.map((f) => ({
        nombre: f.dbName ?? f.name,
        tipo: TIPO_SQL[f.type] ?? "TEXT",
        obligatoria: f.isRequired && !f.hasDefaultValue,
      }));

      const actuales = await columnasDe(tabla);
      if (actuales === null) {
        return {
          modelo: modelo.name,
          tabla,
          existe: false,
          faltantes: esperadas.map((c) => c.nombre),
          // No se ofrece un CREATE TABLE armado a mano: una tabla entera que
          // falta es una migracion sin aplicar, y el .sql de la migracion la
          // crea bien (indices, claves y defaults incluidos).
          sql: [],
        };
      }

      const tiene = new Set(actuales);
      const faltantes = esperadas.filter((c) => !tiene.has(c.nombre) && IDENTIFICADOR.test(c.nombre));
      return {
        modelo: modelo.name,
        tabla,
        existe: true,
        faltantes: faltantes.map((c) => c.nombre),
        sql: faltantes.map(
          (c) =>
            `ALTER TABLE "${tabla}" ADD COLUMN "${c.nombre}" ${c.tipo};` +
            (c.obligatoria ? " -- obligatoria: revisar la migracion original" : ""),
        ),
      };
    }),
  );

  const conProblemas = tablas.filter((t) => !t.existe || t.faltantes.length > 0);
  return {
    ok: conProblemas.length === 0,
    tablas,
    sqlPendiente: conProblemas.flatMap((t) => t.sql),
  };
}
