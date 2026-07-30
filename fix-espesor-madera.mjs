import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Excel convierte fracciones como 3/4" a números seriales de fecha (ej: 46115).
// Mapeo conocido de fracciones en pulgadas a mm:
const FRACTION_TO_MM = {
  '1/4"':  6.35,
  '3/8"':  9.53,
  '1/2"':  12.7,
  '5/8"':  15.88,
  '3/4"':  19.05,
  '7/8"':  22.23,
  '1"':    25.4,
  '1 1/4"': 31.75,
  '1 1/2"': 38.1,
  '2"':    50.8,
};

async function main() {
  const rows = await db.execute("SELECT id, sku, nombre, especie, espesor, espesorUm, ancho, anchoUm, largo, largoUm FROM pisos_madera");

  console.log(`\n=== Pisos Madera: ${rows.rows.length} productos ===\n`);

  const suspicious = [];

  for (const r of rows.rows) {
    const espesor = String(r.espesor ?? "").trim();
    const ancho = String(r.ancho ?? "").trim();
    const largo = String(r.largo ?? "").trim();
    const name = r.nombre || r.especie || r.sku;

    // Detect suspicious values: large numbers that look like Excel date serials
    // or pure numbers > 1000 that don't make sense as mm
    const checkField = (field, val) => {
      if (!val) return;
      const num = Number(val);
      if (!isNaN(num) && num > 5000) {
        console.log(`⚠️  ${name} (SKU: ${r.sku}) - ${field}: ${val} (sospechoso, posible serial de Excel)`);
        suspicious.push({ id: r.id, sku: r.sku, name, field, value: val });
      }
    };

    checkField("espesor", espesor);
    checkField("ancho", ancho);
    checkField("largo", largo);

    // Also show all espesor values for review
    if (espesor) {
      console.log(`  ${name} (${r.sku}): espesor=${espesor} ${r.espesorUm || ""} | ancho=${ancho} ${r.anchoUm || ""} | largo=${largo} ${r.largoUm || ""}`);
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Total productos: ${rows.rows.length}`);
  console.log(`Valores sospechosos: ${suspicious.length}`);

  if (suspicious.length > 0) {
    console.log(`\nValores sospechosos encontrados:`);
    for (const s of suspicious) {
      console.log(`  - ${s.name} (${s.sku}): ${s.field} = ${s.value}`);
    }
  }
}

main().catch(console.error);
