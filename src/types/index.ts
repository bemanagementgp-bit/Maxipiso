/**
 * Tipos de dominio.
 *
 * Los tipos de producto NO se escriben a mano: se reexportan los que genera
 * Prisma desde `schema.prisma`. La version anterior de este archivo los
 * duplicaba a mano y ya habia divergido (declaraba `imagen` en cuatro modelos
 * donde el schema tiene `imagenes`, y exportaba un `Product` inexistente).
 */
export type {
  PisoFlotante,
  Porcellanato,
  Revestimiento,
  PisoVinilico,
  PisoMadera,
  Deck,
  Madera,
  Accesorio,
  User,
  ChangeLog,
  AuthEvent,
  HeroMedia,
  Lead,
} from "@prisma/client";

export type { UserRole, ChangeType, AuthEventType, LeadEstado } from "@prisma/client";

/** Slug publico de cada categoria en las URLs del catalogo. */
export type CategoriaSlug =
  | "pisos-flotantes"
  | "porcellanatos"
  | "revestimientos"
  | "pisos-vinilicos"
  | "pisos-madera"
  | "decks"
  | "maderas"
  | "accesorios";

/** Envelope estandar de las respuestas de la API. */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
