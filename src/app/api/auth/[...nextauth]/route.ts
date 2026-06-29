import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error(`[nextauth] NEXTAUTH_SECRET is not defined. NODE_ENV=${process.env.NODE_ENV}`);
}

const handler = NextAuth({ ...authOptions, secret });

export { handler as GET, handler as POST };
