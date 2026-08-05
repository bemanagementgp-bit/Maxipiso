import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS hero_media (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      alt TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("hero_media table created OK");

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_hero_media_active_order ON hero_media (isActive, sortOrder)
  `);
  console.log("index created OK");
}

main().catch(console.error);
