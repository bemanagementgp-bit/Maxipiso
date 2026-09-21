import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findProductById, getDelegate, type TableKey } from "@/lib/all-products";
import { parseOpciones, serializarOpciones, skuDelPrincipal } from "@/lib/variantes";
import { getCamposDeDinero } from "@/lib/price-fields";
import { primeraImagen } from "@/lib/imagenes";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { sanitizeText, verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * El grupo de variantes de un producto, leído y guardado de una.
 *
 * Existe porque una variante **es otro producto**, y editarla desde la ficha
 * del principal significa crear, actualizar y desvincular filas hermanas. Eso
 * no entra en el `PUT` de un producto, que toca una sola fila.
 *
 * El grupo se identifica por el SKU del principal, igual que en la planilla:
 * `varianteDe` vacío significa "esta fila es la principal".
 */

/** Campos que nunca se copian del principal a una variante nueva. */
const NO_SE_COPIAN = new Set([
  "id", "sku", "createdAt", "updatedAt", "sortOrder",
  "varianteDe", "varianteOpciones", "imagenes",
  // El nombre lo manda el editor. Copiado a ciegas, las seis variantes de
  // "Roble Natural" se llamaban todas así, la Nogal incluida, y la ficha de
  // cada una salía con el nombre de otro color.
  "nombre",
]);

type FilaEditor = {
  id: string | null;
  sku: string;
  nombre: string;
  opciones: { tipo: string; valor: string }[];
  imagen: string | null;
  precio: number | null;
  stock: number | null;
  esPrincipal: boolean;
};

async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  return { error: null as null };
}

/**
 * Ubica el grupo a partir de cualquiera de sus miembros.
 *
 * Se puede abrir la ficha de una variante y no del principal, y el editor tiene
 * que mostrar el grupo entero igual.
 */
async function cargarGrupo(id: string) {
  const encontrado = await findProductById(id);
  if (!encontrado) return null;

  const { raw, tableKey, tablaNombre } = encontrado;
  const skuPrincipal = skuDelPrincipal(raw) ?? String(raw.sku ?? "").trim();
  if (!skuPrincipal) return null;

  const delegate = getDelegate(tableKey);
  const [principal, hermanas] = await Promise.all([
    delegate.findUnique({ where: { sku: skuPrincipal } }).catch(() => null),
    delegate.findMany({ where: { varianteDe: skuPrincipal } }).catch(() => []),
  ]);

  return { tableKey, tablaNombre, skuPrincipal, principal: principal ?? raw, hermanas };
}

