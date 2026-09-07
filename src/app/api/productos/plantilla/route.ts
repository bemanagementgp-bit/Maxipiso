import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import { SHEET_SCHEMAS, type SheetSchema } from "@/lib/sheet-schemas";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Plantilla de importacion masiva.
 *
 * Una hoja por categoria con sus columnas, mas una hoja de instrucciones. Los
 * encabezados salen del `fieldMap` del schema, que es el mismo que lee la
 * importacion: la plantilla y el parser no pueden desincronizarse.
 */

/**
 * Un encabezado por columna de la base.
 *
 * El `fieldMap` tiene varias claves que apuntan al mismo campo —`imagen` e
 * `imagenes` son la misma columna— para aceptar las dos formas al importar. En
 * la plantilla se emite **una sola**, la primera de cada campo en el orden del
 * maestro. Antes se filtraba literalmente `"imagen"`, y las categorias cuya
 * unica clave era esa (revestimientos, deck, maderas) quedaban sin ninguna
 * columna de foto.
 */
function encabezadosDe(schema: SheetSchema): string[] {
  const vistos = new Set<string>();
  const headers: string[] = [];
  for (const [header, campo] of Object.entries(schema.fieldMap)) {
    if (vistos.has(campo)) continue;
    vistos.add(campo);
    headers.push(header);
  }
  return headers;
}

function titulo(header: string): string {
  return header.charAt(0).toUpperCase() + header.slice(1);
}

async function hojaDeInstrucciones(): Promise<string[][]> {
  const stickers = await prisma.sticker
    .findMany({ where: { isActive: true }, orderBy: [{ posicion: "asc" }, { orden: "asc" }], select: { nombre: true } })
    .catch(() => []);

  return [
    ["CÓMO USAR ESTA PLANILLA"],
    [],
    ["1.", "Una hoja por categoría. Completá sólo las que vayas a cargar."],
    ["2.", "No cambies los encabezados: es por ahí que el sistema reconoce la categoría."],
    ["3.", "El SKU es la clave. Si ya existe, el producto se actualiza; si no, se crea."],
    ["4.", "Podés dejar columnas vacías: no se tocan."],
    [],
    ["COLUMNAS ESPECIALES"],
    [],
    ["Imagen", "URL de la foto. Varias separadas por | (la primera es la portada)."],
    ["Stickers", "Nombres de los stickers separados por |. Ej: Oferta | Waterproof"],
    ["Complementarios", "SKUs de los productos complementarios separados por |. Ej: ZOC-001 | PERF-220"],
    [],
    ["", "En Stickers y Complementarios también sirven la coma y el punto y coma."],
    ["", "Lo que no se encuentre se avisa al terminar y se ignora: la fila entra igual."],
    ["", "Un complementario puede ser de cualquier categoría, no sólo accesorios."],
    [],
    ["STICKERS DISPONIBLES HOY"],
    [],
    ...(stickers.length > 0
      ? stickers.map((s) => ["", s.nombre])
      : [["", "(todavía no hay stickers cargados — se crean en Panel → Stickers)"]]),
  ];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const categoria = req.nextUrl.searchParams.get("categoria");
  const schemas = categoria ? SHEET_SCHEMAS.filter((s) => s.id === categoria) : SHEET_SCHEMAS;
  if (schemas.length === 0) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  const wb = XLSX.utils.book_new();

  // Las instrucciones van primero: es la hoja que se abre al abrir el archivo.
  const instrucciones = XLSX.utils.aoa_to_sheet(await hojaDeInstrucciones());
  instrucciones["!cols"] = [{ wch: 18 }, { wch: 78 }];
  XLSX.utils.book_append_sheet(wb, instrucciones, "Instrucciones");

  for (const schema of schemas) {
    const headers = encabezadosDe(schema);
    const ws = XLSX.utils.aoa_to_sheet([headers.map(titulo)]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
    // La fila de encabezados queda fija al hacer scroll: son 30 columnas y sin
    // esto, en la fila 40 no se sabe que se esta completando.
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, schema.label.slice(0, 31));
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = categoria ? `plantilla-${categoria}.xlsx` : "plantilla-maxipiso.xlsx";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
