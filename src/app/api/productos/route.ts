// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DB_NAMES, normalizeAdminRow, TABLE_LABELS, type TableKey, TABLE_KEYS } from "@/lib/all-products";
import { getCategoryConfig } from "@/lib/category-fields";
import { prisma } from "@/lib/prisma";
import { parseIntSafe, sanitizeText, verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const SYSTEM_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "_tabla",
  "_tablaLabel",
]);

const JSON_STRING_FIELDS = new Set(["metadatos", "imagenes"]);

function sanitizeProductData(tablaNombre: string, raw: Record<string, unknown>) {
  const config = getCategoryConfig(tablaNombre);
  if (!config) {
    throw new Error(`Tabla desconocida: ${tablaNombre}`);
  }

  const numberFields = new Set(
    config.fields.filter((field) => field.type === "number").map((field) => field.key),
  );
  const allowedFields = new Set(config.fields.map((field) => field.key));
  allowedFields.add("metadatos");
  allowedFields.add("imagenes");

  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (SYSTEM_FIELDS.has(key) || !allowedFields.has(key)) continue;
    if (value === undefined) continue;

    if (numberFields.has(key)) {
      if (value === null || value === "") {
        data[key] = null;
        continue;
      }

      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) continue;
      data[key] = parsed;
      continue;
    }

    if (key === "isActive") {
      data[key] = value === true || value === "true";
      continue;
    }

    if (JSON_STRING_FIELDS.has(key)) {
      if (typeof value === "string" && value.trim()) {
        data[key] = value;
      }
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      data[key] = trimmed === "" ? null : trimmed;
      continue;
    }

    if (value === null) {
      data[key] = null;
    }
  }

  const requiredFields = config.fields.filter((field) => field.required).map((field) => field.key);

  return { config, data, requiredFields };
}

function missingRequiredFields(requiredFields: string[], data: Record<string, unknown>) {
  return requiredFields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });
}

