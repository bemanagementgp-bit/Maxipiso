import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@libsql/client";

const c = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function main() {
  const active = await c.execute("SELECT count(*) as cnt FROM decks WHERE isActive = 1");
  console.log("Decks activos:", active.rows);

  const total = await c.execute("SELECT count(*) as cnt FROM decks");
  console.log("Decks total:", total.rows);

  const sample = await c.execute("SELECT sku, nombre, isActive FROM decks LIMIT 5");
  console.log("Sample:", sample.rows);
}

main().catch(console.error);
