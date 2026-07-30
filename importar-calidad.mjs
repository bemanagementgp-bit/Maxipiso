import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { readFileSync } from "fs";
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  // Read Excel with openpyxl via a quick Python subprocess
  const { execSync } = await import("child_process");
  let data;
  try {
    data = execSync(`py -c "import openpyxl, json; wb = openpyxl.load_workbook(r'C:\\Users\\nahue\\OneDrive\\Escritorio\\Projects\\web\\web-maxipiso\\Master-nueva web (12).xlsx', data_only=True); ws = wb['PISOS DE MADERA E INGENIERIA']; rows = []; [rows.append({'sku': str(row[0]).strip().replace('.0',''), 'calidad': str(row[10]).strip()}) for row in ws.iter_rows(min_row=2, values_only=True) if row[0] and row[10] and str(row[10]).strip() != 'None']; print(json.dumps(rows))"`, { encoding: "utf-8" }).trim();
  } catch (e) {
    console.error("Error ejecutando Python:", e.stderr?.toString() || e.message);
    return;
  }

  const rows = JSON.parse(data);
  console.log(`Encontrados ${rows.length} productos con calidad en el Excel`);

  let updated = 0;
  let notFound = 0;

  for (const { sku, calidad } of rows) {
    const result = await db.execute({
      sql: "UPDATE pisos_madera SET calidad = ? WHERE sku = ?",
      args: [calidad, sku],
    });
    if (result.rowsAffected > 0) {
      updated++;
    } else {
      notFound++;
      console.log(`  SKU ${sku} no encontrado en BD`);
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Actualizados: ${updated}`);
  console.log(`No encontrados: ${notFound}`);

  // Verificar
  const check = await db.execute("SELECT COUNT(*) as total FROM pisos_madera WHERE calidad IS NOT NULL");
  console.log(`Productos con calidad en BD: ${check.rows[0].total}`);
}

main().catch(console.error);
