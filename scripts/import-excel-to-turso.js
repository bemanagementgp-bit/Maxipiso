const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

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

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pickWorksheet(workbook) {
  const preferredSheet = workbook.SheetNames.find(
    (name) => normalizeHeader(name) === "productos extraidos"
  );

  if (preferredSheet) {
    return workbook.Sheets[preferredSheet];
  }

  return workbook.Sheets[workbook.SheetNames[0]];
}

function getField(row, aliases) {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

function buildDescription(row) {
  const parts = [
    getField(row, ["medidas"]),
    getField(row, ["ac/caracteristicas", "ac", "caracteristicas"]),
    getField(row, ["caja/base", "caja", "base"]),
    getField(row, ["observaciones"]),
    getField(row, ["texto extraido"]),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function parseProductRow(row) {
  const sku = String(
    getField(row, ["codigo/sku", "sku", "codigo", "codigo sku"]) || ""
  ).trim();

  const nombre = String(
    getField(row, ["producto", "nombre", "nombre producto"]) || ""
  ).trim();

  const marca = String(
    getField(row, ["marca", "categoria", "rubro", "linea"]) || ""
  ).trim();

  const precioRaw = getField(row, ["precio", "precio unitario", "valor"]);
  const precio = Number.parseFloat(String(precioRaw || "0").replace(",", "."));
  const imagen = String(getField(row, ["imagen", "image", "foto"]) || "").trim();

  return {
    sku,
    nombre,
    marca,
    descripcion: buildDescription(row),
    precio: Number.isFinite(precio) ? precio : 0,
    imagen: imagen || undefined,
  };
}

async function main() {
  loadEnvLocal();

  const fileName = process.argv[2] || "productos_maxipiso_lista_05_2026.xlsm";
  const workbook = XLSX.readFile(path.join(process.cwd(), fileName));
  const worksheet = pickWorksheet(workbook);
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const adapter = new PrismaLibSQL({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const prisma = new PrismaClient({ adapter });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  try {
    for (const row of rows) {
      const product = parseProductRow(row);

      if (!product.sku || !product.nombre || !product.marca) {
        skippedCount += 1;
        continue;
      }

      const existing = await prisma.product.findUnique({
        where: { sku: product.sku },
      });

      if (existing) {
        await prisma.product.update({
          where: { sku: product.sku },
          data: product,
        });
        updatedCount += 1;
      } else {
        await prisma.product.create({
          data: product,
        });
        createdCount += 1;
      }
    }

    console.log(JSON.stringify({ createdCount, updatedCount, skippedCount }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});