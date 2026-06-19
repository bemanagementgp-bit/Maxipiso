/**
 * Reglas de fortaleza de contraseña:
 * - Mínimo 12 caracteres
 * - Al menos: 1 minúscula, 1 mayúscula, 1 dígito, 1 símbolo
 * - No estar en la blocklist (top contraseñas comunes)
 * - Score mínimo de variedad
 */

const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty12", "letmein!", "admin1234",
  "password1!", "Password1!", "Welcome1!", "ChangeMe1!", "ChangeMe123!",
  "Admin1234!", "passw0rd!", "qwerty123!", "1q2w3e4r!", "Iloveyou1!",
]);

export interface PasswordCheckResult {
  ok: boolean;
  reasons: string[];
}

export function checkPasswordStrength(password: string): PasswordCheckResult {
  const reasons: string[] = [];

  if (typeof password !== "string") {
    return { ok: false, reasons: ["Contraseña inválida"] };
  }

  if (password.length < 12) reasons.push("Mínimo 12 caracteres");
  if (password.length > 128) reasons.push("Máximo 128 caracteres");
  if (!/[a-z]/.test(password)) reasons.push("Al menos una minúscula");
  if (!/[A-Z]/.test(password)) reasons.push("Al menos una mayúscula");
  if (!/[0-9]/.test(password)) reasons.push("Al menos un dígito");
  if (!/[^A-Za-z0-9]/.test(password)) reasons.push("Al menos un símbolo");

  if (/^(.)\1+$/.test(password)) reasons.push("No usar caracteres repetidos");
  if (COMMON_PASSWORDS.has(password)) {
    reasons.push("Contraseña demasiado común");
  }

  // Heurística: variedad mínima
  const uniqueChars = new Set(password).size;
  if (uniqueChars < 6) reasons.push("Debe contener al menos 6 caracteres únicos");

  return { ok: reasons.length === 0, reasons };
}
