import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://maxipiso-products-bemanagementgp-bit.aws-us-east-1.turso.io",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const tables = [
  "pisos_flotantes", "porcellanatos", "revestimientos", "pisos_vinilicos",
  "pisos_madera", "decks", "maderas", "accesorios",
];

for (const t of tables) {
  try {
    const r = await client.execute(`UPDATE ${t} SET imagenes = NULL`);
    console.log(`${t}: ${r.rowsAffected} filas limpiadas`);
  } catch (e) {
    console.log(`${t}: ${e.message}`);
  }
}

console.log("Done");
process.exit(0);