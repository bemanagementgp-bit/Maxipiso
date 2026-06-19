import { z } from "zod";

/**
 * Validación estricta de variables de entorno.
 * Falla rápido al iniciar si algo falta o está mal formado.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Base de datos (productos — Turso / libSQL)
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Base de datos del CRM (PostgreSQL — Neon).
  // Opcionales aquí para no romper boot si todavía no se aprovisionó la DB del CRM;
  // el endpoint /api/crm/leads valida y devuelve 503 si faltan.
  CRM_DATABASE_URL: z.string().url().optional(),
  CRM_DIRECT_URL: z.string().url().optional(),

  // Sal para hashear IP en interacciones del CRM (opcional). Si falta, no se guarda hash.
  CRM_IP_HASH_SALT: z.string().min(16).optional(),

  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET debe tener al menos 32 caracteres. Genera con: openssl rand -base64 32"),
  NEXTAUTH_URL: z.string().url().optional(),

  // App URL (para validar Origin / CSRF)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Servicios externos (opcionales — si faltan, el endpoint correspondiente devolverá 503)
  GROQ_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // 2FA: clave de cifrado (32 bytes = 64 chars hex). Obligatoria en producción.
  TOTP_ENC_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "TOTP_ENC_KEY debe ser 64 chars hex (32 bytes)")
    .optional(),

  // Seed / bootstrap
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
});

type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // En producción: cortar el boot. En dev: warning visible.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const message = `❌ Variables de entorno inválidas:\n${issues}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    // eslint-disable-next-line no-console
    console.warn(message);
  }
  cached = (parsed.success ? parsed.data : (process.env as unknown as Env)) as Env;
  return cached;
}

export const env = getEnv();
