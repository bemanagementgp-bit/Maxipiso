import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    nextauth_url: process.env.NEXTAUTH_URL,
    database_url: !!process.env.DATABASE_URL,
    node_env: process.env.NODE_ENV,
  });
}
