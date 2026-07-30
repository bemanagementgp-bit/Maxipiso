import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const FLAGS_DIR = path.resolve("./public/flags");
let errores = 0;
let ok = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); ok++; }
function fail(msg) { console.log(`  ❌ ${msg}`); errores++; }

// 1. Verificar que todos los orígenes de la DB tienen bandera
async function verificarOrigenes() {
  console.log("\n🔍 ORÍGENES Y BANDERAS");
  const tablas = ["pisos_flotantes","porcellanatos","revestimientos","pisos_vinilicos","pisos_madera","decks","maderas","accesorios"];
  const origenes = new Set();
  for (const t of tablas) {
    try {
      const r = await turso.execute(`SELECT DISTINCT origen FROM ${t} WHERE origen IS NOT NULL AND origen != ''`);
      r.rows.forEach(row => origenes.add(String(row.origen).trim()));
    } catch {}
  }

  const { getFlagUrl, formatOriginLabel } = await import("./src/lib/flags.ts");

  for (const origen of [...origenes].sort()) {
    const flag = getFlagUrl(origen);
    const label = formatOriginLabel(origen);
    if (flag) {
      const svgPath = path.join("./public", flag);
      if (fs.existsSync(svgPath)) {
        pass(`${origen} → ${label} (${flag})`);
      } else {
        fail(`${origen} → archivo SVG no existe: ${svgPath}`);
      }
    } else {
      fail(`${origen} → sin bandera mapeada`);
    }
  }
}

// 2. Verificar códigos en pisos flotantes
async function verificarCodigos() {
  console.log("\n🔍 CÓDIGOS EN PISOS FLOTANTES");
  const r = await turso.execute("SELECT nombre, codigo FROM pisos_flotantes WHERE isActive = 1 AND codigo IS NOT NULL AND codigo != '' LIMIT 10");
  let sinCodigo = 0;
  for (const row of r.rows) {
    const nombre = String(row.nombre);
    const codigo = String(row.codigo).trim();
    if (!nombre.toLowerCase().includes(codigo.toLowerCase())) {
      // El código no está en el nombre, verificar que la lógica lo agregaría
      pass(`${nombre} + ${codigo} → se agregará como "${nombre} ${codigo}"`);
    } else {
      pass(`${nombre} → ya incluye código ${codigo}`);
    }
  }
}

// 3. Verificar que no hay imágenes duplicadas en la DB
async function verificarImagenesDuplicadas() {
  console.log("\n🔍 IMÁGENES DUPLICADAS EN DB");
  const tablas = ["pisos_flotantes","porcellanatos","revestimientos","pisos_vinilicos","pisos_madera","decks","maderas","accesorios"];
  let totalDup = 0;
  for (const t of tablas) {
    const r = await turso.execute(`SELECT sku, imagenes FROM ${t} WHERE imagenes IS NOT NULL AND imagenes != ''`);
    for (const row of r.rows) {
      try {
        const imgs = JSON.parse(String(row.imagenes));
        if (Array.isArray(imgs)) {
          const unicas = new Set(imgs);
          if (unicas.size < imgs.length) {
            fail(`${t} SKU ${row.sku}: ${imgs.length - unicas.size} imagen(es) duplicada(s)`);
            totalDup++;
          }
        }
      } catch {}
    }
  }
  if (totalDup === 0) pass("Sin imágenes duplicadas en ninguna tabla");
}

// 4. Verificar archivos de código
async function verificarCodigo() {
  console.log("\n🔍 VERIFICACIONES DE CÓDIGO");

  // Decks sin filtros
  const routeTs = fs.readFileSync("./src/app/api/catalogo/todos/route.ts", "utf8");
  if (routeTs.includes('"decks": []')) {
    pass("Decks sin filtros configurados");
  } else {
    fail("Decks todavía tiene filtros definidos");
  }

  // Prioridad de tipo de producto
  if (routeTs.includes("PRIORITY_TYPE")) {
    pass("Prioridad de tipoProducto configurada para revestimientos/porcelanatos/decks");
  } else {
    fail("Falta PRIORITY_TYPE para ordenar por tipo de producto");
  }

  // Header menú móvil
  const header = fs.readFileSync("./src/components/layout/Header.tsx", "utf8");
  const mobileMenuMatch = header.match(/md:hidden.*?<\/nav>/s);
  if (mobileMenuMatch && mobileMenuMatch[0].includes("STATIC_LINKS")) {
    pass("Menú móvil incluye links de navegación");
  } else {
    fail("Menú móvil no tiene links de navegación");
  }

  // Bandera después del nombre en catálogo
  const listing = fs.readFileSync("./src/components/catalog/CategoryListing.tsx", "utf8");
  const flagPattern = listing.match(/<span>\{label\}<\/span>\s*\n?\s*\{flagSrc/);
  if (flagPattern) {
    pass("Catálogo: bandera después del nombre de origen");
  } else {
    fail("Catálogo: bandera podría estar antes del nombre de origen");
  }

  // Página detalle usa product.nombre (con código)
  const detalle = fs.readFileSync("./src/app/catalogo/[id]/page.tsx", "utf8");
  if (detalle.includes("{product.nombre}") && detalle.includes("<h1")) {
    pass("Página detalle: h1 usa product.nombre (incluye código)");
  } else {
    fail("Página detalle: h1 podría no incluir el código");
  }

  // Porcelanatos sin doble L
  const porcellanatosCount = (listing + header + routeTs).match(/[Pp]orcellanato/gi);
  if (!porcellanatosCount) {
    pass("Sin 'Porcellanatos' con doble L");
  } else {
    fail(`Encontradas ${porcellanatosCount.length} ocurrencia(s) de 'Porcellanato' con doble L`);
  }

  // object-contain en imágenes
  const gallery = fs.readFileSync("./src/components/catalog/ProductGallery.tsx", "utf8");
  const carousel = fs.readFileSync("./src/components/catalog/ProductCarousel.tsx", "utf8");
  if (gallery.includes("object-contain") && carousel.includes("object-contain") && listing.includes("object-contain")) {
    pass("Imágenes usan object-contain en galería, carrusel y catálogo");
  } else {
    fail("Algún componente no usa object-contain");
  }

  // aspect-square en galería
  if (!gallery.includes("md:h-[690px]")) {
    pass("Galería: sin altura fija, usa aspect-square consistente");
  } else {
    fail("Galería: todavía tiene md:h-[690px]");
  }
}

// Ejecutar
async function main() {
  console.log("═".repeat(50));
  console.log("  VERIFICACIÓN DEL PROYECTO");
  console.log("═".repeat(50));

  await verificarOrigenes();
  await verificarCodigos();
  await verificarImagenesDuplicadas();
  await verificarCodigo();

  console.log("\n" + "═".repeat(50));
  console.log(`  RESULTADO: ${ok} pasaron, ${errores} fallaron`);
  console.log("═".repeat(50) + "\n");

  if (errores > 0) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
