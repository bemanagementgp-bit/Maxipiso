import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { escapeHtml, sanitizeText, verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const ContactoSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  empresa: z.string().trim().max(120).optional().or(z.literal("")),
  telefono: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(254),
  mensaje: z.string().trim().min(5).max(2000),
});

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "contacto",
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (rateErr) return rateErr;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = ContactoSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos" },
      { status: 400 },
    );
  }

  const nombre = sanitizeText(parsed.data.nombre, 120);
  const empresa = sanitizeText(parsed.data.empresa ?? "", 120);
  const telefono = sanitizeText(parsed.data.telefono, 40);
  const email = sanitizeText(parsed.data.email, 254);
  const mensaje = sanitizeText(parsed.data.mensaje, 2000);

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("[contacto] RESEND_API_KEY no configurada");
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  // TODOS los valores se escapan antes de inyectar en HTML
  const htmlBody = `
    <h2>Nuevo mensaje desde maxipiso.com.ar</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Nombre</td><td style="padding:8px">${escapeHtml(nombre)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Empresa</td><td style="padding:8px">${escapeHtml(empresa || "—")}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Teléfono</td><td style="padding:8px">${escapeHtml(telefono)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Email</td><td style="padding:8px">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Mensaje</td><td style="padding:8px;white-space:pre-wrap">${escapeHtml(mensaje)}</td></tr>
    </table>
  `;

  // Asunto: prevenir header injection eliminando CR/LF
  const safeSubjectName = nombre.replace(/[\r\n]/g, " ").slice(0, 80);
  const safeSubjectEmpresa = empresa.replace(/[\r\n]/g, " ").slice(0, 80);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "contacto@maxipiso.com.ar",
        to: "ventas@maxipiso.com.ar",
        reply_to: email,
        subject: `Nuevo contacto web: ${safeSubjectName}${safeSubjectEmpresa ? ` — ${safeSubjectEmpresa}` : ""}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      console.error("[contacto] Resend status:", res.status);
      return NextResponse.json({ error: "Error al enviar email" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contacto] fetch error:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 502 });
  }
}
