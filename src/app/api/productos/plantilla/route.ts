import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import { SHEET_SCHEMAS } from "@/lib/sheet-schemas";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const categoria = req.nextUrl.searchParams.get("categoria");

  const schemas = categoria
    ? SHEET_SCHEMAS.filter((s) => s.id === categoria)
    : SHEET_SCHEMAS;

  if (schemas.length === 0) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  const wb = XLSX.utils.book_new();

  for (const schema of schemas) {
    const headers = Object.keys(schema.fieldMap).filter(
      (h) => h !== "imagen"
    );
    const uniqueHeaders = [...new Set(headers)];

    const ws = XLSX.utils.aoa_to_sheet([
      uniqueHeaders.map((h) => h.charAt(0).toUpperCase() + h.slice(1)),
    ]);

    ws["!cols"] = uniqueHeaders.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

    XLSX.utils.book_append_sheet(wb, ws, schema.label.slice(0, 31));
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = categoria
    ? `plantilla-${categoria}.xlsx`
    : "plantilla-maxipiso.xlsx";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
