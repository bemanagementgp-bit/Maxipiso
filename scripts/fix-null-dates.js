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

  const result = await client.execute(
    "UPDATE users SET passwordChangedAt = CURRENT_TIMESTAMP WHERE passwordChangedAt IS NULL"
  );
  console.log("Filas actualizadas:", result.rowsAffected);

  const rows = await client.execute("SELECT email, passwordChangedAt FROM users");
  console.log("Usuarios:", JSON.stringify(rows.rows));
}

main().catch((e) => { console.error(e); process.exit(1); });
