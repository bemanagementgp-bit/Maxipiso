import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DB_NAMES, findProductById, getDelegate, tableKeyFromDbName, TABLE_LABELS, type TableKey,
} from "@/lib/all-products";
import { getCamposDeDinero } from "@/lib/price-fields";
import { planearMudanza } from "@/lib/mover-categoria";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Cambia un producto de categoria.
 *
 * Las 8 categorias son 8 tablas, asi que esto no es un `update` de un campo:
 * crea la fila en la tabla destino, con el mismo id, y borra la de origen.
 * Que pasa con cada dato esta en `lib/mover-categoria`.
 *
 * **GET** devuelve el plan sin tocar nada: que se pierde, a donde va el
 * precio, si sale de un grupo. Quien mueve decide con eso a la vista, igual
 * que en el detector de invisibles y en el de tonos.
 */

/**
 * `TableKey` ya es el nombre del delegate de Prisma (`pisoFlotante`), asi que
 * el modelo del esquema es el mismo con la primera en mayuscula. Un mapa
 * escrito a mano seria una tercera lista que mantener sincronizada.
 */
const modeloDe = (key: TableKey) => key.charAt(0).toUpperCase() + key.slice(1);

/**
 * Las columnas reales de esa tabla, sacadas del esquema.
 *
 * Del esquema y no de `CATEGORY_CONFIGS`: esa lista es la del ABM y no incluye
 * las columnas tecnicas —fotos, stickers, complementarios, orden— que tambien
 * tienen que viajar. Una lista escrita a mano se desincroniza con la primera
 * columna nueva.
 */
function columnasDe(key: TableKey): Set<string> {
  const modelo = Prisma.dmmf.datamodel.models.find((m) => m.name === modeloDe(key));
  return new Set((modelo?.fields ?? []).filter((f) => f.kind === "scalar").map((f) => f.name));
}

async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }), user: null };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }), user: null };
  return { error: null, user: session.user };
}

/**
 * Revisa que la mudanza se pueda hacer, y arma el plan.
 *
 * Devuelve un error listo para responder, o el plan. Las dos razones para
 * negarse son las que dejarian datos rotos:
 *
 *  - **El SKU ya existe en la categoria destino.** Son dos productos distintos
 *    con el mismo numero; el `create` fallaria igual, pero con un mensaje de
 *    Prisma que no le dice nada a nadie.
 *  - **Es el principal de un grupo con variantes.** Sus hermanas se quedarian
 *    apuntando a un SKU que en su tabla ya no existe: cargadas, activas, con
 *    foto y sin forma de abrirse. Es el bug que nos costo dos dias encontrar.
 *    Una variante suelta si se puede mover: sale del grupo, nada mas.
 */
async function preparar(id: string, destinoKey: TableKey) {
  const encontrado = await findProductById(id);
  if (!encontrado) {
    return { error: NextResponse.json({ error: "Producto no encontrado" }, { status: 404 }) };
  }
  const { raw, tableKey: origenKey, tablaNombre: origenTabla } = encontrado;
  if (origenKey === destinoKey) {
    return { error: NextResponse.json({ error: "Ya está en esa categoría." }, { status: 400 }) };
  }

  const sku = String(raw.sku ?? "").trim();
  const destino = getDelegate(destinoKey);
  const chocado = await destino.findUnique({ where: { sku } }).catch(() => null);
  if (chocado) {
    return {
      error: NextResponse.json(
        { error: `En ${TABLE_LABELS[destinoKey]} ya hay un producto con el SKU ${sku}.` },
        { status: 409 },
      ),
    };
  }

  const hermanas = await getDelegate(origenKey)
    .findMany({ where: { varianteDe: sku }, select: { sku: true } })
    .catch(() => []);
  if (hermanas.length > 0) {
    return {
      error: NextResponse.json(
        {
          error:
            `Este producto es el principal de un grupo de ${hermanas.length} variante${hermanas.length === 1 ? "" : "s"}. ` +
            `Moverlo las dejaría sin forma de aparecer en el catálogo. Sacalas del grupo primero, desde la tabla de variantes.`,
        },
        { status: 409 },
      ),
    };
  }

  const destinoTabla = DB_NAMES[destinoKey];
  const plan = planearMudanza(raw as Record<string, unknown>, columnasDe(destinoKey), {
    precioOrigen: getCamposDeDinero(origenTabla)?.precios[0]?.key ?? null,
    precioDestino: getCamposDeDinero(destinoTabla)?.precios[0]?.key ?? null,
  });

  return { error: null, plan, raw, origenKey, origenTabla, destinoTabla, sku };
}

/**
 * El destino llega como nombre de tabla —"accesorios"—, que es lo que el
 * desplegable del editor tiene a mano, y no como `TableKey`.
 */
function leerDestino(valor: unknown): TableKey | null {
  return tableKeyFromDbName(String(valor ?? "").trim());
}

/** El plan, sin tocar nada. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await exigirAdmin();
  if (permiso.error) return permiso.error;

  const destinoKey = leerDestino(req.nextUrl.searchParams.get("destino"));
  if (!destinoKey) return NextResponse.json({ error: "Categoría destino desconocida" }, { status: 400 });

  const { id } = await params;
  const paso = await preparar(id, destinoKey);
  if (paso.error) return paso.error;

  return NextResponse.json({
    success: true,
    data: {
      destinoLabel: TABLE_LABELS[destinoKey],
      sePierden: paso.plan!.sePierden,
      precioMovido: paso.plan!.precioMovido,
      salioDelGrupo: paso.plan!.salioDelGrupo,
    },
  });
}

/** Mueve de verdad. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const permiso = await exigirAdmin();
  if (permiso.error) return permiso.error;

  const body = await req.json().catch(() => null);
  const destinoKey = leerDestino(body?.destino);
  if (!destinoKey) return NextResponse.json({ error: "Categoría destino desconocida" }, { status: 400 });

  const { id } = await params;
  const paso = await preparar(id, destinoKey);
  if (paso.error) return paso.error;

  const { plan, origenKey, origenTabla, destinoTabla, sku } = paso;

  try {
    // Crear primero y borrar despues, en una transaccion: si el create falla
    // -una columna con restriccion, un SKU que aparecio en el medio- el
    // producto tiene que seguir donde estaba y no evaporarse.
    await prisma.$transaction(async (tx) => {
      const tablas = tx as unknown as Record<string, {
        create: (a: object) => Promise<unknown>;
        delete: (a: object) => Promise<unknown>;
      }>;
      await tablas[destinoKey].create({ data: plan!.data });
      await tablas[origenKey!].delete({ where: { id } });
      // El historial cuelga de (tabla, id). Sin esto el producto llega a su
      // categoria nueva sin pasado, aunque las filas sigan ahi.
      await tx.changeLog.updateMany({
        where: { tablaNombre: origenTabla!, entidadId: id },
        data: { tablaNombre: destinoTabla! },
      });
    });
  } catch (error) {
    console.error("[productos mover] error:", error);
    const detalle = error instanceof Error ? error.message.split("\n").pop()?.trim() : "";
    return NextResponse.json(
      { error: detalle ? `No se pudo mover: ${detalle}` : "No se pudo mover el producto" },
      { status: 500 },
    );
  }

  clearCatalogCache();
  return NextResponse.json({
    success: true,
    data: {
      id,
      sku,
      destino: destinoKey,
      destinoLabel: TABLE_LABELS[destinoKey],
      perdidos: plan!.sePierden.length,
      salioDelGrupo: plan!.salioDelGrupo,
    },
  });
}
