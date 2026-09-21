import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDelegate, TABLE_KEYS, TABLE_LABELS, type TableKey } from "@/lib/all-products";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Productos que dicen ser variante de un grupo que no existe.
 *
 * El catálogo lista sólo los principales, así que un `varianteDe` roto vuelve
 * al producto **invisible**: no sale como card propia porque se lo considera
 * variante, y no sale dentro de ningún grupo porque ese grupo no está. Cargado,
 * activo, con foto, y no aparece. Pasó con las terminaciones de aluminio.
 *
 * Son dos formas de romperlo, y las dos las deja una planilla con la columna
 * "variante de" mal completada:
 *
 *  - **Se apunta a sí mismo.** Un producto no puede ser su propia variante.
 *  - **Apunta a un SKU que no existe** en su categoría. Un error de tipeo, o el
 *    principal se borró después.
 *
 * En los dos casos la única lectura posible es "este producto no es variante de
 * nada", así que arreglarlo es vaciar la columna. No se hace solo: se muestra
 * primero qué se va a tocar, igual que el detector de tonos.
 */

type Huerfano = {
  id: string;
  sku: string;
  nombre: string;
  tabla: string;
  tablaLabel: string;
  varianteDe: string;
  motivo: "se-apunta-a-si-mismo" | "principal-inexistente";
};

async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  return null;
}

/** Recorre las 8 tablas y junta los que tienen el grupo roto. */
async function buscarHuerfanos(): Promise<Huerfano[]> {
  const porTabla = await Promise.all(
    TABLE_KEYS.map(async (key: TableKey) => {
      const d = getDelegate(key);
      // Todas las filas con `varianteDe` cargado, y todos los SKU que existen
      // en esa tabla: con eso alcanza para decidir, sin una consulta por fila.
      const [conGrupo, todos] = await Promise.all([
        d.findMany({
          where: { NOT: { varianteDe: null } },
          select: { id: true, sku: true, nombre: true, varianteDe: true },
        }).catch(() => []),
        d.findMany({ select: { sku: true } }).catch(() => []),
      ]);

      const existentes = new Set(
        (todos as { sku: string }[]).map((t) => String(t.sku ?? "").trim().toLowerCase()),
      );

      const salida: Huerfano[] = [];
      for (const f of conGrupo as Record<string, unknown>[]) {
        const varianteDe = String(f.varianteDe ?? "").trim();
        if (!varianteDe) continue;
        const sku = String(f.sku ?? "");
        const motivo: Huerfano["motivo"] | null =
          varianteDe.toLowerCase() === sku.trim().toLowerCase()
            ? "se-apunta-a-si-mismo"
            : !existentes.has(varianteDe.toLowerCase())
              ? "principal-inexistente"
              : null;
        if (!motivo) continue;
        salida.push({
          id: String(f.id),
          sku,
          nombre: String(f.nombre ?? f.especie ?? sku),
          tabla: key,
          tablaLabel: TABLE_LABELS[key],
          varianteDe,
          motivo,
        });
      }
      return salida;
    }),
  );
  return porTabla.flat();
}

/** Qué se va a tocar. Nunca escribe. */
export async function GET() {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const huerfanos = await buscarHuerfanos();
  return NextResponse.json({
    success: true,
    data: {
      total: huerfanos.length,
      seApuntanASiMismos: huerfanos.filter((h) => h.motivo === "se-apunta-a-si-mismo").length,
      principalInexistente: huerfanos.filter((h) => h.motivo === "principal-inexistente").length,
      // Alcanza con una muestra: la lista completa de un catálogo entero no
      // aporta nada en pantalla y puede ser enorme.
      ejemplos: huerfanos.slice(0, 20),
    },
  });
}

/** Los saca del grupo: vuelven a ser productos sueltos y al catálogo. */
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const huerfanos = await buscarHuerfanos();
  const porTabla = new Map<string, string[]>();
  for (const h of huerfanos) {
    porTabla.set(h.tabla, [...(porTabla.get(h.tabla) ?? []), h.id]);
  }

  let arreglados = 0;
  for (const [tabla, ids] of porTabla) {
    const d = getDelegate(tabla as TableKey);
    // `varianteOpciones` se limpia junto: describen en qué se diferencia de
    // hermanas que no existen, así que sueltas no significan nada.
    const r = await d
      .updateMany({ where: { id: { in: ids } }, data: { varianteDe: null, varianteOpciones: null } })
      .catch(() => ({ count: 0 }));
    arreglados += r.count;
  }

  clearCatalogCache();
  return NextResponse.json({ success: true, data: { arreglados } });
}
