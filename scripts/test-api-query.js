const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvLocal();

const { createClient } = require("@libsql/client");

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // Test same query the API does
  const result = await client.execute(
    "SELECT id, sku, nombre, categoria, subcategoria, isActive FROM products WHERE isActive = 1 AND categoria = 'Maderas' LIMIT 5"
  );
  console.log("Productos Maderas activos:", result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));

  // Check all categories
  const cats = await client.execute(
    "SELECT categoria, COUNT(*) as count FROM products WHERE isActive = 1 GROUP BY categoria"
  );
  console.log("\nProductos por categoría:");
  console.log(JSON.stringify(cats.rows, null, 2));
}

main().catch(console.error);
