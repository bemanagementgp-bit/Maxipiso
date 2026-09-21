import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDelegate, TABLE_KEYS, TABLE_LABELS, type TableKey } from "@/lib/all-products";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { motivoDeInvisibilidad, SE_ARREGLA_SOLO, type FilaVisibilidad, type MotivoInvisible } from "@/lib/visibilidad";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Productos cargados, activos y con foto que aun asi no aparecen en el catalogo.
 *
 * El catalogo lista una card por grupo: el principal. Un producto con la columna
 * `variante de` cargada no sale por si mismo, sale entrando al principal. Eso
 * esta bien cuando el principal se ve; cuando no se ve, el grupo entero
 * desaparece y no hay forma de notarlo salvo ir producto por producto.
 *
 * Los cuatro motivos, y por que se separan en dos grupos, en `lib/visibilidad`.
 */

type Invisible = FilaVisibilidad & {
  tabla: string;
  tablaLabel: string;
  varianteDe: string;
  motivo: MotivoInvisible;
  /** El nombre del principal, para poder ir a arreglarlo. */
  principal: string;
};

async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  return null;
}

/** Recorre las 8 tablas y junta los que no se ven. */
async function buscarInvisibles(): Promise<Invisible[]> {
  const porTabla = await Promise.all(
    TABLE_KEYS.map(async (key: TableKey) => {
      const d = getDelegate(key);
      // Una sola consulta por tabla: para decidir hace falta el estado del
      // principal, asi que se traen todas las filas y se resuelve en memoria.
      const filas = (await d
        .findMany({
          select: { id: true, sku: true, nombre: true, varianteDe: true, isActive: true, imagenes: true },
        })
        .catch(() => [])) as Record<string, unknown>[];

      const porSku = new Map<string, FilaVisibilidad>();
      for (const f of filas) {
        const sku = String(f.sku ?? "").trim();
        if (sku) porSku.set(sku.toLowerCase(), aFila(f));
      }

      const salida: Invisible[] = [];
      for (const f of filas) {
        const fila = aFila(f);
        const varianteDe = String(f.varianteDe ?? "").trim();
        if (!varianteDe) continue;
        const principal = porSku.get(varianteDe.toLowerCase()) ?? null;
        const motivo = motivoDeInvisibilidad(fila, varianteDe, principal);
        if (!motivo) continue;
        salida.push({
          ...fila,
          tabla: key,
          tablaLabel: TABLE_LABELS[key],
          varianteDe,
          motivo,
          principal: principal ? `${principal.sku} · ${principal.nombre}` : varianteDe,
        });
      }
      return salida;
    }),
  );
  return porTabla.flat();
}

function aFila(f: Record<string, unknown>): FilaVisibilidad {
  return {
    id: String(f.id),
    sku: String(f.sku ?? ""),
    nombre: String(f.nombre ?? f.especie ?? f.sku ?? ""),
    isActive: f.isActive !== false,
    imagenes: f.imagenes,
  };
}

/** Que se va a tocar. Nunca escribe. */
export async function GET() {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const invisibles = await buscarInvisibles();
  const cuenta = (m: MotivoInvisible) => invisibles.filter((h) => h.motivo === m).length;
  const arreglables = invisibles.filter((h) => SE_ARREGLA_SOLO.has(h.motivo));

  return NextResponse.json({
    success: true,
    data: {
      total: invisibles.length,
      // Los que se arreglan con el boton, y los que hay que ir a tocar a mano.
      arreglables: arreglables.length,
      seApuntanASiMismos: cuenta("se-apunta-a-si-mismo"),
      principalInexistente: cuenta("principal-inexistente"),
      principalApagado: cuenta("principal-apagado"),
      principalSinFoto: cuenta("principal-sin-foto"),
      // Alcanza con una muestra: la lista completa de un catalogo entero no
      // aporta nada en pantalla y puede ser enorme.
      ejemplos: invisibles.slice(0, 30),
    },
  });
}

/**
 * Saca del grupo a los que apuntan a la nada: vuelven al catalogo como card.
 *
 * Los otros dos motivos no se tocan. Ahi el grupo esta bien armado y la
 * variante tiene que seguir colgando del principal; lo que falta es prender el
 * principal o darle una foto, y eso es una decision del catalogo, no una
 * reparacion de datos.
 */
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const invisibles = (await buscarInvisibles()).filter((h) => SE_ARREGLA_SOLO.has(h.motivo));
  const porTabla = new Map<string, string[]>();
  for (const h of invisibles) {
    porTabla.set(h.tabla, [...(porTabla.get(h.tabla) ?? []), h.id]);
  }

  let arreglados = 0;
  for (const [tabla, ids] of porTabla) {
    const d = getDelegate(tabla as TableKey);
    // `varianteOpciones` se limpia junto: describen en que se diferencia de
    // hermanas que no existen, asi que sueltas no significan nada.
    const r = await d
      .updateMany({ where: { id: { in: ids } }, data: { varianteDe: null, varianteOpciones: null } })
      .catch(() => ({ count: 0 }));
    arreglados += r.count;
  }

  clearCatalogCache();
  return NextResponse.json({ success: true, data: { arreglados } });
}
