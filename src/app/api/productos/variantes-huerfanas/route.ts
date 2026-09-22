import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDelegate, TABLE_KEYS, TABLE_LABELS, type TableKey } from "@/lib/all-products";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { motivoDeInvisibilidad, SE_ARREGLA_SOLO, type FilaVisibilidad, type MotivoInvisible } from "@/lib/visibilidad";
import { parseOpciones, variantesInalcanzables, type VarianteFila } from "@/lib/variantes";
import { primeraImagen } from "@/lib/imagenes";
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
          select: {
            id: true, sku: true, nombre: true, varianteDe: true,
            isActive: true, imagenes: true, varianteOpciones: true,
          },
        })
        .catch(() => [])) as Record<string, unknown>[];

      const porSku = new Map<string, FilaVisibilidad>();
      for (const f of filas) {
        const sku = String(f.sku ?? "").trim();
        if (sku) porSku.set(sku.toLowerCase(), aFila(f));
      }

      const salida: Invisible[] = [];
      const yaReportadas = new Set<string>();
      for (const f of filas) {
        const fila = aFila(f);
        const varianteDe = String(f.varianteDe ?? "").trim();
        if (!varianteDe) continue;
        const principal = porSku.get(varianteDe.toLowerCase()) ?? null;
        const motivo = motivoDeInvisibilidad(fila, varianteDe, principal);
        if (!motivo) continue;
        yaReportadas.add(String(f.id));
        salida.push({
          ...fila,
          tabla: key,
          tablaLabel: TABLE_LABELS[key],
          varianteDe,
          motivo,
          principal: principal ? `${principal.sku} · ${principal.nombre}` : varianteDe,
        });
      }

      // Las que el grupo sí contiene pero la ficha no sabe dibujar. Se revisa
      // grupo por grupo y no fila por fila: que una variante tenga botón
      // depende de lo que digan sus hermanas, no sólo de lo que diga ella.
      for (const [skuGrupo, miembros] of agruparPorPrincipal(filas)) {
        const principal = porSku.get(skuGrupo);
        // Sin principal visible ya está reportado arriba, con su motivo real.
        if (!principal || !principal.isActive || !primeraImagen(principal.imagenes)) continue;
        const comoFicha = miembros.map((m) =>
          aVarianteFila(m, String(m.sku ?? "").trim().toLowerCase() === skuGrupo),
        );
        for (const suelta of variantesInalcanzables(comoFicha)) {
          if (yaReportadas.has(suelta.id)) continue;
          const cruda = filas.find((f) => String(f.id) === suelta.id);
          if (!cruda) continue;
          salida.push({
            ...aFila(cruda),
            tabla: key,
            tablaLabel: TABLE_LABELS[key],
            varianteDe: skuGrupo,
            motivo: "sin-boton-que-lleve",
            principal: `${principal.sku} · ${principal.nombre}`,
          });
        }
      }
      return salida;
    }),
  );
  return porTabla.flat();
}

/**
 * Los grupos de esa tabla: SKU del principal -> sus filas, la principal
 * incluida. Sólo los grupos de verdad, con más de un miembro.
 *
 * Se arma con las filas activas y con foto, que son las que el catálogo
 * considera: una hermana apagada no tiene que aparecer en el selector, y por
 * lo tanto tampoco cuenta como "sin botón".
 */
function agruparPorPrincipal(filas: Record<string, unknown>[]): Map<string, Record<string, unknown>[]> {
  const grupos = new Map<string, Record<string, unknown>[]>();
  for (const f of filas) {
    if (f.isActive === false || !primeraImagen(f.imagenes)) continue;
    const sku = String(f.sku ?? "").trim();
    const clave = (String(f.varianteDe ?? "").trim() || sku).toLowerCase();
    if (!clave) continue;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }
  for (const [clave, miembros] of grupos) {
    if (miembros.length < 2) grupos.delete(clave);
  }
  return grupos;
}

/**
 * La forma que espera `variantesInalcanzables`.
 *
 * El principal va como `actual`: es la ficha desde la que se mira el grupo, y
 * además es el que tiene card propia en el catálogo. Sin eso, un grupo cuyo
 * eje no se dibuja reportaría también al principal, que sí se ve.
 */
function aVarianteFila(f: Record<string, unknown>, esPrincipal: boolean): VarianteFila {
  return {
    id: String(f.id),
    sku: String(f.sku ?? ""),
    nombre: String(f.nombre ?? f.especie ?? f.sku ?? ""),
    opciones: parseOpciones(f.varianteOpciones),
    imagen: primeraImagen(f.imagenes),
    actual: esPrincipal,
  };
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
      sinBoton: cuenta("sin-boton-que-lleve"),
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
