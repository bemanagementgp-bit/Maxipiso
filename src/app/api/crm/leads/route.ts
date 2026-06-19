import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText, verifyOrigin } from "@/lib/security";
import { hashIp, normalizePhone, upsertLeadAndInteraction } from "@/lib/crm";

export const runtime = "nodejs";

const LeadSchema = z.object({
  nombre: z.string().trim().min(2).max(150),
  telefono: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(150).optional().or(z.literal("")),
  url_origen: z.string().trim().max(512).optional().or(z.literal("")),
  mensaje_inicial: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "crm-leads",
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (rateErr) return rateErr;

  if (!process.env.CRM_DATABASE_URL) {
    console.error("[crm/leads] CRM_DATABASE_URL no configurada");
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const nombre = sanitizeText(parsed.data.nombre, 150);
  const telefono = sanitizeText(parsed.data.telefono, 30);

  if (normalizePhone(telefono).length < 8) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }

  const emailRaw = parsed.data.email ? sanitizeText(parsed.data.email, 150) : "";
  const urlOrigen = parsed.data.url_origen ? sanitizeText(parsed.data.url_origen, 512) : null;
  const mensajeInicial = parsed.data.mensaje_inicial
    ? sanitizeText(parsed.data.mensaje_inicial, 2000)
    : null;

  const userAgent = sanitizeText(req.headers.get("user-agent") ?? "", 255) || null;
  const ipHash = hashIp(getClientIp(req));

  try {
    const cliente = await upsertLeadAndInteraction({
      nombre,
      telefono,
      email: emailRaw || null,
      urlOrigen,
      mensajeInicial,
      userAgent,
      ipHash,
    });

    return NextResponse.json({ ok: true, clienteId: cliente.id });
  } catch (err) {
    console.error("[crm/leads] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "No pudimos registrar tu consulta. Intentá de nuevo." },
      { status: 502 },
    );
  }
}
