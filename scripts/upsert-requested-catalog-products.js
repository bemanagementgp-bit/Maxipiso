const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    const commentIndex = value.indexOf(" #");

    if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const products = [
  {
    sku: "25063",
    nombre: "Piso Vinílico Click SPC 2113-2",
    marca: "MaxiPiso",
    descripcion: "Piso vinílico SPC residencial en oferta.",
    precio: 52.39,
    categoria: "Pisos",
    subcategoria: "Vinílico",
  },
  {
    sku: "23554",
    nombre: "Piso Flotante Water Resistant Adak",
    marca: "Kronotex",
    descripcion: "Piso flotante AC5 de uso comercial intenso.",
    precio: 21.85,
    categoria: "Pisos",
    subcategoria: "Laminados WTR",
  },
  {
    sku: "22571",
    nombre: "Porcelanato Acacia White",
    marca: "Itagres",
    descripcion: "Porcelanato simil madera apto exterior.",
    precio: 23.33,
    categoria: "Pisos",
    subcategoria: "Porcelanato",
  },
  {
    sku: "22323",
    nombre: "Piso Ingeniería Tauari Tostado",
    marca: "Max Core",
    descripcion: "Piso de ingeniería prefinished entablonado.",
    precio: 141,
    categoria: "Pisos",
    subcategoria: "Ingeniería",
  },
  {
    sku: "25383",
    nombre: "Revestimiento Exterior WPC Smoke Grey",
    marca: "Max Core",
    descripcion: "Revestimiento exterior WPC alistonado 5 varillas.",
    precio: 44.2,
    categoria: "Revestimientos",
    subcategoria: "Exterior - Perfiles WPC",
  },
  {
    sku: "22550",
    nombre: "Deck WPC Fresno Nórdico",
    marca: "Max Core",
    descripcion: "Deck WPC línea Noble.",
    precio: 38,
    categoria: "Decks",
    subcategoria: "WPC",
  },
  {
    sku: "23289",
    nombre: "Madera Canteada Tajibo AD",
    marca: "MaxiPiso",
    descripcion: "Madera canteada natural importada de Bolivia.",
    precio: 0,
    categoria: "Maderas",
    subcategoria: null,
  },
  {
    sku: "3680",
    nombre: "Terminación de Aluminio Desnivel 10 mm",
    marca: "MaxiPiso",
    descripcion: "Accesorio para pisos flotantes con terminación desnivel.",
    precio: 0,
    categoria: "Accesorios",
    subcategoria: "ACC PISOS - Terminaciones de Aluminio",
  },
];

async function main() {
  loadEnvLocal();

  const adapter = new PrismaLibSQL({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    for (const product of products) {
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: product,
        create: product,
      });
    }

    console.log(`Upsertados ${products.length} productos.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});