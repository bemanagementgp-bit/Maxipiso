import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, empresa, telefono, email, mensaje } = body;

  if (!nombre || !telefono || !email || !mensaje) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  // Envío via Resend — configurar RESEND_API_KEY en variables de entorno
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY no configurada");
    return NextResponse.json({ error: "Servidor no configurado" }, { status: 500 });
  }

  const htmlBody = `
    <h2>Nuevo mensaje desde maxipiso.com.ar</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Nombre</td><td style="padding:8px">${nombre}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Empresa</td><td style="padding:8px">${empresa || "—"}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Teléfono</td><td style="padding:8px">${telefono}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Email</td><td style="padding:8px">${email}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Mensaje</td><td style="padding:8px">${mensaje}</td></tr>
    </table>
  `;

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
      subject: `Nuevo contacto web: ${nombre}${empresa ? ` — ${empresa}` : ""}`,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
