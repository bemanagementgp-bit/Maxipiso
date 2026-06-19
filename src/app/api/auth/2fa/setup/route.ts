import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import {
  buildOtpAuthUrl,
  encryptSecret,
  generateTotpSecret,
} from "@/lib/totp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Genera un nuevo secret TOTP y devuelve el QR + secret para mostrar al usuario.
 * El secret se guarda cifrado pero con totpEnabled=false hasta que confirme con un código válido.
 */
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "totp-setup",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (user.totpEnabled) {
    return NextResponse.json(
      { error: "2FA ya está activado. Desactívalo primero." },
      { status: 400 },
    );
  }

  const secret = generateTotpSecret();
  const otpAuthUrl = buildOtpAuthUrl(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { errorCorrectionLevel: "M" });

  // Persistimos cifrado pero sin habilitar todavía
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret: encryptSecret(secret),
      totpEnabled: false,
    },
  });

  return NextResponse.json({
    qrDataUrl,
    secret, // se muestra una sola vez para que el usuario pueda ingresarlo manualmente
  });
}
