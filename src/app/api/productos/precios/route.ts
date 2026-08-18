import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DB_NAMES,
  TABLE_KEYS,
  getDelegate,
  tableKeyFromDbName,
  type TableKey,
} from "@/lib/all-products";
import { aceptaCampo, getCamposDeDinero, getTodasLasCategorias } from "@/lib/price-fields";
import { prisma } from "@/lib/prisma";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { parseIntSafe, sanitizeText, verifyOrigin } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Grilla de precios y stock.
 *
 * Existe aparte de `/api/productos` por dos motivos concretos:
 *
 *  1. **Peso.** Aquel endpoint devuelve la fila entera —descripción, imágenes,
 *     metadatos, fichas— y trae 2.000 filas por tabla para paginar en memoria.
 *     Para una grilla de precios eso es traer megabytes para mostrar cuatro
 *     números por fila. Acá se hace `select` de lo que se muestra y nada más.
 *  2. **Escritura en lote.** El `PUT /api/productos/[id]` actualiza de a un
 *     producto. Actualizar una lista de precios entera con eso son 200 requests
 *     y 200 round-trips a Turso.
 */

// ─── Campos de identidad que la grilla muestra además de los importes ────────

const IDENTIDAD = ["id", "sku", "nombre", "marca", "isActive", "updatedAt"];
/** Tablas que no tienen la columna `marca`. */
const SIN_MARCA = new Set<TableKey>(["madera", "accesorio"]);
/** `pisos_madera` deja `nombre` opcional y usa `especie`. */
const CON_ESPECIE = new Set<TableKey>(["pisoMadera"]);

function construirSelect(key: TableKey): Record<string, boolean> {
  const select: Record<string, boolean> = {};
  for (const campo of IDENTIDAD) {
    if (campo === "marca" && SIN_MARCA.has(key)) continue;
    select[campo] = true;
  }
  if (CON_ESPECIE.has(key)) select.especie = true;

  const dinero = getCamposDeDinero(DB_NAMES[key]);
  for (const campo of dinero?.precios ?? []) select[campo.key] = true;
  if (dinero?.stock) select.stock = true;
  if (dinero?.moneda) select.moneda = true;

  return select;
}

const CAMPOS_BUSQUEDA: Record<TableKey, string[]> = {
  pisoFlotante: ["nombre", "sku", "marca"],
  porcellanato: ["nombre", "sku", "marca"],
  revestimiento: ["nombre", "sku", "marca"],
  pisoVinilico: ["nombre", "sku", "marca"],
  pisoMadera: ["especie", "sku", "marca"],
  deck: ["nombre", "sku", "marca"],
  madera: ["nombre", "sku"],
  accesorio: ["nombre", "sku"],
};

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const search = sanitizeText(sp.get("search") ?? "", 100);
    const marca = sanitizeText(sp.get("marca") ?? "", 100);
    const tablaFilter = sanitizeText(sp.get("tabla") ?? "", 60);
    const estado = sp.get("estado") ?? "todos";
    const faltantes = sp.get("faltantes") ?? ""; // "precio" | "stock" | ""
    const skip = parseIntSafe(sp.get("skip"), 0, 0, 1_000_000);
    const take = parseIntSafe(sp.get("take"), 100, 1, 500);

    const keys = tablaFilter
      ? TABLE_KEYS.filter((k) => DB_NAMES[k] === tablaFilter)
      : TABLE_KEYS;
    if (tablaFilter && keys.length === 0) {
      return NextResponse.json({ error: "Categoría desconocida" }, { status: 400 });
    }

    const isActive = estado === "activo" ? true : estado === "inactivo" ? false : undefined;

    const porTabla = await Promise.all(
      keys.map(async (key) => {
        const where: Record<string, unknown> = {};
        if (isActive !== undefined) where.isActive = isActive;
        if (marca && !SIN_MARCA.has(key)) where.marca = marca;
        if (marca && SIN_MARCA.has(key)) return []; // esa marca no aplica acá
        if (search) {
          where.OR = (CAMPOS_BUSQUEDA[key] ?? ["nombre", "sku"]).map((f) => ({
            [f]: { contains: search },
          }));
        }

        const rows = await getDelegate(key)
          .findMany({
            where,
            select: construirSelect(key),
            orderBy: [{ sortOrder: "asc" }, { sku: "asc" }],
          })
          .catch((err) => {
            // Que una tabla falle no puede dejar la grilla entera en blanco.
            console.error(`[precios GET] falló ${DB_NAMES[key]}:`, err);
            return [] as Record<string, unknown>[];
          });

        return rows.map(
          (r) => ({ ...r, _tabla: DB_NAMES[key] }) as Record<string, unknown>,
        );
      }),
    );

    let filas: Record<string, unknown>[] = porTabla.flat();

    // Filtros que no se pueden expresar en el `where` porque el nombre de la
    // columna de precio cambia según la tabla.
    if (faltantes === "precio") {
      filas = filas.filter((fila) => {
        const campos = getCamposDeDinero(String(fila._tabla))?.precios ?? [];
        if (campos.length === 0) return false; // accesorios no tienen precio
        return campos.every((c) => fila[c.key] === null || fila[c.key] === undefined);
      });
    } else if (faltantes === "stock") {
      filas = filas.filter((fila) => fila.stock === null || fila.stock === undefined || fila.stock === 0);
    }

    const total = filas.length;

    // Marcas presentes, para poblar el filtro sin una consulta aparte.
    const marcas = [...new Set(filas.map((f) => String(f.marca ?? "").trim()).filter(Boolean))].sort();

    return NextResponse.json({
      success: true,
      data: {
        filas: filas.slice(skip, skip + take),
        total,
        marcas,
        categorias: getTodasLasCategorias().map((c) => ({
          tabla: c.tabla,
          label: c.label,
          dot: c.dot,
          precios: c.precios.map((p) => ({ key: p.key, label: p.label })),
          tieneStock: c.stock !== null,
          tieneMoneda: c.moneda !== null,
        })),
      },
    });
  } catch (error) {
    console.error("[precios GET] error:", error);
    return NextResponse.json({ error: "Error al obtener la grilla de precios" }, { status: 500 });
  }
}

