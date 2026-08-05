import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_API = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

function checkRate(ip: string, limit: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const key = `rl:${ip}`;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, remaining: limit - 1 };
  }
  b.count++;
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) { if (v.resetAt <= now) buckets.delete(k); }
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit en rutas públicas de API
  if (pathname.startsWith("/api/catalogo") || pathname.startsWith("/api/contacto")) {
    const ip = getIp(request);
    const { ok, remaining } = checkRate(ip, RATE_LIMIT_API);
    if (!ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.delete("Server");
    return res;
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAdmin = token?.role === "ADMIN";
  const isAuthenticated = !!token;

  if (pathname.startsWith("/panel") && !isAdmin) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (
    (pathname.startsWith("/api/upload") ||
      pathname.startsWith("/api/productos/import") ||
      pathname.startsWith("/api/productos/export")) &&
    !isAdmin
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    (pathname.startsWith("/api/auth/password") ||
      pathname.startsWith("/api/auth/2fa")) &&
    !isAuthenticated
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    (pathname.startsWith("/api/productos") || pathname.startsWith("/api/reportes")) &&
    !isAuthenticated
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.delete("Server");
  return res;
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/api/:path*",
  ],
};
