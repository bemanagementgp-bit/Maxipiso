const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");
const { createClient } = require("@libsql/client");
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

const client = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
const adapter = new PrismaLibSQL(client);
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.product.count({ where: { categoria: "Maderas" } });
  const active = await prisma.product.count({ where: { categoria: "Maderas", isActive: true } });
  console.log(`Total Maderas: ${count}, isActive=true: ${active}`);
  
  const sample = await prisma.product.findMany({ where: { categoria: "Maderas" }, select: { id: true, nombre: true, isActive: true }, take: 3 });
  console.log(JSON.stringify(sample, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
