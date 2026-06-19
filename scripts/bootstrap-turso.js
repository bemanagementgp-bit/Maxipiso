const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
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

  const statements = [
    "PRAGMA foreign_keys = ON",
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'VIEWER', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY NOT NULL, sku TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL, marca TEXT NOT NULL, descripcion TEXT, precio REAL NOT NULL, imagen TEXT, isActive BOOLEAN NOT NULL DEFAULT 1, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS change_logs (id TEXT PRIMARY KEY NOT NULL, productId TEXT NOT NULL, usuarioId TEXT NOT NULL, campo TEXT NOT NULL, valorAnterior TEXT, valorNuevo TEXT, tipo TEXT NOT NULL, fechaCambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (usuarioId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS imagenes_productos (id TEXT PRIMARY KEY NOT NULL, productId TEXT NOT NULL, url TEXT NOT NULL, nombre TEXT, fechaCarga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, sessionToken TEXT NOT NULL UNIQUE, userId TEXT NOT NULL, expires DATETIME NOT NULL, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku)`,
    `CREATE INDEX IF NOT EXISTS products_nombre_idx ON products(nombre)`,
    `CREATE INDEX IF NOT EXISTS products_isActive_idx ON products(isActive)`,
    `CREATE INDEX IF NOT EXISTS change_logs_productId_idx ON change_logs(productId)`,
    `CREATE INDEX IF NOT EXISTS change_logs_usuarioId_idx ON change_logs(usuarioId)`,
    `CREATE INDEX IF NOT EXISTS change_logs_fechaCambio_idx ON change_logs(fechaCambio)`,
    `CREATE INDEX IF NOT EXISTS imagenes_productos_productId_idx ON imagenes_productos(productId)`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@maxipiso.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const existingUser = await client.execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [adminEmail],
  });

  if (existingUser.rows.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await client.execute({
      sql: `INSERT INTO users (id, email, name, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [crypto.randomUUID(), adminEmail, "Admin MaxiPiso", passwordHash, "ADMIN"],
    });
    console.log("Admin user created.");
  } else {
    console.log("Admin user already exists.");
  }

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("Tables:", tables.rows.map((row) => row.name).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});