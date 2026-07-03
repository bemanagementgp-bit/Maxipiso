import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: devuelve conteo de productos por categoría para el hub
export async function GET() {
  try {
    const [
      pisosFlotantes,
      porcellanatos,
      revestimientos,
      pisosVinilicos,
      pisosMadera,
      decks,
      maderas,
      accesorios,
    ] = await Promise.all([
      prisma.pisoFlotante.count({ where: { isActive: true } }),
      prisma.porcellanato.count({ where: { isActive: true } }),
      prisma.revestimiento.count({ where: { isActive: true } }),
      prisma.pisoVinilico.count({ where: { isActive: true } }),
      prisma.pisoMadera.count({ where: { isActive: true } }),
      prisma.deck.count({ where: { isActive: true } }),
      prisma.madera.count({ where: { isActive: true } }),
      prisma.accesorio.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        categorias: [
          {
            slug: "pisos",
            label: "Pisos",
            total: pisosFlotantes + porcellanatos + pisosVinilicos + pisosMadera,
            sub: {
              flotantes: pisosFlotantes,
              porcellanatos,
              vinilicos: pisosVinilicos,
              madera: pisosMadera,
            },
          },
          { slug: "maderas",         label: "Maderas",         total: maderas },
          { slug: "decks",           label: "Decks",           total: decks },
          { slug: "revestimientos",  label: "Revestimientos",  total: revestimientos },
          { slug: "accesorios",      label: "Accesorios",      total: accesorios },
        ],
      },
    });
  } catch (error) {
    console.error("[catalogo GET] error:", error);
    return NextResponse.json({ error: "Error al obtener catálogo" }, { status: 500 });
  }
}

