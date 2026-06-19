const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

const productos = [
  { sku: "23289", nombre: "Tajibo AD",                  sub: "Madera Canteada",       origen: "Bolivia",          espesores: '1" | 1.5" | 2" | 3"',             medidas: "2.10m o mas",                     secado: "Natural", precio: 5.65,  unidad: "p2", moneda: "USD" },
  { sku: "23277", nombre: "Roble Corto AD",              sub: "Madera Canteada",       origen: "Brasil / Bolivia", espesores: '1" | 1.5" | 2" | 3"',             medidas: "inferior a 2.10m",                secado: "Natural", precio: 3.5,   unidad: "p2", moneda: "USD" },
  { sku: "23290", nombre: "Roble Largo AD",              sub: "Madera Canteada",       origen: "Brasil / Bolivia", espesores: '1" | 1.5" | 2" | 3"',             medidas: "2.10m o mas",                     secado: "Natural", precio: 4.45,  unidad: "p2", moneda: "USD" },
  { sku: "23291", nombre: "Angelin KD",                  sub: "Madera Canteada",       origen: "Brasil / Bolivia", espesores: '1" | 1.5" | 2" | 2.5" | 3"',      medidas: "2.10m o mas",                     secado: "Horno",   precio: 3.3,   unidad: "p2", moneda: "USD" },
  { sku: "23278", nombre: "Cedro Arana Corto KD",        sub: "Madera Canteada",       origen: "Brasil / Bolivia", espesores: '1" | 1.5" | 2"',                   medidas: "inferior a 2.10m",                secado: "Horno",   precio: 3.15,  unidad: "p2", moneda: "USD" },
  { sku: "23292", nombre: "Cedro Arana Largo KD",        sub: "Madera Canteada",       origen: "Brasil / Bolivia", espesores: '1" | 1.5" | 2"',                   medidas: "2.10m o mas",                     secado: "Horno",   precio: 2.5,   unidad: "p2", moneda: "USD" },
  { sku: "23279", nombre: "Cedro Corto KD",              sub: "Madera Canteada",       origen: "Brasil",           espesores: '1" | 1.5" | 2" | 3"',             medidas: "inferior a 2.10m",                secado: "Horno",   precio: 5.05,  unidad: "p2", moneda: "USD" },
  { sku: "23293", nombre: "Cedro Largo KD",              sub: "Madera Canteada",       origen: "Brasil",           espesores: '1" | 1.5" | 2" | 3"',             medidas: "2.10m o mas",                     secado: "Horno",   precio: 6.35,  unidad: "p2", moneda: "USD" },
  { sku: "23294", nombre: "Jequetiba Corto KD",          sub: "Madera Canteada",       origen: "Brasil",           espesores: '1" | 1.5" | 2"',                   medidas: "inferior a 2.10m",                secado: "Horno",   precio: 3.25,  unidad: "p2", moneda: "USD" },
  { sku: "23295", nombre: "Jequetiba Largo KD",          sub: "Madera Canteada",       origen: "Brasil",           espesores: '1" | 1.5" | 2"',                   medidas: "2.10m o mas",                     secado: "Horno",   precio: 2.8,   unidad: "p2", moneda: "USD" },
  { sku: "23296", nombre: "Tahuari",                     sub: "Madera Canteada",       origen: "Brasil",           espesores: '2"',                                medidas: "2.10m o mas",                     secado: "Natural", precio: 7.4,   unidad: "p2", moneda: "USD" },
  { sku: "23297", nombre: "Caoba Largo KD",              sub: "Madera Canteada",       origen: "Africa",           espesores: '2"',                                medidas: "2.10m o mas",                     secado: "Horno",   precio: 7,     unidad: "p2", moneda: "USD" },
  { sku: "23281", nombre: "Okume Corto KD",              sub: "Madera Canteada",       origen: "Africa",           espesores: '1" | 1.5" | 2" | 2.5" | 3" | 4"', medidas: "inferior a 2.10m",                secado: "Horno",   precio: 3.1,   unidad: "p2", moneda: "USD" },
  { sku: "23298", nombre: "Okume Largo KD",              sub: "Madera Canteada",       origen: "Africa",           espesores: '1" | 1.5" | 2" | 2.5" | 3" | 4"', medidas: "2.10m o mas",                     secado: "Horno",   precio: 2.5,   unidad: "p2", moneda: "USD" },
  { sku: "23299", nombre: "Okume Dimensionado KD",       sub: "Madera Canteada",       origen: "Africa",           espesores: "40mm",                              medidas: "110/160mm x 2130mm Marco Puerta", secado: "Horno",   precio: 4,     unidad: "p2", moneda: "USD" },
  { sku: "23301", nombre: "Iroko KD",                    sub: "Madera Canteada",       origen: "Africa",           espesores: '1" | 2"',                           medidas: "2.10m o mas",                     secado: "Horno",   precio: 8.4,   unidad: "p2", moneda: "USD" },
  { sku: "23302", nombre: "Roble Americano KD",          sub: "Madera Canteada",       origen: "EE.UU.",           espesores: '1"',                                medidas: "2.10m o mas",                     secado: "Horno",   precio: 11,    unidad: "p2", moneda: "USD" },
  { sku: "6432",  nombre: "Roble Americano KD Especial", sub: "Madera Canteada",       origen: "EE.UU.",           espesores: '1"',                                medidas: "8 pulgadas x 2.10m o mas",        secado: "Horno",   precio: 18.65, unidad: "p2", moneda: "USD" },
  { sku: "23300", nombre: "Roble Europeo KD Prime",      sub: "Madera Canteada",       origen: "Croacia",          espesores: '1" | 2" | 3"',                     medidas: "2.10m o mas",                     secado: "Horno",   precio: 14,    unidad: "p2", moneda: "USD" },
  { sku: "23303", nombre: "Virola",                      sub: "Madera Canteada",       origen: "Peru",             espesores: '1.5" | 2"',                         medidas: "2.10m o mas",                     secado: "Natural", precio: 5,     unidad: "p2", moneda: "USD" },
  { sku: "23282", nombre: "Marupa Corto KD",             sub: "Madera Canteada",       origen: "Africa",           espesores: '1" | 1.5" | 2" | 2.5" | 3" | 4"', medidas: "inferior a 2.10m",                secado: "Horno",   precio: 2.9,   unidad: "p2", moneda: "USD" },
  { sku: "23304", nombre: "Marupa Largo KD",             sub: "Madera Canteada",       origen: "Africa",           espesores: '1" | 1.5" | 2" | 2.5" | 3" | 4"', medidas: "2.10m o mas",                     secado: "Horno",   precio: 2.2,   unidad: "p2", moneda: "USD" },
  { sku: "23305", nombre: "Roble Africano KD Primera",   sub: "Madera Canteada",       origen: "Africa",           espesores: '1" | 1.5" | 2"',                   medidas: "2.10m o mas",                     secado: "Horno",   precio: 5.65,  unidad: "p2", moneda: "USD" },
  { sku: "23307", nombre: "Pino Hemlock",                sub: "Madera Canteada",       origen: "Canada",           espesores: '2" | 3"',                           medidas: "2.10m o mas",                     secado: "Natural", precio: 7,     unidad: "p2", moneda: "USD" },
  { sku: "23308", nombre: "Eucaliptus",                  sub: "Madera Canteada",       origen: "Uruguay",          espesores: '1" | 1.5" | 2"',                   medidas: "2.10m o mas",                     secado: "Natural", precio: 3.5,   unidad: "p2", moneda: "USD" },
  { sku: "23309", nombre: "Grapia",                      sub: "Madera Canteada",       origen: "Misiones",         espesores: '2"',                                medidas: "2.10m o mas",                     secado: "Natural", precio: 3465,  unidad: "p2", moneda: "ARS" },
  { sku: "23313", nombre: "Jatoba",                      sub: "Madera para Escaleras", origen: "Brasil",           espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 6.55,  unidad: "p2", moneda: "USD" },
  { sku: "23314", nombre: "Ipe",                         sub: "Madera para Escaleras", origen: "Bolivia",          espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 11.5,  unidad: "p2", moneda: "USD" },
  { sku: "23315", nombre: "Viraro",                      sub: "Madera para Escaleras", origen: "Paraguay",         espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 4.25,  unidad: "p2", moneda: "USD" },
  { sku: "23316", nombre: "Roble Americano",             sub: "Madera para Escaleras", origen: "EE.UU.",           espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 27.05, unidad: "p2", moneda: "USD" },
  { sku: "23317", nombre: "Cumaru",                      sub: "Madera para Escaleras", origen: "Peru",             espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 11.7,  unidad: "p2", moneda: "USD" },
  { sku: "23318", nombre: "Jequetiba",                   sub: "Madera para Escaleras", origen: "Brasil",           espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 7.5,   unidad: "p2", moneda: "USD" },
  { sku: "23319", nombre: "Tahuari",                     sub: "Madera para Escaleras", origen: "Brasil",           espesores: '1.5"',                              medidas: "12 pulgadas x L.V.",              secado: "Horno",   precio: 7.95,  unidad: "p2", moneda: "USD" },
];

