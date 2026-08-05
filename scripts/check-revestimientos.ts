import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { createClient } from "@libsql/client";

const c = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function main() {
  const cats = await c.execute("SELECT DISTINCT categoriaPrincipal, count(*) as cnt FROM revestimientos WHERE isActive = 1 GROUP BY categoriaPrincipal");
  console.log("Categories:", cats.rows);

  const skus = await c.execute("SELECT sku, categoriaPrincipal FROM revestimientos WHERE sku IN ('25383','24768','22616','24916') AND isActive = 1");
  console.log("Sample SKUs:", skus.rows);

  const total = await c.execute("SELECT count(*) as total FROM revestimientos WHERE isActive = 1");
  console.log("Total active:", total.rows);
}

main().catch(console.error);
