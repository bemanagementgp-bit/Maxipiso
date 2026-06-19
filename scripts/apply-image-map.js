/**
 * apply-image-map.js
 * 
 * Paso 2: Lee image-map.json y vincula las imágenes a los productos en la BD.
 * 
 * Uso:
 *   node scripts/apply-image-map.js
 *   node scripts/apply-image-map.js --dry-run   (muestra qué haría, sin guardar)
 */

const { createClient } = require("@libsql/client");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const INPUT_FILE = path.join(process.cwd(), "image-map.json");

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

function toDriveUrl(fileId) {
  // URL directa que funciona con Next.js Image (sin redirects)
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

async function main() {
  loadEnv();

  const isDryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error("❌ No se encontró image-map.json. Ejecutá primero: node scripts/generate-image-map.js");
    process.exit(1);
  }

  const mapData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const productos = mapData.productos || [];

  const toApply = productos.filter(p => p.imagen_1_id || p.drive_file_id);
  const skipped = productos.filter(p => !p.imagen_1_id && !p.drive_file_id);

  console.log(`📋 Total en image-map.json: ${productos.length} productos`);
  console.log(`   ✅ Con imagen para aplicar: ${toApply.length}`);
  console.log(`   ⏭️  Sin imagen (se omitirán): ${skipped.length}`);

  if (isDryRun) {
    console.log("\n🔍 Modo dry-run — cambios que se aplicarían:\n");
    for (const p of toApply) {
      const id1 = p.imagen_1_id || p.drive_file_id;
      const id2 = p.imagen_2_id || null;
      console.log(`  [${p.sku}] ${p.nombre}`);
      console.log(`         img1: ${p.imagen_1_name || p.drive_file_name} → ${toDriveUrl(id1)}`);
      if (id2) console.log(`         img2: ${p.imagen_2_name} → ${toDriveUrl(id2)}`);
      console.log();
    }
    console.log("Corré sin --dry-run para guardar en la BD.");
    return;
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  let saved = 0;
  let errors = 0;

  console.log("\n💾 Aplicando imágenes...\n");

  for (const p of toApply) {
    // Soporte tanto para el formato nuevo (imagen_1_id) como el viejo (drive_file_id)
    const id1 = p.imagen_1_id || p.drive_file_id;
    const id2 = p.imagen_2_id || null;
    const name1 = p.imagen_1_name || p.drive_file_name || p.nombre;
    const name2 = p.imagen_2_name || null;

    const url1 = toDriveUrl(id1);
    const url2 = id2 ? toDriveUrl(id2) : null;
    const now = new Date().toISOString();

    try {
      // Buscar el producto por SKU
      const prod = await client.execute({
        sql: "SELECT id FROM products WHERE sku = ? LIMIT 1",
        args: [p.sku],
      });

      if (prod.rows.length === 0) {
        console.log(`  ⚠️  [${p.sku}] ${p.nombre} — no encontrado en BD, omitido`);
        continue;
      }

      const productId = prod.rows[0].id;

      // Actualizar imagen principal del producto
      await client.execute({
        sql: "UPDATE products SET imagen=?, updatedAt=? WHERE id=?",
        args: [url1, now, productId],
      });

      // Insertar imágenes en imagenes_productos
      for (const [url, nombre] of [[url1, name1], [url2, name2]].filter(([u]) => u)) {
        const existing = await client.execute({
          sql: "SELECT id FROM imagenes_productos WHERE productId=? AND url=?",
          args: [productId, url],
        });
        if (existing.rows.length === 0) {
          await client.execute({
            sql: "INSERT INTO imagenes_productos (id, productId, url, nombre, fechaCarga) VALUES (?, ?, ?, ?, ?)",
            args: [crypto.randomUUID(), productId, url, nombre, now],
          });
        }
      }

      const extras = url2 ? " (2 imágenes)" : " (1 imagen)";
      console.log(`  ✅ [${p.sku}] ${p.nombre}${extras}`);
      saved++;
    } catch (e) {
      console.error(`  ❌ [${p.sku}] Error: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Guardados:  ${saved}`);
  if (errors) console.log(`❌ Errores:    ${errors}`);
  console.log(`⏭️  Omitidos:   ${skipped.length}`);
  console.log(`─────────────────────────────────`);
  console.log("\nListo. Las imágenes ya están vinculadas en la BD.");
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
