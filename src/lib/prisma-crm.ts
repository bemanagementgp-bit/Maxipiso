// Singleton del cliente Prisma del CRM (PostgreSQL/Neon).
// Generado por el schema `prisma/crm/schema.prisma` en `node_modules/.prisma/crm-client`.
import { PrismaClient } from "../../node_modules/.prisma/crm-client";

const globalForCrm = global as unknown as { prismaCrm: PrismaClient };

export const prismaCrm =
  globalForCrm.prismaCrm ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForCrm.prismaCrm = prismaCrm;
