import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAdmin = token?.role === "ADMIN";
  const isAuthenticated = !!token;

  // Panel admin: solo ADMIN
  if (pathname.startsWith("/panel") && !isAdmin) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Mutaciones / acciones sensibles: solo ADMIN
  if (
    (pathname.startsWith("/api/upload") ||
      pathname.startsWith("/api/productos/import") ||
      pathname.startsWith("/api/productos/export")) &&
    !isAdmin
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cambio de password y gestión 2FA: cualquier usuario autenticado
  if (
    (pathname.startsWith("/api/auth/password") ||
      pathname.startsWith("/api/auth/2fa")) &&
    !isAuthenticated
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resto de /api/productos requiere sesión válida
  if (pathname.startsWith("/api/productos") && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/api/productos/:path*",
    "/api/upload/:path*",
    "/api/auth/password",
    "/api/auth/2fa/:path*",
  ],
};
