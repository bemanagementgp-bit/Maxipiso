import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  decryptSecret,
  generateBackupCodes,
  hashBackupCodes,
  verifyTotp,
} from "@/lib/totp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { extractRequestContext, logAuthEvent } from "@/lib/audit";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const BodySchema = z.object({
  token: z.string().trim().regex(/^\d{6}$/, "Código de 6 dígitos"),
});

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "totp-enable",
    limit: 10,
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
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.totpSecret) {
    return NextResponse.json(
      { error: "Debes iniciar el setup primero" },
      { status: 400 },
    );
  }
  if (user.totpEnabled) {
    return NextResponse.json({ error: "2FA ya está activado" }, { status: 400 });
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

  // Generar códigos de recuperación
  const backupCodes = generateBackupCodes(10);
  const backupHashes = await hashBackupCodes(backupCodes);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpBackupCodes: backupHashes,
    },
  });

  const { ip, userAgent } = extractRequestContext(req);
  await logAuthEvent({
    type: "TOTP_ENABLED",
    userId: user.id,
    email: user.email,
    ip,
    userAgent,
  });

  return NextResponse.json({
    ok: true,
    backupCodes, // mostrar UNA sola vez al usuario
  });
}
