import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rate-limit";

export type AuthEventType =
  | "LOGIN_OK"
  | "LOGIN_FAIL"
  | "LOGOUT"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_COMPLETED"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_UNLOCKED"
  | "ROLE_CHANGED"
  | "TOTP_ENABLED"
  | "TOTP_DISABLED"
  | "TOTP_FAIL";

export interface LogAuthEventInput {
  type: AuthEventType;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Persiste un evento de auditoría de seguridad.
 * Es "fire-and-forget": cualquier error se loggea pero no rompe el flujo.
 */
export async function logAuthEvent(input: LogAuthEventInput): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        email: input.email?.slice(0, 254) ?? null,
        ip: input.ip?.slice(0, 64) ?? null,
        userAgent: input.userAgent?.slice(0, 512) ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 4000) : null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to log auth event:", err);
  }
}

/** Extrae IP y User-Agent de una petición HTTP. */
export function extractRequestContext(req: NextRequest | Request): {
  ip: string;
  userAgent: string;
} {
  const headers =
    "headers" in req && req.headers instanceof Headers ? req.headers : new Headers();
  const ua = headers.get("user-agent") ?? "";
  let ip = "unknown";
  if ("nextUrl" in req && typeof (req as NextRequest).headers?.get === "function") {
    ip = getClientIp(req as NextRequest);
  } else {
    const fwd = headers.get("x-forwarded-for");
    if (fwd) ip = fwd.split(",")[0]?.trim() || "unknown";
    else ip = headers.get("x-real-ip") ?? "unknown";
  }
  return { ip, userAgent: ua.slice(0, 512) };
}

/** Extrae IP/UA desde los headers crudos que pasa NextAuth a authorize(). */
export function extractFromAuthRequest(
  req: { headers?: Record<string, string | string[] | undefined> } | undefined,
): { ip: string; userAgent: string } {
  const h = req?.headers ?? {};
  const fwd = (h["x-forwarded-for"] as string | undefined) ?? "";
  const real = (h["x-real-ip"] as string | undefined) ?? "";
  const ua = (h["user-agent"] as string | undefined) ?? "";
  const ip = (fwd.split(",")[0]?.trim() || real || "unknown").slice(0, 64);
  return { ip, userAgent: ua.slice(0, 512) };
}
