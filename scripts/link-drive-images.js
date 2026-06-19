/**
 * link-drive-images.js
 * 
 * Lista los archivos de una carpeta de Google Drive y los vincula
 * a los productos de la BD según coincidencia de nombre.
 * 
 * Requiere: GOOGLE_DRIVE_API_KEY en .env.local
 * 
 * Uso:
 *   node scripts/link-drive-images.js
 *   node scripts/link-drive-images.js --dry-run   (solo muestra el mapeo, no guarda)
 *   node scripts/link-drive-images.js --categoria=Maderas
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");
const https = require("https");

const DRIVE_FOLDER_ID = "1mA4LfLp6whxNVm9ZSjgyYtY3MLOUXqHz";

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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON inválido: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

// Normaliza un string para comparación: sin acentos, minúsculas, solo alfanumérico
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // quitar acentos
    .replace(/[^a-z0-9]/g, "");                         // solo alfanumérico
}

// Calcula qué tan parecidos son dos strings (0 a 1)
function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // Coincidencia de palabras
  const wordsA = na.match(/.{3,}/g) || [];
  const wordsB = nb.match(/.{3,}/g) || [];
  const matches = wordsA.filter(w => nb.includes(w)).length;
  if (matches > 0) return matches / Math.max(wordsA.length, wordsB.length);
  return 0;
}

function toDriveUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

async function listDriveFiles(folderId, apiKey) {
  const url = `https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=1000`;
  const res = await fetchJson(url);
  if (res.error) {
    throw new Error(`Google Drive API error: ${res.error.message}\n\nAsegurate de que:\n1. El GOOGLE_DRIVE_API_KEY está configurado en .env.local\n2. La carpeta es pública (compartida como "Cualquier persona con el enlace")\n3. La API de Google Drive está habilitada en tu proyecto de Google Cloud`);
  }
  return (res.files || []).filter(f => f.mimeType && f.mimeType.startsWith("image/"));
}

async function main() {
  loadEnv();

  const isDryRun = process.argv.includes("--dry-run");
  const catFilter = (process.argv.find(a => a.startsWith("--categoria=")) || "").replace("--categoria=", "");

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    console.error(`
❌ Falta GOOGLE_DRIVE_API_KEY en .env.local

Para obtenerla (gratis):
1. Ir a https://console.cloud.google.com/
2. Crear un proyecto o seleccionar uno existente
3. Ir a "APIs y servicios" → "Biblioteca"
4. Buscar "Google Drive API" y habilitarla
5. Ir a "APIs y servicios" → "Credenciales"
6. Crear credencial → "Clave de API"
7. Copiar la clave y agregarla al .env.local:
   GOOGLE_DRIVE_API_KEY=AIzaSy...

También asegurate que la carpeta de Drive sea pública:
- Click derecho en la carpeta → Compartir → "Cualquier persona con el enlace" puede ver
    `);
    process.exit(1);
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // Listar archivos de Drive
  console.log(`📁 Listando archivos en carpeta Drive ${DRIVE_FOLDER_ID}...`);
  const driveFiles = await listDriveFiles(DRIVE_FOLDER_ID, apiKey);
  console.log(`   ${driveFiles.length} imágenes encontradas\n`);

  if (driveFiles.length === 0) {
    console.log("No se encontraron imágenes. Verificá que la carpeta tenga archivos y sea pública.");
    return;
  }

  // Listar productos de la BD
  const sql = catFilter
    ? "SELECT id, sku, nombre, subcategoria, categoria FROM products WHERE isActive=1 AND categoria=? ORDER BY nombre"
    : "SELECT id, sku, nombre, subcategoria, categoria FROM products WHERE isActive=1 ORDER BY nombre";
  const args = catFilter ? [catFilter] : [];
  const productos = await client.execute({ sql, args });

  console.log(`🗂  ${productos.rows.length} productos en BD${catFilter ? ` (${catFilter})` : ""}\n`);

  // Hacer el matching
  const results = [];
  for (const prod of productos.rows) {
    const nombre = String(prod.nombre);
    const sku = String(prod.sku);

    let bestFile = null;
    let bestScore = 0;

    for (const file of driveFiles) {
      const fileName = file.name.replace(/\.[^.]+$/, ""); // sin extensión
      // Intentar match por SKU primero
      if (fileName.includes(sku)) {
        bestFile = file;
        bestScore = 1;
        break;
      }
      const score = similarity(nombre, fileName);
      if (score > bestScore) {
        bestScore = score;
        bestFile = file;
      }
    }

    results.push({
      id: prod.id,
      sku,
      nombre,
      categoria: prod.categoria,
      match: bestFile,
      score: bestScore,
      url: bestFile ? toDriveUrl(bestFile.id) : null,
    });
  }

  // Mostrar resultados
  const matched = results.filter(r => r.score >= 0.5);
  const unmatched = results.filter(r => r.score < 0.5);

  console.log("✅ CON COINCIDENCIA:");
  for (const r of matched) {
    console.log(`  [${r.sku}] ${r.nombre}`);
    console.log(`       → ${r.match.name} (score: ${r.score.toFixed(2)})`);
  }

  if (unmatched.length > 0) {
    console.log("\n⚠️  SIN COINCIDENCIA (se omitirán):");
    for (const r of unmatched) {
      console.log(`  [${r.sku}] ${r.nombre}`);
    }
  }

  if (isDryRun) {
    console.log("\n🔍 Modo dry-run: no se guardaron cambios. Corré sin --dry-run para aplicar.");
    return;
  }

  // Guardar en BD
  console.log("\n💾 Guardando imágenes en la BD...");
  let saved = 0;

  for (const r of matched) {
    const now = new Date().toISOString();

    // Actualizar imagen principal del producto
    await client.execute({
      sql: "UPDATE products SET imagen=?, updatedAt=? WHERE id=?",
      args: [r.url, now, r.id],
    });

    // Verificar si ya existe en imagenes_productos
    const existing = await client.execute({
      sql: "SELECT id FROM imagenes_productos WHERE productId=? AND url=?",
      args: [r.id, r.url],
    });

    if (existing.rows.length === 0) {
      const imgId = require("crypto").randomUUID();
      await client.execute({
        sql: "INSERT INTO imagenes_productos (id, productId, url, nombre, fechaCarga) VALUES (?, ?, ?, ?, ?)",
        args: [imgId, r.id, r.url, r.match.name, now],
      });
    }

    console.log(`  ✓ [${r.sku}] ${r.nombre}`);
    saved++;
  }

  console.log(`\nListo: ${saved} productos actualizados.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
