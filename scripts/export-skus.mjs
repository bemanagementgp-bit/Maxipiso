import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import XLSX from "xlsx";
import path from "path";
import fs from "fs";

const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

const TABLES = [
  { delegate: () => prisma.pisoFlotante,  label: "Pisos Flotantes" },
  { delegate: () => prisma.porcellanato,  label: "Porcelanatos" },
  { delegate: () => prisma.revestimiento, label: "Revestimientos" },
  { delegate: () => prisma.pisoVinilico,  label: "Pisos Vinílicos" },
  { delegate: () => prisma.pisoMadera,    label: "Pisos Madera" },
  { delegate: () => prisma.deck,          label: "Decks" },
  { delegate: () => prisma.madera,        label: "Maderas" },
  { delegate: () => prisma.accesorio,     label: "Accesorios" },
];

async function main() {
  const rows = [];

  for (const table of TABLES) {
    const products = await table.delegate().findMany({
      select: { sku: true, nombre: true, isActive: true },
      orderBy: { sku: "asc" },
    });

    for (const p of products) {
      rows.push({
        SKU: p.sku ?? "",
        Nombre: p.nombre ?? "",
        Categoria: table.label,
        Estado: p.isActive ? "Activo" : "Inactivo",
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 22 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SKUs");

  const outPath = path.join(process.env.USERPROFILE || ".", "OneDrive", "Escritorio", "skus_export.xlsx");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  fs.writeFileSync(outPath, buf);

  console.log(`Exportados ${rows.length} SKUs → ${outPath}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