async function main() {
  loadEnv();
  const client = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
  let updated = 0, inserted = 0;

  for (const p of productos) {
    const specs = JSON.stringify({ Origen: p.origen, "Espesores Disponibles": p.espesores, Medidas: p.medidas, Secado: p.secado });
    const descripcion = p.sub + " de " + p.origen + ". Espesores: " + p.espesores + ". Medidas: " + p.medidas + ". Secado: " + p.secado + ".";
    const now = new Date().toISOString();
    const existing = await client.execute({ sql: "SELECT id FROM products WHERE sku = ? LIMIT 1", args: [p.sku] });
    if (existing.rows.length > 0) {
      await client.execute({ sql: "UPDATE products SET nombre=?, subcategoria=?, descripcion=?, precio=?, specs=?, unidadMedida=?, moneda=?, categoria='Maderas', updatedAt=? WHERE sku=?", args: [p.nombre, p.sub, descripcion, p.precio, specs, p.unidad, p.moneda, now, p.sku] });
      console.log("actualizado: " + p.sku + " " + p.nombre);
      updated++;
    } else {
      await client.execute({ sql: "INSERT INTO products (id, sku, nombre, marca, descripcion, precio, categoria, subcategoria, specs, unidadMedida, moneda, isActive, destacado, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'Maderas', ?, ?, ?, ?, 1, 0, ?, ?)", args: [require("crypto").randomUUID(), p.sku, p.nombre, "Maxipiso", descripcion, p.precio, p.sub, specs, p.unidad, p.moneda, now, now] });
      console.log("insertado: " + p.sku + " " + p.nombre);
      inserted++;
    }
  }
  console.log("\nListo: " + inserted + " insertados, " + updated + " actualizados.");
  const sample = await client.execute("SELECT sku, nombre, subcategoria, precio, unidadMedida, moneda, specs FROM products WHERE categoria='Maderas' LIMIT 1");
  console.log("Ejemplo:", JSON.stringify(sample.rows[0], null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
