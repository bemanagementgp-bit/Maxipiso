import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limiter en memoria (token-bucket simplificado por ventana fija).
 * Suficiente para single-instance. Para multi-instancia usar Redis/Upstash.
 *
 * IMPORTANTE: confiamos en el header de IP solo si viene de un proxy conocido.
 * En Vercel/Netlify, x-forwarded-for es seteado por la plataforma.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

function cleanup(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export interface RateLimitOptions {
  /** Identificador único del endpoint/acción */
  key: string;
  /** Máximo de requests en la ventana */
  limit: number;
  /** Ventana en milisegundos */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const composite = `${opts.key}:${identifier}`;
  const existing = buckets.get(composite);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(composite, bucket);
    return { ok: true, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Devuelve respuesta 429 si se excede el límite, o null si está permitido. */
export function enforceRateLimit(
  req: NextRequest,
  opts: RateLimitOptions,
  identifier?: string,
): NextResponse | null {
  const id = identifier ?? getClientIp(req);
  const result = rateLimit(id, opts);
  if (result.ok) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intenta más tarde." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
