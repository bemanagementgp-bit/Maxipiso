/**
 * generate-image-map.js
 * 
 * Paso 1: Lista todos los archivos de Drive + productos de la BD
 * y genera un archivo image-map.json para que revises y corrijas el mapeo.
 * 
 * Uso:
 *   node scripts/generate-image-map.js
 *   node scripts/generate-image-map.js --categoria=Maderas
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");
const https = require("https");

const DRIVE_FOLDER_ID = "1mA4LfLp6whxNVm9ZSjgyYtY3MLOUXqHz";
const OUTPUT_FILE = path.join(process.cwd(), "image-map.json");

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
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("JSON inválido: " + data.slice(0, 300))); }
      });
    }).on("error", reject);
  });
}

function normalize(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = a.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(w => w.length >= 3);
  const wordsB = nb;
  const matches = wordsA.filter(w => wordsB.includes(normalize(w))).length;
  return matches > 0 ? matches / Math.max(wordsA.length, 1) : 0;
}

async function listDriveFiles(folderId, apiKey) {
  let allFiles = [];

  async function crawl(id, folderName) {
    let pageToken = null;
    do {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
      const url = `https://www.googleapis.com/drive/v3/files?q=%27${id}%27+in+parents+and+trashed=false&key=${apiKey}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000${pageParam}`;
      const res = await fetchJson(url);
      if (res.error) throw new Error(`Drive API error: ${res.error.message}`);
      const items = res.files || [];

      // Imágenes → agregar al resultado
      const images = items.filter(f => f.mimeType && f.mimeType.startsWith("image/"));
      allFiles = allFiles.concat(images);

      // Subcarpetas → entrar recursivamente
      const subfolders = items.filter(f => f.mimeType === "application/vnd.google-apps.folder");
      for (const sub of subfolders) {
        console.log(`   📂 Subcarpeta: ${sub.name}`);
        await crawl(sub.id, sub.name);
      }

      pageToken = res.nextPageToken || null;
    } while (pageToken);
  }

  await crawl(folderId, "raíz");
  return allFiles;
}

async function main() {
  loadEnv();

  const catFilter = (process.argv.find(a => a.startsWith("--categoria=")) || "").replace("--categoria=", "");
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  if (!apiKey) {
    console.error("❌ Falta GOOGLE_DRIVE_API_KEY en .env.local");
    process.exit(1);
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // 1. Listar Drive
  console.log("📁 Conectando con Google Drive...");
  const driveFiles = await listDriveFiles(DRIVE_FOLDER_ID, apiKey);
  console.log(`   ${driveFiles.length} imágenes encontradas en Drive\n`);

  // 2. Listar productos
  const sql = catFilter
    ? "SELECT id, sku, nombre, subcategoria, categoria, imagen FROM products WHERE isActive=1 AND categoria=? ORDER BY subcategoria, nombre"
    : "SELECT id, sku, nombre, subcategoria, categoria, imagen FROM products WHERE isActive=1 ORDER BY categoria, nombre";
  const args = catFilter ? [catFilter] : [];
  const result = await client.execute({ sql, args });
  const productos = result.rows;
  console.log(`🗂  ${productos.rows ? productos.rows.length : productos.length} productos en BD\n`);

  // 3. Generar mapeo con AMBAS imágenes por producto (-1 y -2)
  const entries = [];

  for (const prod of productos) {
    const sku = String(prod.sku);
    const nombre = String(prod.nombre);

    // Buscar todos los archivos que coincidan con este producto
    const candidatos = [];

    for (const file of driveFiles) {
      const fileBase = file.name.replace(/\.[^.]+$/, "");
      let score = 0;

      // Prioridad 1: nombre del archivo contiene el SKU exacto
      if (new RegExp(`(^|[^0-9])${sku}([^0-9]|$)`).test(fileBase)) {
        score = 1;
      } else {
        score = similarity(nombre, fileBase);
      }

      if (score >= 0.45) {
        candidatos.push({ file, score });
      }
    }

    // Ordenar por score desc, luego separar imagen1 (-1) e imagen2 (-2)
    candidatos.sort((a, b) => b.score - a.score);

    // Intentar detectar cuál es -1 y cuál es -2 por el nombre
    const img1 = candidatos.find(c => /-1\.[^.]+$/.test(c.file.name)) || candidatos[0] || null;
    const img2 = candidatos.find(c => /-2\.[^.]+$/.test(c.file.name)) || candidatos[1] || null;

    const maxScore = img1 ? img1.score : 0;

    entries.push({
      sku,
      nombre,
      subcategoria: String(prod.subcategoria || ""),
      categoria: String(prod.categoria || ""),
      imagen_actual: prod.imagen || null,
      // --- Imagen principal (se guarda en campo 'imagen' del producto) ---
      imagen_1_id:   img1 ? img1.file.id   : null,
      imagen_1_name: img1 ? img1.file.name : null,
      // --- Segunda imagen ---
      imagen_2_id:   img2 && img2 !== img1 ? img2.file.id   : null,
      imagen_2_name: img2 && img2 !== img1 ? img2.file.name : null,
      _confianza: Math.round(maxScore * 100) + "%",
      _notas: maxScore >= 0.9 ? "✅ alta confianza" :
               maxScore >= 0.45 ? "⚠️ revisar" :
               "❌ sin coincidencia - completar imagen_1_id manualmente",
    });
  }

  // 4. Guardar JSON
  const output = {
    _instrucciones: [
      "Revisá cada entrada. Si 'drive_file_id' es null o incorrecto, completalo con el ID del archivo de Drive.",
      "El ID de un archivo de Drive está en su URL: drive.google.com/file/d/ESTE_ES_EL_ID/view",
      "Para aplicar el mapeo ejecutá: node scripts/apply-image-map.js",
      "Para ignorar un producto dejá drive_file_id como null.",
    ],
    _archivos_disponibles_en_drive: driveFiles.map(f => ({
      id: f.id,
      nombre: f.name,
    })),
    productos: entries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

  const conAlta = entries.filter(e => parseInt(e._confianza) >= 90).length;
  const conMedia = entries.filter(e => parseInt(e._confianza) >= 45 && parseInt(e._confianza) < 90).length;
  const sinMatch = entries.filter(e => e.imagen_1_id === null).length;

  console.log("📊 Resumen del mapeo automático:");
  console.log(`   ✅ Alta confianza (≥90%):  ${conAlta}`);
  console.log(`   ⚠️  Media confianza (50-89%): ${conMedia}`);
  console.log(`   ❌ Sin coincidencia:        ${sinMatch}`);
  console.log(`\n📄 Archivo generado: image-map.json`);
  console.log("   → Abrilo, revisá las entradas con ⚠️ y ❌, corregí si hace falta");
  console.log("   → Luego ejecutá: node scripts/apply-image-map.js");
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
