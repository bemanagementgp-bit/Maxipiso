import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { checkPasswordStrength } from "@/lib/password";
import { enforceRateLimit } from "@/lib/rate-limit";
import { extractRequestContext, logAuthEvent } from "@/lib/audit";
import { verifyOrigin } from "@/lib/security";

export const runtime = "nodejs";

const BodySchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "password-change",
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

  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "La nueva contraseña debe ser distinta de la actual" },
      { status: 400 },
    );
  }

  const strength = checkPasswordStrength(newPassword);
  if (!strength.ok) {
    return NextResponse.json(
      { error: "Contraseña débil", reasons: strength.reasons },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const ok = await bcryptjs.compare(currentPassword, user.passwordHash);
  const { ip, userAgent } = extractRequestContext(req);
  if (!ok) {
    await logAuthEvent({
      type: "LOGIN_FAIL",
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      metadata: { reason: "bad_current_password_in_change" },
    });
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const newHash = await bcryptjs.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await logAuthEvent({
    type: "PASSWORD_CHANGED",
    userId: user.id,
    email: user.email,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
