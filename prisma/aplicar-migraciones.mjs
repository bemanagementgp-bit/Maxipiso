/**
 * Aplica `prisma/migrations/APLICAR-EN-TURSO.sql` en la base que apunte
 * DATABASE_URL.
 *
 * Existe porque no hay una forma cómoda de correr estas migraciones: Prisma no
 * lleva el registro de migraciones en esta base, y pegar 90 líneas en la consola
 * web es fácil de hacer a medias. Este script las corre una por una y dice qué
 * pasó con cada una.
 *
 * Es idempotente a propósito: lo que ya está aplicado se saltea con un aviso en
 * vez de cortar. Se puede correr dos veces sin miedo.
 *
 *   node prisma/aplicar-migraciones.mjs            (aplica)
 *   node prisma/aplicar-migraciones.mjs --dry-run  (solo muestra qué haría)
 */

import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "node:fs";

const ARCHIVO = "prisma/migrations/APLICAR-EN-TURSO.sql";
const SOLO_MOSTRAR = process.argv.includes("--dry-run");

// Se leen las credenciales del .env.local del proyecto, que es donde ya están.
// No se pide nada por consola ni se imprime el token en ningún momento.
for (const archivo of [".env.local", ".env"]) {
  if (!existsSync(archivo)) continue;
  for (const linea of readFileSync(archivo, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, clave, crudo] = m;
    if (process.env[clave]) continue;
    process.env[clave] = crudo.trim().replace(/^["'](.*)["']$/, "$1");
  }
}

const url = process.env.DATABASE_URL?.trim();
const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
if (!url) {
  console.error("✗ Falta DATABASE_URL. Tiene que estar en .env.local del proyecto.");
  process.exit(1);
}
// Se muestra el host, nunca el token: sirve para confirmar que apunta a la base
// correcta antes de escribir.
console.log(`Base: ${url.replace(/\?.*$/, "")}\n`);

/** Corta el archivo en sentencias. Los `;` que cierran cada una son el separador. */
function sentencias(sql) {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Errores que significan "esto ya estaba", no "esto falló". */
function yaAplicada(mensaje) {
  return /already exists|duplicate column/i.test(mensaje);
}

const db = createClient({ url, authToken });
let aplicadas = 0, salteadas = 0, fallidas = 0;

for (const sql of sentencias(readFileSync(ARCHIVO, "utf8"))) {
  const resumen = sql.replace(/\s+/g, " ").slice(0, 72);
  if (SOLO_MOSTRAR) { console.log(`· ${resumen}`); continue; }
  try {
    await db.execute(sql);
    console.log(`✓ ${resumen}`);
    aplicadas++;
  } catch (err) {
    const mensaje = err?.message ?? String(err);
    if (yaAplicada(mensaje)) {
      console.log(`— ya estaba: ${resumen}`);
      salteadas++;
    } else {
      console.error(`✗ ${resumen}\n   ${mensaje}`);
      fallidas++;
    }
  }
}

if (SOLO_MOSTRAR) {
  console.log("\n(--dry-run: no se escribió nada)");
} else {
  console.log(`\n${aplicadas} aplicadas · ${salteadas} ya estaban · ${fallidas} con error`);
  if (fallidas > 0) {
    console.log("Revisá los ✗ de arriba. Las demás quedaron aplicadas.");
    process.exit(1);
  }
  console.log("Listo. Recargá el catálogo y el panel.");
}
