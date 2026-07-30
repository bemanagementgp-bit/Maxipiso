import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  const res = await db.execute("PRAGMA table_info(revestimientos)");
  for (const row of res.rows) {
    if (String(row.name).toLowerCase().includes("base") || String(row.name).toLowerCase().includes("tabla")) {
      console.log(`${row.name} (${row.type})`);
    }
  }

  // Check sample data
  const sample = await db.execute("SELECT sku, nombre, baseTabla, baseTablUm FROM revestimientos WHERE baseTabla IS NOT NULL LIMIT 3");
  console.log("\nRevestimientos con baseTabla:");
  for (const row of sample.rows) {
    console.log(JSON.stringify(row));
  }
}

main().catch(console.error);
