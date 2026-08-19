import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DB_NAMES, getDelegate, tableKeyFromDbName } from "@/lib/all-products";
import { getCategoryConfig } from "@/lib/category-fields";
import { sanitizeText } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Valores ya usados en cada campo de texto de una categoría.
 *
 * Alimenta los desplegables con búsqueda del ABM. El problema que resuelve es
 * de datos, no de comodidad: cargando a mano se escribe "Max Core", "MaxCore" y
 * "max core", y como los filtros del catálogo se arman con los valores
 * distintos que hay en la tabla, cada variante aparece como una opción propia.
 * Sugerir lo que ya existe hace que se elija en vez de escribirse.
 */

/**
 * Campos que NO tienen sentido sugerir: son propios de cada producto, así que
 * la lista sería tan larga como el catálogo y no ayudaría a nadie.
 */
const SIN_SUGERENCIAS = new Set([
  "sku",
  "nombre",
  "especie",
  "codigo",
  "descripcion",
  "fichaTecnica",
  "archivoInstalacion",
  "imagenes",
  "metadatos",
]);

/**
 * Tope de opciones por campo. Si un campo supera esto, sugerir deja de servir
 * (es un campo libre disfrazado) y se devuelve vacío para que quede como input
 * de texto común.
 */
const MAX_OPCIONES = 200;

/** Cuántas filas se miran para juntar los valores. */
const MAX_FILAS = 2000;

type Cache = { valores: Record<string, string[]>; expira: number };
const cache = new Map<string, Cache>();
const TTL_MS = 60_000;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tabla = sanitizeText(req.nextUrl.searchParams.get("tabla") ?? "", 60);
    if (!tabla) return NextResponse.json({ error: "Falta la categoría" }, { status: 400 });

    const key = tableKeyFromDbName(tabla);
    const config = getCategoryConfig(tabla);
    if (!key || !config) {
      return NextResponse.json({ error: "Categoría desconocida" }, { status: 400 });
    }

    const cacheado = cache.get(tabla);
    if (cacheado && cacheado.expira > Date.now()) {
      return NextResponse.json({ success: true, data: { valores: cacheado.valores } });
    }

    // Sólo campos de texto: en los numéricos sugerir no tiene sentido, y en los
    // `select` las opciones ya vienen de la config.
    const campos = config.fields
      .filter((f) => f.type === "text" && !SIN_SUGERENCIAS.has(f.key))
      .map((f) => f.key);

    if (campos.length === 0) {
      return NextResponse.json({ success: true, data: { valores: {} } });
    }

    const select: Record<string, boolean> = {};
    for (const campo of campos) select[campo] = true;

    const filas = await getDelegate(key)
      .findMany({ select, take: MAX_FILAS })
      .catch((err) => {
        console.error(`[valores] falló ${DB_NAMES[key]}:`, err);
        return [] as Record<string, unknown>[];
      });

    const acumulado = new Map<string, Set<string>>();
    for (const campo of campos) acumulado.set(campo, new Set());

    for (const fila of filas) {
      for (const campo of campos) {
        const valor = String(fila[campo] ?? "").trim();
        if (valor) acumulado.get(campo)!.add(valor);
      }
    }

    const valores: Record<string, string[]> = {};
    for (const [campo, set] of acumulado) {
      // Con un solo valor distinto no hay nada que elegir, y pasado el tope
      // deja de ser una sugerencia útil.
      if (set.size === 0 || set.size > MAX_OPCIONES) continue;
      valores[campo] = [...set].sort((a, b) => a.localeCompare(b, "es"));
    }

    cache.set(tabla, { valores, expira: Date.now() + TTL_MS });
    return NextResponse.json({ success: true, data: { valores } });
  } catch (error) {
    console.error("[valores] error:", error);
    return NextResponse.json({ error: "Error al obtener los valores" }, { status: 500 });
  }
}
