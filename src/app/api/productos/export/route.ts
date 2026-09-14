import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import { enforceRateLimit } from "@/lib/rate-limit";
import { construirHojas } from "@/lib/planilla-export";

export const runtime = "nodejs";

/**
 * Exportacion del catalogo, con la forma de la plantilla de importacion.
 *
 * Una hoja por categoria y las mismas columnas que la plantilla, incluidas las
 * que todavia no tienen datos. Lo que sale de aca se completa en Excel y se
 * vuelve a importar sin tocar los encabezados.
 *
 * Antes devolvia una sola hoja con ocho columnas genericas (SKU, nombre, marca,
 * precio…), que servia para mirar pero no para volver a cargar.
 *
 * `?categoria=<id>` exporta una sola; sin el parametro, las ocho.
 * `?activos=1` deja afuera los productos apagados; por defecto van todos,
 * porque quien exporta para editar en masa no quiere perderlos de vista.
 */
export async function GET(req: NextRequest) {
  const rateErr = enforceRateLimit(req, { key: "export", limit: 5, windowMs: 60 * 1000 });
  if (rateErr) return rateErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No tienes permisos para exportar" }, { status: 403 });
    }

    const categoria = req.nextUrl.searchParams.get("categoria");
    const soloActivos = req.nextUrl.searchParams.get("activos") === "1";

    const hojas = await construirHojas({ categoria, soloActivos });
    if (hojas.length === 0) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const wb = XLSX.utils.book_new();
    for (const hoja of hojas) {
      const ws = XLSX.utils.aoa_to_sheet([
        hoja.encabezados.map((h) => h.charAt(0).toUpperCase() + h.slice(1)),
        ...hoja.filas,
      ]);
      ws["!cols"] = hoja.encabezados.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
      // La fila de encabezados queda fija al hacer scroll: son 30 columnas y
      // cientos de filas, y sin esto no se sabe qué se está mirando.
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws, hoja.nombre.slice(0, 31));
    }

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    const fecha = new Date().toISOString().split("T")[0];
    const filename = categoria ? `catalogo-${categoria}-${fecha}.xlsx` : `catalogo-maxipiso-${fecha}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[export] error:", error);
    return NextResponse.json({ error: "Error al exportar a Excel" }, { status: 500 });
  }
}
