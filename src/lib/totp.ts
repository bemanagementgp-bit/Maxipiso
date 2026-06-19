import { generateSecret, generateURI, verify } from "otplib";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import bcryptjs from "bcryptjs";

const APP_ISSUER = "MaxiPiso Admin";
// Tolerancia: ±30s (un paso) para compensar drift de reloj
const EPOCH_TOLERANCE_SECONDS = 30;
const PERIOD_SECONDS = 30;

/**
 * Cifra el TOTP secret antes de guardarlo en DB usando AES-256-GCM.
 * Requiere TOTP_ENC_KEY (32 bytes hex). Si falta, se guarda en claro
 * (solo aceptable en desarrollo).
 */
const ENC_KEY_HEX = process.env.TOTP_ENC_KEY;
const ENC_KEY = ENC_KEY_HEX && ENC_KEY_HEX.length === 64 ? Buffer.from(ENC_KEY_HEX, "hex") : null;

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: APP_ISSUER,
    label: email,
    secret,
    period: PERIOD_SECONDS,
  });
}

export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    const clean = String(token).replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) return false;
    const result = await verify({
      strategy: "totp",
      token: clean,
      secret,
      period: PERIOD_SECONDS,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}

/** Cifra el secret. Formato salida: "v1:<iv hex>:<tag hex>:<ciphertext hex>". */
export function encryptSecret(plain: string): string {
  if (!ENC_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOTP_ENC_KEY no configurada (requerida en producción)");
    }
    return `plain:${plain}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  if (stored.startsWith("plain:")) return stored.slice("plain:".length);
  if (!ENC_KEY) throw new Error("TOTP_ENC_KEY no configurada");
  const [version, ivHex, tagHex, dataHex] = stored.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !dataHex) {
    throw new Error("Formato de secret inválido");
  }
  const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Genera N códigos de recuperación de 10 chars (formato XXXXX-XXXXX). */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase().slice(0, 10);
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

/** Hashea los backup codes para guardarlos en DB (bcrypt). */
export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((c) => bcryptjs.hash(c, 10)));
  return JSON.stringify(hashes);
}

/** Verifica un código de recuperación contra el JSON guardado.
 *  Devuelve el JSON actualizado (sin el código usado) si coincide, o null si no. */
export async function consumeBackupCode(
  storedJson: string,
  candidate: string,
): Promise<string | null> {
  let hashes: string[];
  try {
    const parsed = JSON.parse(storedJson);
    if (!Array.isArray(parsed)) return null;
    hashes = parsed;
  } catch {
    return null;
  }
  const normalized = candidate.toUpperCase().replace(/\s+/g, "");
  for (let i = 0; i < hashes.length; i++) {
    if (await bcryptjs.compare(normalized, hashes[i])) {
      const remaining = hashes.filter((_, idx) => idx !== i);
      return JSON.stringify(remaining);
    }
  }
  return null;
}
