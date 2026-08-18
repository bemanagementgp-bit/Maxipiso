import { createHash } from "crypto";

/**
 * Cliente mínimo de Cloudinary sobre `fetch`.
 *
 * No usa el SDK oficial a propósito: la API de upload es un POST multipart con
 * una firma SHA-1, y evitar la dependencia mantiene el árbol de npm chico (que
 * en este proyecto importa: `xlsx` se resuelve desde cdn.sheetjs.com y cualquier
 * reinstalación es frágil).
 *
 * Se usa upload FIRMADO desde el servidor, no un unsigned preset: un preset sin
 * firma permite que cualquiera que lo descubra suba archivos a la cuenta.
 */

const API_BASE = "https://api.cloudinary.com/v1_1";
export const CLOUDINARY_HOST = "res.cloudinary.com";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * Parsea el formato que da el dashboard de Cloudinary:
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 */
function parseCloudinaryUrl(raw: string): CloudinaryConfig | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "cloudinary:") return null;

  // El secret puede venir percent-encoded si trae caracteres especiales.
  const apiKey = decodeURIComponent(parsed.username);
  const apiSecret = decodeURIComponent(parsed.password);
  const cloudName = parsed.hostname;
  if (!cloudName || !apiKey || !apiSecret) return null;

  return { cloudName, apiKey, apiSecret };
}

/**
 * Config de Cloudinary, o null si no está completa.
 *
 * Se aceptan las dos formas:
 *  - `CLOUDINARY_URL` en el formato que entrega el dashboard (una sola variable)
 *  - `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`
 *
 * Las tres separadas tienen prioridad, para poder sobreescribir una sola sin
 * tocar la URL completa.
 */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };

  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const fromUrl = parseCloudinaryUrl(url);
    if (fromUrl) return fromUrl;
    console.error("[cloudinary] CLOUDINARY_URL está seteada pero no se pudo parsear. Formato esperado: cloudinary://<api_key>:<api_secret>@<cloud_name>");
  }

  return null;
}

/**
 * Firma de Cloudinary: sha1 de los parámetros ordenados alfabéticamente como
 * `k=v` unidos por `&`, con el api_secret concatenado al final.
 * No entran `file`, `api_key`, `resource_type` ni `cloud_name`.
 */
function sign(params: Record<string, string>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + apiSecret).digest("hex");
}

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

/** Sube un buffer y devuelve la URL https definitiva y su public_id. */
export async function uploadToCloudinary(
  buffer: Buffer,
  opts: { folder: string; contentType: string; filename: string },
  config: CloudinaryConfig,
): Promise<CloudinaryUploadResult> {
  const resourceType = opts.contentType.startsWith("video/") ? "video" : "image";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signed: Record<string, string> = {
    folder: opts.folder,
    timestamp,
  };

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: opts.contentType }), opts.filename);
  form.append("api_key", config.apiKey);
  for (const [k, v] of Object.entries(signed)) form.append(k, v);
  form.append("signature", sign(signed, config.apiSecret));

  const res = await fetch(`${API_BASE}/${config.cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    // El cuerpo de error de Cloudinary trae el motivo real: "Invalid Signature",
    // "Stale request", cuota excedida, formato rechazado. Ese texto SÍ sirve
    // mostrarlo: es lo único que distingue "faltan las credenciales" de "la
    // credencial está mal copiada". No incluye la key ni el secret.
    let detalle = "";
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      detalle = parsed?.error?.message ?? "";
    } catch {
      detalle = text.slice(0, 200);
    }
    const err = new Error(`Cloudinary respondió ${res.status}: ${text.slice(0, 300)}`) as Error & {
      cloudinaryMessage?: string;
      status?: number;
    };
    err.cloudinaryMessage = detalle;
    err.status = res.status;
    throw err;
  }

  let json: { secure_url?: string; public_id?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Cloudinary devolvió una respuesta no-JSON: ${text.slice(0, 200)}`);
  }
  if (!json.secure_url || !json.public_id) {
    throw new Error("Cloudinary no devolvió secure_url/public_id");
  }
  return { secureUrl: json.secure_url, publicId: json.public_id };
}

/**
 * Extrae el public_id de una URL de entrega.
 *
 * `https://res.cloudinary.com/c/image/upload/v123/maxipiso/productos/ab.jpg`
 *   → `maxipiso/productos/ab`
 *
 * Tolera un segmento de transformaciones antes de la versión, por si alguna URL
 * quedó guardada ya transformada.
 */
export function publicIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== CLOUDINARY_HOST) return null;

  const marker = "/upload/";
  const at = parsed.pathname.indexOf(marker);
  if (at === -1) return null;

  let segments = parsed.pathname.slice(at + marker.length).split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // Descartar todo lo anterior a la versión (transformaciones), si hay versión.
  const versionAt = segments.findIndex((s) => /^v\d+$/.test(s));
  segments = versionAt === -1 ? segments : segments.slice(versionAt + 1);
  if (segments.length === 0) return null;

  const joined = segments.join("/");
  return joined.replace(/\.[a-z0-9]+$/i, "");
}

/** Borra un asset. No lanza: que el archivo ya no esté no es un error. */
export async function destroyInCloudinary(
  publicId: string,
  config: CloudinaryConfig,
  resourceType: "image" | "video" = "image",
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = { public_id: publicId, timestamp };

  const form = new FormData();
  form.append("api_key", config.apiKey);
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("signature", sign(signed, config.apiSecret));

  try {
    const res = await fetch(`${API_BASE}/${config.cloudName}/${resourceType}/destroy`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      console.warn(`[cloudinary] destroy ${publicId} respondió ${res.status}`);
    }
  } catch (err) {
    console.warn(`[cloudinary] destroy ${publicId} falló:`, err);
  }
}

/**
 * Inserta transformaciones en una URL de entrega de Cloudinary.
 *
 * `f_auto` negocia el formato con el navegador (WebP/AVIF) y `q_auto` elige la
 * calidad: juntas recortan cerca del 90% del peso de un JPG sin optimizar.
 * `c_limit` evita ampliar más allá del original.
 *
 * Si la URL no es de Cloudinary se devuelve tal cual.
 */
export function cloudinaryTransform(url: string, width?: number, quality?: number): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== CLOUDINARY_HOST) return url;

  const marker = "/upload/";
  const at = parsed.pathname.indexOf(marker);
  if (at === -1) return url;

  const transforms = ["f_auto", `q_${quality ?? "auto"}`];
  if (width && Number.isFinite(width)) transforms.push("c_limit", `w_${Math.round(width)}`);

  const head = parsed.pathname.slice(0, at + marker.length);
  const tail = parsed.pathname.slice(at + marker.length);

  // Si ya venía transformada, no acumular otro set encima.
  const primerSegmento = tail.split("/")[0] ?? "";
  const yaTransformada = /(^|,)(f_|q_|w_|c_)/.test(primerSegmento);
  if (yaTransformada) return url;

  parsed.pathname = `${head}${transforms.join(",")}/${tail}`;
  return parsed.toString();
}

export function isCloudinaryUrl(url: string): boolean {
  try {
    return new URL(url).hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}
