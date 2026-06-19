const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

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

    const commentIndex = value.indexOf(" #");
    if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();

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

  // Contar antes de borrar
  const before = await client.execute("SELECT COUNT(*) AS total FROM products");
  console.log(`Productos antes del borrado: ${before.rows[0].total}`);

  // Borrar imágenes asociadas primero (FK)
  await client.execute("DELETE FROM imagen_producto");
  console.log("Imágenes de productos eliminadas.");

  // Borrar changelogs asociados a productos
  await client.execute("DELETE FROM change_logs WHERE productId IS NOT NULL");
  console.log("ChangeLogs de productos eliminados.");

  // Borrar todos los productos
  await client.execute("DELETE FROM products");
  console.log("Productos eliminados.");

  // Contar después
  const after = await client.execute("SELECT COUNT(*) AS total FROM products");
  console.log(`Productos después del borrado: ${after.rows[0].total}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
