const fs = require("fs");
const path = require("path");
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

function extractGoogleDriveFileId(input) {
  const value = String(input || "").trim();

  if (!value) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const idFromQuery = url.searchParams.get("id");

    if (idFromQuery) {
      return idFromQuery;
    }

    const match = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    return null;
  }

  return null;
}

function toGoogleDrivePreviewUrl(input) {
  const value = String(input || "").trim();
  const fileId = extractGoogleDriveFileId(value);

  if (!fileId) {
    return value;
  }

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function readUrlsFromArgs() {
  const args = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);

  if (args.length === 1 && args[0].endsWith(".json")) {
    const filePath = path.isAbsolute(args[0])
      ? args[0]
      : path.join(process.cwd(), args[0]);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed)) {
      throw new Error("El JSON debe ser un array de links o fileIds");
    }
    return parsed.map((value) => String(value).trim()).filter(Boolean);
  }

  return args;
}

async function main() {
  loadEnvLocal();

  const rawUrls = readUrlsFromArgs();

  if (rawUrls.length === 0) {
    throw new Error(
      "Pasa links o fileIds por argumento, o un archivo JSON. Ejemplo: npm run assign:drive-images -- \"https://drive.google.com/file/d/FILE_ID/view\""
    );
  }

  const urls = rawUrls.slice(0, 10).map(toGoogleDrivePreviewUrl);

  const adapter = new PrismaLibSQL({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const assignments = [];

    for (let index = 0; index < products.length && index < urls.length; index += 1) {
      const product = products[index];
      const imagen = urls[index];

      await prisma.product.update({
        where: { id: product.id },
        data: { imagen },
      });

      assignments.push({
        position: index + 1,
        sku: product.sku,
        nombre: product.nombre,
        imagen,
      });
    }

    console.log(JSON.stringify({ updated: assignments.length, assignments }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});