// ─── GET: listar todos los productos de todas las tablas ──────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sp         = req.nextUrl.searchParams;
    const search     = sanitizeText(sp.get("search")  ?? "", 100);
    const marca      = sanitizeText(sp.get("marca")   ?? "", 100);
    const tablaFilter = sanitizeText(sp.get("tabla")  ?? "", 60);
    const estado     = sp.get("estado") ?? "activo";
    const skip       = parseIntSafe(sp.get("skip"),  0,  0, 1_000_000);
    const take       = parseIntSafe(sp.get("take"), 10,  1, 200);

    // Decide qué tablas consultar + filtro especial para revestimientos ext/int
    let catPrincipalFilter: string | null = null;
    let effectiveTabla = tablaFilter;
    if (tablaFilter === "revestimientos_ext") {
      effectiveTabla = "revestimientos";
      catPrincipalFilter = "Espacios Exterior";
    } else if (tablaFilter === "revestimientos_int") {
      effectiveTabla = "revestimientos";
      catPrincipalFilter = "Espacios Interiores";
    }

    const keys: TableKey[] = effectiveTabla
      ? TABLE_KEYS.filter((k) => DB_NAMES[k] === effectiveTabla || k === effectiveTabla)
      : TABLE_KEYS;

    // Construye filtros comunes
    const isActive = estado === "activo" ? true : estado === "inactivo" ? false : undefined;

    // Consulta todas las tablas en paralelo
    const results = await Promise.all(
      keys.map(async (key) => {
        const delegate = (prisma as Record<string, { findMany: Function; count: Function }>)[key];
        if (!delegate) return [];

        const where: Record<string, unknown> = {};
        if (isActive !== undefined) where.isActive = isActive;
        if (marca) where.marca = marca;
        if (catPrincipalFilter && key === "revestimiento") where.categoriaPrincipal = catPrincipalFilter;

        if (search) {
          const searchFields = key === "pisoMadera"
            ? ["especie", "sku", "marca"]
            : key === "madera"
            ? ["nombre", "sku", "origen"]
            : ["nombre", "sku", "marca"];

          where.OR = searchFields.map((f) => ({ [f]: { contains: search } }));
        }

        const rows = await delegate.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 2000, // trae muchos para paginar en memoria
        });

        return (rows as Record<string, unknown>[]).map((r) => {
          if (tablaFilter) {
            const labelOverride = tablaFilter === "revestimientos_ext" ? "Revestimientos Exteriores"
              : tablaFilter === "revestimientos_int" ? "Revestimientos Interiores"
              : TABLE_LABELS[key];
            return { ...(r as any), _tabla: DB_NAMES[key], _tablaLabel: labelOverride };
          }
          return normalizeAdminRow(r, key);
        });
      })
    );

    // Combina, ordena por createdAt desc y pagina
    const all = results
      .flat()
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    const total       = all.length;
    const productos   = all.slice(skip, skip + take);
    const totalPages  = Math.ceil(total / take);

    return NextResponse.json({
      success: true,
      data: {
        productos,
        total,
        page: Math.floor(skip / take) + 1,
        totalPages,
        tablas: TABLE_KEYS.map((k) => ({ key: k, label: TABLE_LABELS[k], tabla: DB_NAMES[k] })),
      },
    });
  } catch (error) {
    console.error("[productos GET] error:", error);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

// ─── POST: crear producto en la tabla indicada ────────────────────────────────
// Requiere campo `tabla` con el nombre DB (ej: "pisos_flotantes")

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const tablaNombre = raw._tabla as string;
    if (!tablaNombre) {
      return NextResponse.json({ error: "Campo _tabla requerido" }, { status: 400 });
    }

    const tableKey = TABLE_KEYS.find((k) => DB_NAMES[k] === tablaNombre);
    if (!tableKey) {
      return NextResponse.json({ error: `Tabla desconocida: ${tablaNombre}` }, { status: 400 });
    }

    const delegate = (prisma as Record<string, { findUnique: Function; create: Function }>)[tableKey];

    const existing = await delegate.findUnique({ where: { sku: raw.sku as string } });
    if (existing) {
      return NextResponse.json({ error: "SKU ya existe en esta categoría" }, { status: 409 });
    }

    // Campos genéricos del formulario → campos específicos de cada tabla
    const PRICE_FIELD: Record<string, string> = {
      pisos_flotantes: "precioM2",
      porcellanatos:   "precioM2",
      revestimientos:  "precioM2",
      pisos_vinilicos: "precioM2",
      pisos_madera:    "precioM2",
      decks:           "precioM2",
      maderas:         "precio",
      accesorios:      "precioM2",
    };

    const { config, data, requiredFields } = sanitizeProductData(tablaNombre, raw);

    if (raw.precio !== undefined && data[PRICE_FIELD[tablaNombre] ?? "precioM2"] === undefined) {
      const priceField = PRICE_FIELD[tablaNombre] ?? "precioM2";
      const parsed = typeof raw.precio === "number" ? raw.precio : Number(raw.precio);
      if (Number.isFinite(parsed)) {
        data[priceField] = parsed;
      }
    }

    if (data.isActive === undefined) {
      data.isActive = true;
    }

    const missing = missingRequiredFields(requiredFields, data);
    if (missing.length > 0) {
      const labels = config.fields
        .filter((field) => missing.includes(field.key))
        .map((field) => field.label);
      return NextResponse.json({ error: `Faltan campos requeridos: ${labels.join(", ")}` }, { status: 400 });
    }

    const producto = await delegate.create({ data });

    await prisma.changeLog.create({
      data: {
        tablaNombre,
        entidadId:    producto.id,
        usuarioId:    session.user.id,
        campo:        "PRODUCTO",
        valorAnterior: null,
        valorNuevo:   JSON.stringify(producto),
        tipo:         "CREATE",
      },
    });

    return NextResponse.json({ success: true, data: producto }, { status: 201 });
  } catch (error) {
    console.error("[productos POST] error:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}


