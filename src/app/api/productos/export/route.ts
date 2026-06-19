import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET: Exportar productos a Excel (solo ADMIN)
export async function GET(req: NextRequest) {
  const rateErr = enforceRateLimit(req, {
    key: "export",
    limit: 5,
    windowMs: 60 * 1000,
  });
  if (rateErr) return rateErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para exportar" },
        { status: 403 },
      );
    }

    // Get all active products
    const productos = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Prepare data for Excel
    const data = productos.map((p) => ({
      SKU: p.sku,
      Nombre: p.nombre,
      Marca: p.marca,
      Descripción: p.descripcion || "",
      Precio: p.precio,
      Imagen: p.imagen || "",
      "Fecha Creación": p.createdAt.toISOString().split("T")[0],
      "Última Actualización": p.updatedAt.toISOString().split("T")[0],
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 40 },
      { wch: 10 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="productos.xlsx"',
      },
    });
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return NextResponse.json(
      { error: "Error al exportar a Excel" },
      { status: 500 }
    );
  }
}
