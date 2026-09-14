import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { verifyOrigin } from "@/lib/security";
import { TABLE_KEYS, getDelegate, DB_NAMES, type TableKey } from "@/lib/all-products";
import { detectarTono, CAMPOS_MIRADOS } from "@/lib/tono-detector";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/**
 * Completa el tono de los productos que ya estan cargados, deduciendolo del
 * nombre.
 *
 * `GET` no escribe nada: devuelve **que haria**. `POST` aplica.
 *
 * Esa separacion es el punto de la ruta. Es una adivinanza a partir de como se
 * llama el producto, y sobre miles de filas una adivinanza aplicada a ciegas
 * llena el catalogo de tonos plausibles y equivocados. Quien lo corre ve el
 * reparto y los ejemplos antes de tocar nada.
 *
 * **Nunca pisa un tono ya cargado**: solo completa los vacios. Correrlo dos
 * veces no cambia nada la segunda.
 */

/** `accesorios` y `maderas` no tienen columna `tono`: no se las consulta. */
const TABLAS_CON_TONO: TableKey[] = TABLE_KEYS.filter(
  (k) => !["accesorio", "madera"].includes(k),
);

/**
 * Las columnas a pedir, quedandose con las que esa tabla realmente tiene.
 *
 * No todas comparten los mismos campos —`acabado` no existe en pisos flotantes,
 * `categoriaTerciaria` no existe en decks— y Prisma rechaza el `select` entero
 * si se le nombra uno que falta. Pedir siempre las mismas dejaba las ocho
 * consultas en error y el analisis en cero.
 */
function seleccionDe(tabla: TableKey): Record<string, true> {
  const modelo = Prisma.dmmf.datamodel.models.find(
    (m) => (m.dbName ?? m.name) === DB_NAMES[tabla],
  );
  const existentes = new Set(modelo?.fields.map((f) => f.name) ?? []);
  const seleccion: Record<string, true> = { id: true, sku: true, tono: true };
  for (const campo of ["nombre", ...CAMPOS_MIRADOS]) {
    if (existentes.has(campo)) seleccion[campo] = true;
  }
  return seleccion;
}

type Propuesta = { id: string; tabla: TableKey; sku: string; nombre: string; tono: string };

async function calcular(): Promise<{
  propuestas: Propuesta[];
  sinDetectar: number;
  yaTenian: number;
}> {
  let sinDetectar = 0;
  let yaTenian = 0;
  const propuestas: Propuesta[] = [];

  for (const tabla of TABLAS_CON_TONO) {
    const filas = (await getDelegate(tabla)
      .findMany({ select: seleccionDe(tabla) })
      .catch((err: unknown) => {
        // Una tabla que no tiene alguno de esos campos no puede tumbar al resto.
        console.error(`[tonos] no se pudo leer ${DB_NAMES[tabla]}:`, err);
        return [];
      })) as Record<string, unknown>[];

    for (const fila of filas) {
      if (String(fila.tono ?? "").trim()) { yaTenian++; continue; }
      const tono = detectarTono(fila);
      if (!tono) { sinDetectar++; continue; }
      propuestas.push({
        id: String(fila.id),
        tabla,
        sku: String(fila.sku ?? ""),
        nombre: String(fila.nombre ?? ""),
        tono,
      });
    }
  }

  return { propuestas, sinDetectar, yaTenian };
}

async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

/** Vista previa. No escribe. */
export async function GET() {
  const authErr = await exigirAdmin();
  if (authErr) return authErr;

  try {
    const { propuestas, sinDetectar, yaTenian } = await calcular();

    // El reparto por tono es lo que deja ver si la deteccion se fue de tema:
    // 900 productos en "Gris" cuando el catalogo es de maderas es una senal.
    const porTono: Record<string, number> = {};
    for (const p of propuestas) porTono[p.tono] = (porTono[p.tono] ?? 0) + 1;

    return NextResponse.json({
      success: true,
      data: {
        aCompletar: propuestas.length,
        sinDetectar,
        yaTenian,
        porTono,
        // Unos pocos de cada tono, para mirar antes de aplicar.
        ejemplos: Object.keys(porTono).map((tono) => ({
          tono,
          productos: propuestas.filter((p) => p.tono === tono).slice(0, 3).map((p) => `${p.sku} · ${p.nombre}`),
        })),
      },
    });
  } catch (error) {
    console.error("[tonos GET] error:", error);
    return NextResponse.json({ error: "No se pudo analizar el catálogo" }, { status: 500 });
  }
}

/** Aplica lo que muestra el GET. */
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const authErr = await exigirAdmin();
  if (authErr) return authErr;

  try {
    const { propuestas } = await calcular();

    // Un update por tabla y por tono en vez de uno por producto: son miles de
    // filas y Turso cobra cada viaje.
    let aplicados = 0;
    const porTablaYTono = new Map<string, { tabla: TableKey; tono: string; ids: string[] }>();
    for (const p of propuestas) {
      const clave = `${p.tabla}|${p.tono}`;
      if (!porTablaYTono.has(clave)) porTablaYTono.set(clave, { tabla: p.tabla, tono: p.tono, ids: [] });
      porTablaYTono.get(clave)!.ids.push(p.id);
    }

    for (const { tabla, tono, ids } of porTablaYTono.values()) {
      try {
        const r = await getDelegate(tabla).updateMany({ where: { id: { in: ids } }, data: { tono } });
        aplicados += (r as { count: number }).count;
      } catch (err) {
        console.error(`[tonos] no se pudo escribir ${DB_NAMES[tabla]} / ${tono}:`, err);
      }
    }

    if (aplicados > 0) clearCatalogCache();
    return NextResponse.json({ success: true, data: { aplicados } });
  } catch (error) {
    console.error("[tonos POST] error:", error);
    return NextResponse.json({ error: "No se pudieron aplicar los tonos" }, { status: 500 });
  }
}
