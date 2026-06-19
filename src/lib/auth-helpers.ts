import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function getAuthSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No estás autorizado" }, { status: 401 });
  }
  return session;
}

export async function requireAdminAuth(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No estás autorizado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permisos de administrador" },
      { status: 403 },
    );
  }
  return session;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
