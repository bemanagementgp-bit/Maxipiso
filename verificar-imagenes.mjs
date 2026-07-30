import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const TABLAS = [
  "pisos_flotantes", "porcellanatos", "revestimientos",
  "pisos_vinilicos", "pisos_madera", "decks", "maderas", "accesorios",
];

async function main() {
  let sinImagenes = 0;
  let conDuplicadas = 0;
  let totalProductos = 0;
  let imagenNoExiste = 0;

  console.log("═".repeat(60));
  console.log("  VERIFICACIÓN DE IMÁGENES");
  console.log("═".repeat(60));

  for (const tabla of TABLAS) {
    const res = await turso.execute(`SELECT id, sku, nombre, imagenes FROM ${tabla} WHERE isActive = 1`);
    const sinImg = [];
    const dupImg = [];
    const archivosFaltantes = [];

    for (const row of res.rows) {
      totalProductos++;
      const nombre = row.nombre ?? row.sku;
      const raw = String(row.imagenes ?? "").trim();

      // Sin imágenes
      if (!raw || raw === "null" || raw === "[]") {
        sinImg.push({ sku: row.sku, nombre });
        sinImagenes++;
        continue;
      }

      // Parsear imágenes
      let imgs;
      try { imgs = JSON.parse(raw); } catch { continue; }
      if (!Array.isArray(imgs) || imgs.length === 0) {
        sinImg.push({ sku: row.sku, nombre });
        sinImagenes++;
        continue;
      }

      // Duplicadas
      const unicas = new Set(imgs);
      if (unicas.size < imgs.length) {
        dupImg.push({ sku: row.sku, nombre, total: imgs.length, unicas: unicas.size });
        conDuplicadas++;
      }

      // Verificar que los archivos existan en public/
      for (const img of imgs) {
        const filePath = path.join("./public", img);
        if (!fs.existsSync(filePath)) {
          archivosFaltantes.push({ sku: row.sku, archivo: img });
          imagenNoExiste++;
        }
      }
    }

    console.log(`\n📦 ${tabla.toUpperCase()} (${res.rows.length} productos)`);

    if (sinImg.length > 0) {
      console.log(`  ❌ Sin imágenes: ${sinImg.length}`);
      for (const p of sinImg) {
        console.log(`     SKU: ${p.sku} | ${p.nombre}`);
      }
    } else {
      console.log(`  ✅ Todos tienen imágenes`);
    }

    if (dupImg.length > 0) {
      console.log(`  ❌ Con imágenes duplicadas: ${dupImg.length}`);
      for (const p of dupImg) {
        console.log(`     SKU: ${p.sku} | ${p.nombre} | ${p.total} → ${p.unicas} únicas`);
      }
    }

    if (archivosFaltantes.length > 0) {
      console.log(`  ❌ Archivos que no existen en public/: ${archivosFaltantes.length}`);
      for (const p of archivosFaltantes) {
        console.log(`     SKU: ${p.sku} | ${p.archivo}`);
      }
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("  RESUMEN");
  console.log("═".repeat(60));
  console.log(`  Total productos activos:      ${totalProductos}`);
  console.log(`  Sin imágenes:                 ${sinImagenes}`);
  console.log(`  Con imágenes duplicadas:      ${conDuplicadas}`);
  console.log(`  Archivos faltantes en public: ${imagenNoExiste}`);
  console.log("═".repeat(60) + "\n");

  if (sinImagenes > 0 || conDuplicadas > 0 || imagenNoExiste > 0) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
