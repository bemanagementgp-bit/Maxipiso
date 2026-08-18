import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sanitizeText, verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

/** Deja solo digitos para poder deduplicar el mismo telefono escrito distinto. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

const BodySchema = z.object({
  nombre: z.string().trim().min(2).max(150),
  telefono: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(150).optional().or(z.literal("")),
  mensaje: z.string().trim().max(2000).optional().or(z.literal("")),
  origenUrl: z.string().trim().max(512).optional().or(z.literal("")),
});

/**
 * Registra un lead del chatbot antes de derivarlo a WhatsApp.
 *
 * Es publico a proposito: lo llama el widget de chat del sitio, sin sesion.
 * La proteccion es rate limit + verificacion de Origin + validacion estricta.
 *
 * Se deduplica por telefono normalizado: si la persona vuelve, se actualizan
 * sus datos y se incrementa el contador de interacciones en vez de crear una
 * fila nueva.
 */
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "leads",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (rateErr) return rateErr;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const nombre = sanitizeText(parsed.data.nombre, 150);
  const telefono = sanitizeText(parsed.data.telefono, 30);
  const telefonoNormalizado = normalizePhone(telefono);
  const email = parsed.data.email ? sanitizeText(parsed.data.email, 150).toLowerCase() : null;
  const mensaje = parsed.data.mensaje ? sanitizeText(parsed.data.mensaje, 2000) : null;
  const origenUrl = parsed.data.origenUrl ? sanitizeText(parsed.data.origenUrl, 512) : null;

  if (telefonoNormalizado.length < 7) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }

  const userAgent = sanitizeText(req.headers.get("user-agent") ?? "", 255) || null;

  try {
    const lead = await prisma.lead.upsert({
      where: { telefonoNormalizado },
      create: {
        nombre,
        telefono,
        telefonoNormalizado,
        email,
        mensaje,
        origenUrl,
        userAgent,
      },
      update: {
        nombre,
        telefono,
        // No pisar un dato bueno con uno vacio si esta vez no lo dejo.
        ...(email ? { email } : {}),
        ...(mensaje ? { mensaje } : {}),
        ...(origenUrl ? { origenUrl } : {}),
        userAgent,
        interacciones: { increment: 1 },
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, data: { id: lead.id } }, { status: 201 });
  } catch (err) {
    console.error("[leads] error al guardar:", err);
    return NextResponse.json({ error: "Error al registrar el contacto" }, { status: 500 });
  }
}
