const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const tables = ["imagenes_productos", "change_logs", "products"];
  for (const table of tables) {
    try {
      const result = await client.execute(`DELETE FROM ${table}`);
      console.log(`✅ ${table}: ${result.rowsAffected} filas eliminadas`);
    } catch (e) {
      console.log(`⚠️  ${table}: ${e.message}`);
    }
  }
  console.log("\nLimpieza de productos completada.");
}

main().catch(console.error);
