import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const TABLAS = [
  "pisos_flotantes", "porcellanatos", "revestimientos",
  "pisos_vinilicos", "pisos_madera", "decks", "maderas", "accesorios",
];
const DESTINO = path.resolve("./public/productos");
const IMAGENES_SKU = path.resolve("./imagenes-sku");
const EXTENSIONES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// ── Paso 0: Crear carpeta destino ──
if (!fs.existsSync(DESTINO)) fs.mkdirSync(DESTINO, { recursive: true });

// ── Paso 1: Indexar TODAS las imágenes disponibles (public/ + imagenes-sku/) ──
function escanear(carpeta) {
  const archivos = [];
  if (!fs.existsSync(carpeta)) return archivos;
  for (const el of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, el.name);
    if (el.isDirectory()) {
      archivos.push(...escanear(ruta));
    } else if (EXTENSIONES.has(path.extname(el.name).toLowerCase())) {
      archivos.push({ nombre: el.name, ruta });
    }
  }
  return archivos;
}

function hashArchivo(ruta) {
  return crypto.createHash("md5").update(fs.readFileSync(ruta)).digest("hex");
}

async function main() {
  console.log("═".repeat(60));
  console.log("  CONSOLIDACIÓN DE IMÁGENES");
  console.log("═".repeat(60));

  // Indexar todas las imágenes disponibles por nombre
  const todasLasImagenes = new Map(); // nombre -> ruta
  for (const img of [...escanear("./public"), ...escanear(IMAGENES_SKU)]) {
    if (!todasLasImagenes.has(img.nombre)) {
      todasLasImagenes.set(img.nombre, img.ruta);
    }
  }
  console.log(`\nImágenes disponibles en total: ${todasLasImagenes.size}`);

  // ── Paso 2: Leer la DB y verificar ──
  let copiadas = 0;
  let faltantes = 0;
  let duplicadasDB = 0;
  let actualizadasDB = 0;
  let productosActualizados = 0;
  let productosSinImg = 0;

  for (const tabla of TABLAS) {
    const res = await turso.execute(
      `SELECT id, sku, nombre, imagenes FROM ${tabla} WHERE isActive = 1`
    );
    console.log(`\n📦 ${tabla.toUpperCase()} (${res.rows.length} productos)`);

    for (const row of res.rows) {
      const rawImg = String(row.imagenes ?? "").trim();
      if (!rawImg || rawImg === "null" || rawImg === "[]") {
        productosSinImg++;
        continue;
      }

      let imgs;
      try { imgs = JSON.parse(rawImg); } catch { continue; }
      if (!Array.isArray(imgs) || imgs.length === 0) {
        productosSinImg++;
        continue;
      }

      // Quitar duplicados
      const unicas = [...new Set(imgs)];
      if (unicas.length < imgs.length) {
        duplicadasDB += imgs.length - unicas.length;
      }

      // Procesar cada imagen
      const imagenesFinales = [];
      for (const imgPath of unicas) {
        const nombre = path.basename(imgPath);
        const destino = path.join(DESTINO, nombre);
        const rutaNueva = `/productos/${nombre}`;

        // Si ya está en destino, ok
        if (fs.existsSync(destino)) {
          imagenesFinales.push(rutaNueva);
          continue;
        }

        // Buscar en las fuentes disponibles
        const fuente = todasLasImagenes.get(nombre);
        if (fuente && fs.existsSync(fuente)) {
          fs.copyFileSync(fuente, destino);
          copiadas++;
          imagenesFinales.push(rutaNueva);
        } else {
          console.log(`  ❌ FALTANTE | SKU: ${row.sku} | ${nombre}`);
          faltantes++;
        }
      }

      // Actualizar DB si cambió algo (rutas nuevas o duplicados eliminados)
      const nuevoJson = JSON.stringify(imagenesFinales);
      if (nuevoJson !== rawImg) {
        await turso.execute({
          sql: `UPDATE ${tabla} SET imagenes = ? WHERE id = ?`,
          args: [nuevoJson, row.id],
        });
        productosActualizados++;
      }
    }
  }

  // ── Paso 3: Detectar duplicados por contenido en la carpeta destino ──
  console.log("\n🔍 Buscando duplicados por contenido en /public/productos/...");
  const hashMap = new Map(); // hash -> nombre
  let duplicadosArchivo = 0;
  const archivosDestino = fs.readdirSync(DESTINO).filter(f =>
    EXTENSIONES.has(path.extname(f).toLowerCase())
  );
  for (const nombre of archivosDestino) {
    const ruta = path.join(DESTINO, nombre);
    const hash = hashArchivo(ruta);
    if (hashMap.has(hash)) {
      console.log(`  🔁 ${nombre} es idéntico a ${hashMap.get(hash)}`);
      duplicadosArchivo++;
    } else {
      hashMap.set(hash, nombre);
    }
  }
  if (duplicadosArchivo === 0) console.log("  ✅ Sin duplicados por contenido");

  // ── Resumen ──
  console.log("\n" + "═".repeat(60));
  console.log("  RESUMEN");
  console.log("═".repeat(60));
  console.log(`  Imágenes copiadas a /public/productos/:  ${copiadas}`);
  console.log(`  Duplicados eliminados en DB:             ${duplicadasDB}`);
  console.log(`  Productos actualizados en DB:            ${productosActualizados}`);
  console.log(`  Productos sin imágenes:                  ${productosSinImg}`);
  console.log(`  Archivos faltantes (no encontrados):     ${faltantes}`);
  console.log(`  Archivos duplicados por contenido:       ${duplicadosArchivo}`);
  console.log("═".repeat(60) + "\n");

  if (faltantes > 0) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
