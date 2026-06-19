import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { consumeBackupCode, decryptSecret, verifyTotp } from "@/lib/totp";
import { extractFromAuthRequest, logAuthEvent } from "@/lib/audit";

const isProd = process.env.NODE_ENV === "production";

// Hash dummy de bcrypt (cost=10) usado para igualar tiempos cuando el usuario no existe.
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8b1U7Wn5w7d7vJoZTQz0CxBNVeRO4u";

// Lockout: tras N fallos se bloquea durante M minutos
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "TOTP", type: "text" },
      },
      async authorize(credentials, req) {
        const GENERIC_ERROR = "Credenciales inválidas";

        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const totp = String(credentials?.totp ?? "").trim();

        if (!email || !password || email.length > 254 || password.length > 256) {
          throw new Error(GENERIC_ERROR);
        }

        const { ip, userAgent } = extractFromAuthRequest(req);

        // Rate-limit por IP y por email
        const ipLimit = rateLimit(ip, {
          key: "login:ip",
          limit: 10,
          windowMs: 15 * 60 * 1000,
        });
        const emailLimit = rateLimit(email, {
          key: "login:email",
          limit: 5,
          windowMs: 15 * 60 * 1000,
        });
        if (!ipLimit.ok || !emailLimit.ok) {
          await logAuthEvent({
            type: "LOGIN_FAIL",
            email,
            ip,
            userAgent,
            metadata: { reason: "rate_limited" },
          });
          throw new Error("Demasiados intentos. Esperá unos minutos.");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Check de lockout persistente (defensa adicional al rate-limit en memoria)
        if (user?.lockedUntil && user.lockedUntil > new Date()) {
          await logAuthEvent({
            type: "LOGIN_FAIL",
            userId: user.id,
            email,
            ip,
            userAgent,
            metadata: { reason: "account_locked" },
          });
          throw new Error("Cuenta bloqueada temporalmente. Esperá unos minutos.");
        }

        // Comparar siempre para mitigar timing attack / user enumeration
        const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
        const isValid = await bcryptjs.compare(password, hashToCheck);

        if (!user || !isValid) {
          if (user) {
            // Incrementar contador y bloquear si excede
            const newCount = user.failedLoginCount + 1;
            const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginCount: newCount,
                lockedUntil: shouldLock
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                  : null,
              },
            });
            await logAuthEvent({
              type: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAIL",
              userId: user.id,
              email,
              ip,
              userAgent,
              metadata: { reason: "bad_password", attempts: newCount },
            });
          } else {
            await logAuthEvent({
              type: "LOGIN_FAIL",
              email,
              ip,
              userAgent,
              metadata: { reason: "unknown_user" },
            });
          }
          throw new Error(GENERIC_ERROR);
        }

        // Verificar 2FA si está habilitado
        if (user.totpEnabled && user.totpSecret) {
          if (!totp) {
            // Señal al cliente para que pida el código (mensaje sin info útil)
            throw new Error("TOTP_REQUIRED");
          }

          let totpOk = false;
          try {
            const secret = decryptSecret(user.totpSecret);
            totpOk = await verifyTotp(totp, secret);
          } catch (err) {
            console.error("[auth] totp decrypt error:", err);
          }

          // Si TOTP no validó, intentar como backup code
          if (!totpOk && user.totpBackupCodes) {
            const remaining = await consumeBackupCode(user.totpBackupCodes, totp);
            if (remaining !== null) {
              await prisma.user.update({
                where: { id: user.id },
                data: { totpBackupCodes: remaining },
              });
              totpOk = true;
            }
          }

          if (!totpOk) {
            await logAuthEvent({
              type: "TOTP_FAIL",
              userId: user.id,
              email,
              ip,
              userAgent,
            });
            throw new Error(GENERIC_ERROR);
          }
        }

        // Login exitoso: limpiar contadores
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });
        await logAuthEvent({
          type: "LOGIN_OK",
          userId: user.id,
          email,
          ip,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "ADMIN" | "VIEWER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "ADMIN" | "VIEWER" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as "ADMIN" | "VIEWER") ?? "VIEWER";
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      await logAuthEvent({
        type: "LOGOUT",
        userId: (token?.id as string) ?? null,
        email: (token?.email as string) ?? null,
      });
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
};
