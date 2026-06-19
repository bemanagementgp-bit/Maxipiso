const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    const commentIndex = value.indexOf(" #");
    if (commentIndex !== -1) {
      value = value.slice(0, commentIndex).trim();
    }

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

  const total = await client.execute("SELECT COUNT(*) AS total FROM products");
  const active = await client.execute("SELECT COUNT(*) AS total FROM products WHERE isActive = 1");
  const sample = await client.execute(
    "SELECT sku, nombre, marca, precio, isActive, createdAt FROM products ORDER BY createdAt DESC LIMIT 10"
  );

  console.log(JSON.stringify({
    total: total.rows,
    active: active.rows,
    sample: sample.rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});