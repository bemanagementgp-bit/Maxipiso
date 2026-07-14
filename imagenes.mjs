import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@libsql/client";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CARPETA_IMAGENES = path.resolve("./imagenes-sku");
const CARPETA_DESTINO = path.resolve("./public");

const TABLAS = [
  "pisos_flotantes",
  "porcellanatos",
  "revestimientos",
  "pisos_vinilicos",
  "pisos_madera",
  "decks",
  "maderas",
  "accesorios",
];

const MODO_PRUEBA = false;
const REEMPLAZAR_EXISTENTES = true;

const EXTENSIONES_VALIDAS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// ============================================================
// CONEXIÓN
// ============================================================

const databaseUrl = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!databaseUrl) throw new Error("No se encontró DATABASE_URL en .env");
if (!authToken) throw new Error("No se encontró DATABASE_AUTH_TOKEN en .env");

const turso = createClient({ url: databaseUrl, authToken });

// ============================================================
// FUNCIONES
// ============================================================

function escanearImagenes(carpeta) {
  const resultados = [];
  const elementos = fs.readdirSync(carpeta, { withFileTypes: true });

  for (const el of elementos) {
    const ruta = path.join(carpeta, el.name);
    if (el.isDirectory()) {
      resultados.push(...escanearImagenes(ruta));
    } else if (EXTENSIONES_VALIDAS.has(path.extname(el.name).toLowerCase())) {
      resultados.push(ruta);
    }
  }
  return resultados;
}

function extraerSku(nombreArchivo) {
  const sinExt = path.basename(nombreArchivo, path.extname(nombreArchivo));
  const match = sinExt.match(/^(\d+)/);
  return match ? match[1] : null;
}

function agruparPorSku(archivos) {
  const grupos = new Map();
  for (const ruta of archivos) {
    const nombre = path.basename(ruta);
    const sku = extraerSku(nombre);
    if (!sku) continue;
    if (!grupos.has(sku)) grupos.set(sku, []);
    grupos.get(sku).push({ nombre, ruta });
  }
  // Ordenar las imágenes de cada SKU (sku-1, sku-2, etc.)
  for (const [, imgs] of grupos) {
    imgs.sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }));
  }
  return grupos;
}

async function buscarEnTablas(sku) {
  for (const tabla of TABLAS) {
    try {
      const res = await turso.execute({
        sql: `SELECT id, sku, imagenes FROM ${tabla} WHERE TRIM(CAST(sku AS TEXT)) = ? LIMIT 1`,
        args: [sku],
      });
      if (res.rows.length > 0) {
        return { tabla, producto: res.rows[0] };
      }
    } catch (e) {
      // tabla puede no tener columna imagenes todavía
    }
  }
  return null;
}

// ============================================================
// PROCESO PRINCIPAL
// ============================================================

async function main() {
  const archivos = escanearImagenes(CARPETA_IMAGENES);
  const grupos = agruparPorSku(archivos);

  let encontrados = 0;
  let actualizados = 0;
  let noEncontrados = 0;
  let omitidos = 0;
  let copiados = 0;
  let errores = 0;

  console.log("");
  console.log(`Carpeta origen:  ${CARPETA_IMAGENES}`);
  console.log(`Carpeta destino: ${CARPETA_DESTINO}`);
  console.log(`Imágenes encontradas: ${archivos.length}`);
  console.log(`SKUs únicos: ${grupos.size}`);
  console.log(`Modo prueba: ${MODO_PRUEBA ? "SÍ" : "NO"}`);
  console.log("-".repeat(70));

  for (const [sku, imagenes] of grupos) {
    try {
      const resultado = await buscarEnTablas(sku);

      if (!resultado) {
        noEncontrados++;
        console.log(`NO ENCONTRADO | SKU: ${sku} | ${imagenes.length} imagen(es)`);
        continue;
      }

      encontrados++;
      const { tabla, producto } = resultado;
      const imagenesActuales = producto.imagenes;

      if (
        imagenesActuales &&
        String(imagenesActuales).trim() !== "" &&
        !REEMPLAZAR_EXISTENTES
      ) {
        omitidos++;
        console.log(`OMITIDO       | SKU: ${sku} | ${tabla} | Ya tiene imagenes`);
        continue;
      }

      // Nombres de archivo para guardar en la DB (rutas relativas a public/)
      const nombresArchivos = imagenes.map((img) => `/${img.nombre}`);
      const jsonImagenes = JSON.stringify(nombresArchivos);

      if (MODO_PRUEBA) {
        console.log(`SIMULACIÓN    | SKU: ${sku} | ${tabla} | ${jsonImagenes}`);
        continue;
      }

      // Copiar imágenes a public/
      for (const img of imagenes) {
        const destino = path.join(CARPETA_DESTINO, img.nombre);
        if (!fs.existsSync(destino)) {
          fs.copyFileSync(img.ruta, destino);
          copiados++;
        }
      }

      // Actualizar DB
      await turso.execute({
        sql: `UPDATE ${tabla} SET imagenes = ? WHERE TRIM(CAST(sku AS TEXT)) = ?`,
        args: [jsonImagenes, sku],
      });

      actualizados++;
      console.log(`ACTUALIZADO   | SKU: ${sku} | ${tabla} | ${nombresArchivos.length} imagen(es)`);

    } catch (error) {
      errores++;
      console.error(`ERROR         | SKU: ${sku} | ${error.message}`);
    }
  }

  console.log("");
  console.log("RESUMEN");
  console.log("-".repeat(70));
  console.log(`SKUs analizados:    ${grupos.size}`);
  console.log(`Encontrados en DB:  ${encontrados}`);
  console.log(`Actualizados:       ${actualizados}`);
  console.log(`Omitidos:           ${omitidos}`);
  console.log(`No encontrados:     ${noEncontrados}`);
  console.log(`Archivos copiados:  ${copiados}`);
  console.log(`Errores:            ${errores}`);

  if (MODO_PRUEBA) {
    console.log("");
    console.log("⚠ MODO PRUEBA: no se modificó la DB ni se copiaron archivos.");
    console.log("  Cambiá MODO_PRUEBA a false para ejecutar de verdad.");
  }
}

main().catch((error) => {
  console.error("\nEl proceso se detuvo:");
  console.error(error);
  process.exitCode = 1;
});
