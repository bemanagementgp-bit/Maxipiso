const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    process.env[key] = val;
  }
}

async function main() {
  loadEnv();

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // Ver columnas actuales
  const cols = await client.execute("PRAGMA table_info(users)");
  const existing = cols.rows.map((r) => r.name);
  console.log("Columnas actuales:", existing.join(", "));

  // Columnas que necesita el schema de Prisma
  const needed = [
    { name: "failedLoginCount",   ddl: "ALTER TABLE users ADD COLUMN failedLoginCount INTEGER NOT NULL DEFAULT 0" },
    { name: "lockedUntil",        ddl: "ALTER TABLE users ADD COLUMN lockedUntil DATETIME" },
    { name: "passwordChangedAt",  ddl: "ALTER TABLE users ADD COLUMN passwordChangedAt DATETIME" },
    { name: "mustChangePassword", ddl: "ALTER TABLE users ADD COLUMN mustChangePassword INTEGER NOT NULL DEFAULT 0" },
    { name: "totpSecret",         ddl: "ALTER TABLE users ADD COLUMN totpSecret TEXT" },
    { name: "totpEnabled",        ddl: "ALTER TABLE users ADD COLUMN totpEnabled INTEGER NOT NULL DEFAULT 0" },
    { name: "totpBackupCodes",    ddl: "ALTER TABLE users ADD COLUMN totpBackupCodes TEXT" },
  ];

  for (const col of needed) {
    if (!existing.includes(col.name)) {
      await client.execute(col.ddl);
      console.log(`Columna agregada: ${col.name}`);
    } else {
      console.log(`Ya existe: ${col.name}`);
    }
  }

  // Ver también columnas de products
  const prodCols = await client.execute("PRAGMA table_info(products)");
  const prodExisting = prodCols.rows.map((r) => r.name);
  console.log("\nColumnas de products:", prodExisting.join(", "));

  const prodNeeded = [
    { name: "categoria",    ddl: "ALTER TABLE products ADD COLUMN categoria TEXT" },
    { name: "subcategoria", ddl: "ALTER TABLE products ADD COLUMN subcategoria TEXT" },
    { name: "destacado",    ddl: "ALTER TABLE products ADD COLUMN destacado INTEGER NOT NULL DEFAULT 0" },
  ];

  for (const col of prodNeeded) {
    if (!prodExisting.includes(col.name)) {
      await client.execute(col.ddl);
      console.log(`Columna agregada en products: ${col.name}`);
    } else {
      console.log(`Ya existe en products: ${col.name}`);
    }
  }

  // Agregar tabla auth_events si no existe
  await client.execute(`CREATE TABLE IF NOT EXISTS auth_events (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT,
    tipo TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log("\nTabla auth_events OK");

  console.log("\nMigración completada.");
}

main().catch((e) => { console.error(e); process.exit(1); });
