import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { decryptSecret, verifyTotp } from "@/lib/totp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { extractRequestContext, logAuthEvent } from "@/lib/audit";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const BodySchema = z.object({
  password: z.string().min(1).max(256),
  token: z.string().trim().regex(/^\d{6}$/, "Código de 6 dígitos"),
});

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "totp-disable",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (!user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA no está activado" }, { status: 400 });
  }

  // Doble verificación: password + código actual
  const passOk = await bcryptjs.compare(parsed.data.password, user.passwordHash);
  if (!passOk) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
  }

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecret);
  } catch {
    return NextResponse.json({ error: "Secret inválido" }, { status: 500 });
  }

  if (!(await verifyTotp(parsed.data.token, secret))) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: false,
      totpSecret: null,
      totpBackupCodes: null,
    },
  });

  const { ip, userAgent } = extractRequestContext(req);
  await logAuthEvent({
    type: "TOTP_DISABLED",
    userId: user.id,
    email: user.email,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
