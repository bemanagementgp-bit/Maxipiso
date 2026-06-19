import { createHash } from "node:crypto";
import { prismaCrm } from "@/lib/prisma-crm";

/** Deja solo dígitos. Útil para deduplicar números escritos con +, espacios, guiones, etc. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, "");
}

export function hashIp(ip: string | null | undefined): string | null {
  const salt = process.env.CRM_IP_HASH_SALT;
  if (!salt || !ip || ip === "unknown") return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export interface UpsertLeadInput {
  nombre: string;
  telefono: string;
  email?: string | null;
  urlOrigen?: string | null;
  mensajeInicial?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
}

/**
 * Upsertea un cliente por `telefono_normalizado` y crea una interacción.
 * Pensado para reutilizar desde /api/crm/leads y /api/chat.
 */
export async function upsertLeadAndInteraction(input: UpsertLeadInput) {
  const telefonoNormalizado = normalizePhone(input.telefono);
  if (telefonoNormalizado.length < 8) {
    throw new Error("Teléfono inválido");
  }

  const email = input.email && input.email.length > 0 ? input.email.toLowerCase() : null;

  const cliente = await prismaCrm.cliente.upsert({
    where: { telefonoNormalizado },
    create: {
      nombre: input.nombre,
      telefono: input.telefono,
      telefonoNormalizado,
      email,
    },
    update: {
      nombre: input.nombre,
      // Solo pisamos email si vino uno nuevo (no borramos uno previo).
      ...(email ? { email } : {}),
    },
    select: { id: true },
  });

  await prismaCrm.interaccionChat.create({
    data: {
      clienteId: cliente.id,
      urlOrigen: input.urlOrigen ?? null,
      mensajeInicial: input.mensajeInicial ?? null,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
    },
  });

  return cliente;
}
