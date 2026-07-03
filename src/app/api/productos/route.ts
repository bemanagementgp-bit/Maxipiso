// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIntSafe, sanitizeText, verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

// ─── Tablas disponibles ───────────────────────────────────────────────────────

type TableKey =
  | "pisoFlotante"
  | "porcellanato"
  | "revestimiento"
  | "pisoVinilico"
  | "pisoMadera"
  | "deck"
  | "madera"
  | "accesorio";

const TABLE_KEYS: TableKey[] = [
  "pisoFlotante",
  "porcellanato",
  "revestimiento",
  "pisoVinilico",
  "pisoMadera",
  "deck",
  "madera",
  "accesorio",
];

const TABLE_LABELS: Record<TableKey, string> = {
  pisoFlotante:  "Pisos Flotantes",
  porcellanato:  "Porcellanatos",
  revestimiento: "Revestimientos",
  pisoVinilico:  "Pisos Vinílicos",
  pisoMadera:    "Pisos Madera e Ingeniería",
  deck:          "Decks",
  madera:        "Maderas",
  accesorio:     "Accesorios",
};

const DB_NAMES: Record<TableKey, string> = {
  pisoFlotante:  "pisos_flotantes",
  porcellanato:  "porcellanatos",
  revestimiento: "revestimientos",
  pisoVinilico:  "pisos_vinilicos",
  pisoMadera:    "pisos_madera",
  deck:          "decks",
  madera:        "maderas",
  accesorio:     "accesorios",
};

// ─── Normaliza un row a formato admin ─────────────────────────────────────────

function normalize(row: Record<string, unknown>, tableKey: TableKey) {
  return {
    id:           row.id,
    sku:          row.sku,
    nombre:       row.nombre ?? row.especie ?? row.sku,
    marca:        row.marca ?? null,
    precioM2:     row.precioM2 ?? row.precio ?? null,
    moneda:       row.moneda ?? null,
    stock:        row.stock ?? null,
    isActive:     row.isActive,
    createdAt:    row.createdAt,
    updatedAt:    row.updatedAt,
    descripcion:  row.descripcion ?? null,
    imagen:       row.imagen ?? (row.imagenes ? (() => { try { return JSON.parse(row.imagenes as string)[0] ?? null; } catch { return null; } })() : null),
    _tabla:       DB_NAMES[tableKey],
    _tablaLabel:  TABLE_LABELS[tableKey],
  };
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

    // Decide qué tablas consultar
    const keys: TableKey[] = tablaFilter
      ? TABLE_KEYS.filter((k) => DB_NAMES[k] === tablaFilter || k === tablaFilter)
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

        return (rows as Record<string, unknown>[]).map((r) => normalize(r, key));
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

    const { _tabla, _tablaLabel, ...data } = raw;
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


