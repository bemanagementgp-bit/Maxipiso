import process from "node:process";
import { createClient } from "@libsql/client";

const TABLAS = [
  "pisos_flotantes",
  "porcellanatos",
  "revestimientos",
  "pisos_vinilicos",
  "pisos_madera",
  "decks",
  "maderas",
  "accesorios",
];

const databaseUrl = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!databaseUrl) throw new Error("No se encontró DATABASE_URL en .env");
if (!authToken) throw new Error("No se encontró DATABASE_AUTH_TOKEN en .env");

const turso = createClient({ url: databaseUrl, authToken });

async function main() {
  let totalDuplicados = 0;
  let totalActualizados = 0;

  for (const tabla of TABLAS) {
    const res = await turso.execute(`SELECT id, sku, imagenes FROM ${tabla} WHERE imagenes IS NOT NULL AND imagenes != ''`);

    for (const row of res.rows) {
      let imgs;
      try {
        imgs = JSON.parse(String(row.imagenes));
      } catch {
        continue;
      }
      if (!Array.isArray(imgs)) continue;

      const unicas = [...new Set(imgs)];
      if (unicas.length < imgs.length) {
        const duplicadas = imgs.length - unicas.length;
        totalDuplicados += duplicadas;
        console.log(`DUPLICADO | ${tabla} | SKU: ${row.sku} | ${imgs.length} -> ${unicas.length} (${duplicadas} repetidas)`);

        await turso.execute({
          sql: `UPDATE ${tabla} SET imagenes = ? WHERE id = ?`,
          args: [JSON.stringify(unicas), row.id],
        });
        totalActualizados++;
      }
    }
  }

  console.log("\nRESUMEN");
  console.log("-".repeat(50));
  console.log(`Productos con duplicados: ${totalActualizados}`);
  console.log(`Imágenes duplicadas eliminadas: ${totalDuplicados}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
