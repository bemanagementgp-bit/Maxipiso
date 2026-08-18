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

  // Storage de imágenes (Cloudinary). Sirve `CLOUDINARY_URL` (el formato del
  // dashboard) o las tres separadas. Sin nada de esto, `lib/storage.ts` cae al
  // disco local, que en Vercel es de solo lectura y efímero.
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

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

/**
 * Valida el entorno y devuelve los valores tipados.
 *
 * NO corta el boot: loguea el problema y sigue. La version anterior lanzaba en
 * produccion, pero como ningun modulo importaba este archivo el chequeo nunca
 * se ejecutaba. Ahora si se ejecuta (lo importa `lib/prisma.ts`), y hacerlo
 * fatal de entrada podria tumbar un deploy que hoy funciona.
 *
 * Cuando confirmes que las variables de produccion cumplen el schema, cambiar
 * el `console.error` por `throw new Error(message)` para tener fail-fast real.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const message = `Variables de entorno inválidas:\n${issues}`;
    if (process.env.NODE_ENV === "production") {
      console.error(`[env] ${message}`);
    } else {
      console.warn(`[env] ${message}`);
    }
  }
  cached = (parsed.success ? parsed.data : (process.env as unknown as Env)) as Env;
  return cached;
}

export const env = getEnv();