function aFilaEditor(row: Record<string, unknown>, campoPrecio: string | null, esPrincipal: boolean): FilaEditor {
  return {
    id: String(row.id),
    sku: String(row.sku ?? ""),
    nombre: String(row.nombre ?? row.especie ?? ""),
    opciones: parseOpciones(row.varianteOpciones),
    imagen: primeraImagen(row.imagenes),
    precio: campoPrecio && row[campoPrecio] != null ? Number(row[campoPrecio]) : null,
    stock: row.stock != null ? Number(row.stock) : null,
    esPrincipal,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await exigirAdmin();
  if (permiso.error) return permiso.error;

  const { id } = await params;
  const grupo = await cargarGrupo(id);
  if (!grupo) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const dinero = getCamposDeDinero(grupo.tablaNombre);
  const campoPrecio = dinero?.precios[0]?.key ?? null;

  const filas: FilaEditor[] = [
    aFilaEditor(grupo.principal, campoPrecio, true),
    ...grupo.hermanas.map((h) => aFilaEditor(h, campoPrecio, false)),
  ];

  return NextResponse.json({
    success: true,
    data: {
      skuPrincipal: grupo.skuPrincipal,
      campoPrecio,
      etiquetaPrecio: dinero?.precios[0]?.label ?? null,
      tieneStock: !!dinero?.stock,
      filas,
    },
  });
}

/**
 * Reemplaza el grupo por lo que mandó el editor.
 *
 * Reconcilia contra lo que hay en la base:
 *  - fila con `id` → se actualiza
 *  - fila sin `id` cuyo SKU ya existe en esa tabla → se engancha al grupo, no
 *    se duplica. Es el caso de los productos que ya estaban cargados sueltos,
 *    que es exactamente lo que se quiere agrupar.
 *  - fila sin `id` con SKU nuevo → se crea copiando el principal
 *  - variante que estaba y ya no viene → se desvincula y se apaga
 *
 * Nunca borra: una variante es un producto con su historial de precios. Sacarla
 * del grupo la deja apagada y fuera del catálogo, y se puede volver a prender
 * desde la lista de productos.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;
  const permiso = await exigirAdmin();
  if (permiso.error) return permiso.error;

  const { id } = await params;
  const grupo = await cargarGrupo(id);
  if (!grupo) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const entrantes = Array.isArray(body?.filas) ? body.filas : null;
  if (!entrantes) return NextResponse.json({ error: "Faltan las filas" }, { status: 400 });
  if (entrantes.length > 60) {
    return NextResponse.json({ error: "Demasiadas variantes (máximo 60)" }, { status: 400 });
  }

  const delegate = getDelegate(grupo.tableKey as TableKey);
  const dinero = getCamposDeDinero(grupo.tablaNombre);
  const campoPrecio = dinero?.precios[0]?.key ?? null;
  const skuPrincipal = grupo.skuPrincipal;

  const numero = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  /** Lo que se escribe en una fila, sea nueva o existente. */
  const datosDe = (fila: Record<string, unknown>, esPrincipal: boolean) => {
    const data: Record<string, unknown> = {
      // Pasa por el mismo parser que la planilla: recorta, deduplica tipos y
      // descarta los pares a medio llenar. Lo que llega del navegador no se
      // confía más que lo que llega de un Excel.
      varianteOpciones: serializarOpciones(parseOpciones(opcionesComoTexto(fila.opciones))) || null,
      varianteDe: esPrincipal ? null : skuPrincipal,
    };
    const nombre = sanitizeText(fila.nombre, 200).trim();
    if (nombre) data.nombre = nombre;
    const img = sanitizeText(fila.imagen, 500).trim();
    if (img) data.imagenes = JSON.stringify([img]);
    if (campoPrecio) {
      const p = numero(fila.precio);
      if (p !== null) data[campoPrecio] = p;
    }
    if (dinero?.stock) {
      const s = numero(fila.stock);
      if (s !== null) data.stock = Math.round(s);
    }
    return data;
  };

  const vistos = new Set<string>();
  const creados: string[] = [];
  const errores: string[] = [];

  for (const fila of entrantes as Record<string, unknown>[]) {
    const sku = sanitizeText(fila.sku, 100).trim();
    const esPrincipal = fila.esPrincipal === true;
    if (!sku) { errores.push("Una variante quedó sin SKU y no se guardó."); continue; }
    if (vistos.has(sku.toLowerCase())) { errores.push(`El SKU ${sku} está repetido y sólo se guardó una vez.`); continue; }
    vistos.add(sku.toLowerCase());

    const data = datosDe(fila, esPrincipal);

    const idFila = typeof fila.id === "string" && fila.id ? fila.id : null;
    const existente = idFila
      ? { id: idFila }
      : await delegate.findUnique({ where: { sku } }).catch(() => null);

    if (existente) {
      await delegate.update({ where: { id: String(existente.id) }, data }).catch((e: unknown) => {
        errores.push(`No se pudo guardar ${sku}: ${e instanceof Error ? e.message : "error"}`);
      });
      continue;
    }

    // Nueva: se copia el principal y se pisa lo que la distingue. Copiar es lo
    // que hace que la variante nazca con la categoría, la marca y el resto de
    // los datos del producto, que es lo que se espera de "otro color del mismo
    // piso".
    const base: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(grupo.principal)) {
      if (NO_SE_COPIAN.has(k)) continue;
      base[k] = v;
    }
    try {
      await delegate.create({ data: { ...base, sku, isActive: true, ...data } });
      creados.push(sku);
    } catch (e: unknown) {
      errores.push(`No se pudo crear ${sku}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  // Las que estaban en el grupo y ya no vinieron.
  const idsQueQuedan = new Set(
    (entrantes as Record<string, unknown>[]).map((f) => String(f.id ?? "")).filter(Boolean),
  );
  const skusQueQuedan = new Set(
    (entrantes as Record<string, unknown>[]).map((f) => sanitizeText(f.sku, 100).trim().toLowerCase()).filter(Boolean),
  );
  const sacadas = grupo.hermanas.filter(
    (h) => !idsQueQuedan.has(String(h.id)) && !skusQueQuedan.has(String(h.sku ?? "").toLowerCase()),
  );
  for (const h of sacadas) {
    await delegate
      .update({ where: { id: String(h.id) }, data: { varianteDe: null, varianteOpciones: null, isActive: false } })
      .catch(() => errores.push(`No se pudo sacar del grupo ${String(h.sku ?? "")}.`));
  }

  clearCatalogCache();

  return NextResponse.json({
    success: errores.length === 0,
    data: { creados: creados.length, sacadas: sacadas.length, errores },
  });
}

/**
 * Las opciones llegan del editor como array y se vuelven la cadena de siempre.
 *
 * Así el camino del navegador y el del Excel terminan en el mismo parser, en
 * vez de tener cada uno su propia idea de qué es una opción válida.
 */
function opcionesComoTexto(valor: unknown): string {
  if (!Array.isArray(valor)) return "";
  return valor
    .map((o) => {
      const tipo = String((o as Record<string, unknown>)?.tipo ?? "").trim();
      const val = String((o as Record<string, unknown>)?.valor ?? "").trim();
      return tipo && val ? `${tipo}: ${val}` : "";
    })
    .filter(Boolean)
    .join(" ; ");
}