// ─── PATCH: aplicar muchos cambios en una sola request ───────────────────────

type CambioEntrante = {
  id?: unknown;
  tabla?: unknown;
  campos?: unknown;
};

const MAX_CAMBIOS = 500;
const CUID_RE = /^c[a-z0-9]{20,30}$/i;
const MONEDAS = new Set(["ARS", "USD"]);
/** Tope defensivo: un precio de 13 cifras es un error de tipeo, no un precio. */
const MAX_IMPORTE = 1_000_000_000;
const MAX_STOCK = 10_000_000;

export async function PATCH(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, { key: "precios", limit: 60, windowMs: 5 * 60 * 1000 });
  if (rateErr) return rateErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    let body: { cambios?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const cambios = body.cambios;
    if (!Array.isArray(cambios) || cambios.length === 0) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 });
    }
    if (cambios.length > MAX_CAMBIOS) {
      return NextResponse.json(
        { error: `Demasiados cambios en una sola tanda (máximo ${MAX_CAMBIOS})` },
        { status: 400 },
      );
    }

    const aplicados: string[] = [];
    const errores: { id: string; error: string }[] = [];

    for (const bruto of cambios as CambioEntrante[]) {
      const id = typeof bruto?.id === "string" ? bruto.id : "";
      const tabla = typeof bruto?.tabla === "string" ? bruto.tabla : "";

      if (!CUID_RE.test(id)) {
        errores.push({ id: id || "(sin id)", error: "id inválido" });
        continue;
      }
      const key = tableKeyFromDbName(tabla);
      if (!key) {
        errores.push({ id, error: `categoría desconocida: ${tabla}` });
        continue;
      }
      if (!bruto.campos || typeof bruto.campos !== "object" || Array.isArray(bruto.campos)) {
        errores.push({ id, error: "sin campos" });
        continue;
      }

      // Validación campo por campo contra la config de ESA tabla. Es el punto
      // que evita mandarle a Prisma una columna que la tabla no tiene.
      const data: Record<string, unknown> = {};
      let rechazo: string | null = null;

      for (const [campo, valor] of Object.entries(bruto.campos as Record<string, unknown>)) {
        if (!aceptaCampo(tabla, campo)) {
          rechazo = `"${campo}" no existe en ${tabla}`;
          break;
        }

        if (campo === "moneda") {
          if (valor === null || valor === "") { data.moneda = null; continue; }
          const texto = String(valor).trim().toUpperCase();
          if (!MONEDAS.has(texto)) { rechazo = `moneda inválida: ${texto}`; break; }
          data.moneda = texto;
          continue;
        }

        if (valor === null || valor === "") { data[campo] = null; continue; }

        const numero = typeof valor === "number" ? valor : Number(valor);
        if (!Number.isFinite(numero) || numero < 0) {
          rechazo = `"${campo}" tiene que ser un número mayor o igual a cero`;
          break;
        }

        if (campo === "stock") {
          if (numero > MAX_STOCK) { rechazo = "stock fuera de rango"; break; }
          data.stock = Math.round(numero);
          continue;
        }

        if (numero > MAX_IMPORTE) { rechazo = `"${campo}" fuera de rango`; break; }
        // Los importes se guardan con dos decimales: sin esto un aumento por
        // porcentaje deja 14372.450000000001 en la base.
        data[campo] = Math.round(numero * 100) / 100;
      }

      if (rechazo) { errores.push({ id, error: rechazo }); continue; }
      if (Object.keys(data).length === 0) { errores.push({ id, error: "sin cambios válidos" }); continue; }

      const delegate = getDelegate(key);
      const previo = await delegate.findUnique({ where: { id }, select: { ...construirSelect(key) } });
      if (!previo) { errores.push({ id, error: "producto no encontrado" }); continue; }

      try {
        await delegate.update({ where: { id }, data });
      } catch (err) {
        console.error(`[precios PATCH] update ${tabla}/${id} falló:`, err);
        errores.push({ id, error: "no se pudo guardar" });
        continue;
      }

      // Historial por campo, igual que el ABM: es lo que alimenta el reporte de
      // precio histórico y la única forma de saber quién tocó qué.
      for (const [campo, valor] of Object.entries(data)) {
        const anterior = (previo as Record<string, unknown>)[campo];
        if (anterior === valor) continue;
        await prisma.changeLog.create({
          data: {
            tablaNombre: tabla,
            entidadId: id,
            usuarioId: session.user.id,
            campo,
            valorAnterior: String(anterior ?? ""),
            valorNuevo: String(valor ?? ""),
            tipo: "UPDATE",
          },
        }).catch((err) => {
          // Un fallo del historial no puede tumbar un precio ya guardado.
          console.error("[precios PATCH] changeLog falló:", err);
        });
      }

      aplicados.push(id);
    }

    if (aplicados.length > 0) clearCatalogCache();

    return NextResponse.json({
      success: errores.length === 0,
      data: { aplicados: aplicados.length, errores },
    });
  } catch (error) {
    console.error("[precios PATCH] error:", error);
    return NextResponse.json({ error: "Error al guardar los cambios" }, { status: 500 });
  }
}
