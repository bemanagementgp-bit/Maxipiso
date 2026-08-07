import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@libsql/client";

const c = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

const TABLES = [
  "pisos_flotantes",
  "porcellanatos",
  "revestimientos",
  "pisos_vinilicos",
  "pisos_madera",
  "decks",
  "maderas",
  "accesorios",
];

async function main() {
  for (const table of TABLES) {
    try {
      await c.execute(`ALTER TABLE ${table} ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0`);
      console.log(`✓ ${table}: sortOrder added`);
    } catch (e: any) {
      if (e.message?.includes("duplicate column")) {
        console.log(`⊘ ${table}: sortOrder already exists`);
      } else {
        console.error(`✗ ${table}: ${e.message}`);
      }
    }
  }
  console.log("\nDone.");
}

main().catch(console.error);
