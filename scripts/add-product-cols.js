const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const eq = l.indexOf("=");
    if (eq === -1) continue;
    const k = l.slice(0, eq).trim();
    let v = l.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // Agregar columnas faltantes en products
  const newCols = [
    { name: "specs",          ddl: "ALTER TABLE products ADD COLUMN specs TEXT" },
    { name: "unidadMedida",   ddl: "ALTER TABLE products ADD COLUMN unidadMedida TEXT" },
    { name: "moneda",         ddl: "ALTER TABLE products ADD COLUMN moneda TEXT" },
    { name: "stock",          ddl: "ALTER TABLE products ADD COLUMN stock INTEGER" },
  ];

  const existing = await client.execute("PRAGMA table_info(products)");
  const existingCols = existing.rows.map((r) => r.name);
  console.log("Columnas actuales:", existingCols.join(", "));

  for (const col of newCols) {
    if (!existingCols.includes(col.name)) {
      await client.execute(col.ddl);
      console.log(`+ Columna agregada: ${col.name}`);
    } else {
      console.log(`= Ya existe: ${col.name}`);
    }
  }
  console.log("Listo.");
}

main().catch((e) => { console.error(e); process.exit(1); });
