import { NextRequest, NextResponse } from "next/server";

/** Escape HTML para evitar XSS al renderizar contenido de usuario en HTML. */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;")
    .replace(/=/g, "&#61;");
}

/** Normaliza y limita texto plano (corta tamaño, elimina caracteres de control). */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  return String(input ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Parse seguro de enteros con default y rango. */
export function parseIntSafe(
  raw: string | null | undefined,
  def: number,
  min: number,
  max: number,
): number {
  if (raw == null) return def;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

/**
 * Verifica que la petición provenga de un Origin permitido.
 * Mitiga CSRF en mutaciones JSON cuando se usan cookies.
 * Devuelve null si OK o NextResponse 403 si rechazado.
 */
export function verifyOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  // Sólo aplicamos a mutaciones
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  const allowed = new Set<string>();
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }

  const candidate = origin ?? (referer ? safeOrigin(referer) : null);
  if (!candidate) {
    // Sin Origin ni Referer en una mutación: bloquear.
    return NextResponse.json({ error: "Origen no válido" }, { status: 403 });
  }
  if (!allowed.has(candidate)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  return null;
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Detecta el tipo real de imagen a partir de magic bytes. */
export function detectImageMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
