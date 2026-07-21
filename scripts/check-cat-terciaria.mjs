import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const tables = [
    { name: "pisoFlotante", label: "Pisos Flotantes" },
    { name: "pisoVinilico", label: "Pisos Vinílicos" },
    { name: "pisoMadera", label: "Pisos Madera" },
  ];

  for (const t of tables) {
    const rows = await prisma[t.name].findMany({
      select: { categoriaTerciaria: true },
      where: { isActive: true },
    });
    const unique = [...new Set(rows.map(r => r.categoriaTerciaria).filter(Boolean))].sort();
    console.log(`\n${t.label}:`, unique.length > 0 ? unique.join(", ") : "(vacío)");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
