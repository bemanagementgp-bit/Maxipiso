import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  const res = await db.execute("SELECT sku, especie, base, baseUm FROM pisos_madera WHERE sku = '100011'");
  console.log(JSON.stringify(res.rows[0]));
}

main().catch(console.error);
