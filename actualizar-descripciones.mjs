import process from "node:process";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const TABLAS = [
  "pisos_flotantes", "porcellanatos", "revestimientos",
  "pisos_vinilicos", "pisos_madera", "decks", "maderas", "accesorios",
];

function generarDescripcion(tabla, row) {
  const nombre = s(row.nombre) || s(row.especie) || s(row.sku);
  const marca = s(row.marca);
  const linea = s(row.linea);
  const material = s(row.material);
  const origen = s(row.origen);
  const espesor = medida(row.espesor, row.espesorUm || row.espesor_um, "mm");
  const ancho = medida(row.ancho, row.anchoUm || row.ancho_um, "mm");
  const largo = medida(row.largo, row.largoUm || row.largo_um, "mm");
  const uso = s(row.tipoDeUso) || s(row.uso);
  const acabado = s(row.acabado);
  const terminacion = s(row.terminacion);
  const bisel = s(row.bisel);
  const base = medida(row.base || row.baseTabla, row.baseUm || row.baseTablUm || row.base_um, "m²");
  const mantoIncorporado = s(row.mantoIncorporado);
  const capaDeUso = s(row.capaDeUso);
  const abrasion = s(row.abrasion);
  const tipoProducto = s(row.tipoProducto);
  const especie = s(row.especie);
  const colores = s(row.colores);
  const dimensiones = s(row.dimensiones);
  const subtipo = s(row.subtipo);

  const partes = [];

  switch (tabla) {
    case "pisos_flotantes": {
      const intro = marca
        ? `${nombre} es un piso flotante de la marca ${marca}`
        : `${nombre} es un piso flotante`;
      partes.push(linea ? `${intro}, línea ${linea}.` : `${intro}.`);
      if (origen) partes.push(`De origen ${origen}.`);
      if (uso) partes.push(`Diseñado para uso ${uso.toLowerCase()}.`);
      if (acabado) partes.push(`Acabado ${acabado.toLowerCase()}.`);
      if (terminacion) partes.push(`Característica: ${terminacion.toLowerCase()}.`);
      if (bisel) partes.push(`Bisel: ${bisel}.`);
      const dims = [espesor && `espesor de ${espesor}`, ancho && `ancho de ${ancho}`, largo && `largo de ${largo}`].filter(Boolean);
      if (dims.length > 0) partes.push(`Cada unidad tiene un ${dims.join(", un ")}.`);
      if (mantoIncorporado && mantoIncorporado.toLowerCase() !== "no") partes.push(`Incluye manto incorporado.`);
      if (abrasion) partes.push(`Abrasión: ${abrasion}.`);
      if (base) partes.push(`Base de ${base}.`);
      break;
    }
    case "porcellanatos": {
      const intro = marca
        ? `${nombre} es un porcelanato de la marca ${marca}`
        : `${nombre} es un porcelanato`;
      partes.push(linea ? `${intro}, línea ${linea}.` : `${intro}.`);
      if (origen) partes.push(`De origen ${origen}.`);
      if (uso) partes.push(`Para uso ${uso.toLowerCase()}.`);
      if (acabado) partes.push(`Acabado ${acabado.toLowerCase()}.`);
      if (terminacion) partes.push(`Característica: ${terminacion.toLowerCase()}.`);
      const dims = [espesor && `espesor de ${espesor}`, ancho && `ancho de ${ancho}`, largo && `largo de ${largo}`].filter(Boolean);
      if (dims.length > 0) partes.push(`Cada unidad tiene un ${dims.join(", un ")}.`);
      if (base) partes.push(`Base de ${base}.`);
      break;
    }
    case "revestimientos": {
      const intro = marca
        ? `${nombre} es un revestimiento de la marca ${marca}`
        : `${nombre} es un revestimiento`;
      partes.push(linea ? `${intro}, línea ${linea}.` : `${intro}.`);
      if (material) partes.push(`Fabricado en ${material}.`);
      if (uso) partes.push(`Para uso ${uso.toLowerCase()}.`);
      const dims = [espesor && `espesor de ${espesor}`, ancho && `ancho de ${ancho}`, largo && `largo de ${largo}`].filter(Boolean);
      if (dims.length > 0) partes.push(`Cada unidad tiene un ${dims.join(", un ")}.`);
      if (base) partes.push(`Base tabla de ${base}.`);
      break;
    }
    case "pisos_vinilicos": {
      const intro = marca
        ? `${nombre} es un piso vinílico de la marca ${marca}`
        : `${nombre} es un piso vinílico`;
      partes.push(linea ? `${intro}, línea ${linea}.` : `${intro}.`);
      if (origen) partes.push(`De origen ${origen}.`);
      if (uso) partes.push(`Para uso ${uso.toLowerCase()}.`);
      if (material) partes.push(`Fabricado en ${material}.`);
      if (bisel) partes.push(`Bisel: ${bisel}.`);
      const dims = [espesor && `espesor de ${espesor}`, ancho && `ancho de ${ancho}`, largo && `largo de ${largo}`].filter(Boolean);
      if (dims.length > 0) partes.push(`Cada unidad tiene un ${dims.join(", un ")}.`);
      if (capaDeUso) partes.push(`Capa de uso: ${capaDeUso}.`);
      if (mantoIncorporado && mantoIncorporado.toLowerCase() !== "no") partes.push(`Incluye manto incorporado.`);
      break;
    }
    case "pisos_madera": {
      const intro = especie
        ? `${nombre} es un piso de madera de especie ${especie}`
        : `${nombre} es un piso de madera`;
      partes.push(marca ? `${intro}, marca ${marca}.` : `${intro}.`);
      if (origen) partes.push(`De origen ${origen}.`);
      if (acabado) partes.push(`Acabado ${acabado.toLowerCase()}.`);
      if (terminacion) partes.push(`Característica: ${terminacion.toLowerCase()}.`);
      if (bisel) partes.push(`Bisel: ${bisel}.`);
      const dims = [espesor && `espesor de ${espesor}`, ancho && `ancho de ${ancho}`, largo && `largo de ${largo}`].filter(Boolean);
      if (dims.length > 0) partes.push(`Cada unidad tiene un ${dims.join(", un ")}.`);
      if (base) partes.push(`Base de ${base}.`);
      break;
    }
    case "decks": {
      const intro = marca
        ? `Este ${tipoProducto?.toLowerCase() || "deck"} de la marca ${marca}`
        : `Este ${tipoProducto?.toLowerCase() || "deck"}`;
      partes.push(linea ? `${intro}, línea ${linea}, en color ${nombre}.` : `${intro} en color ${nombre}.`);
      if (material) partes.push(`Está fabricado en ${material}.`);
      if (uso) partes.push(`Diseñado para uso ${uso.toLowerCase()}.`);
      const dims = [espesor && `espesor de ${espesor}`, ancho && `ancho de ${ancho}`, largo && `largo de ${largo}`].filter(Boolean);
      if (dims.length > 0) partes.push(`Cada unidad tiene un ${dims.join(", un ")}.`);
      if (base) partes.push(`Base tabla de ${base}.`);
      break;
    }
    case "maderas": {
      partes.push(`${nombre} es una madera${tipoProducto ? ` de tipo ${tipoProducto.toLowerCase()}` : ""}.`);
      if (origen) partes.push(`De origen ${origen}.`);
      const espDisp = s(row.espesoresDisponibles);
      if (espDisp) partes.push(`Espesores disponibles: ${espDisp}.`);
      break;
    }
    case "accesorios": {
      partes.push(`${nombre} es un accesorio${tipoProducto ? ` de tipo ${tipoProducto.toLowerCase()}` : ""}.`);
      if (subtipo) partes.push(`Subtipo: ${subtipo}.`);
      if (dimensiones) partes.push(`Dimensiones: ${dimensiones}.`);
      if (colores) partes.push(`Colores disponibles: ${colores}.`);
      if (material) partes.push(`Material: ${material}.`);
      break;
    }
  }

  return partes.join(" ");
}

function s(val) {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  return str === "" || str.toLowerCase() === "null" ? "" : str;
}

function medida(val, um, defaultUm) {
  const v = s(val);
  if (!v) return "";
  const u = s(um) || defaultUm;
  return `${v} ${u}`;
}

async function main() {
  console.log("═".repeat(60));
  console.log("  ACTUALIZACIÓN DE DESCRIPCIONES");
  console.log("═".repeat(60));

  let total = 0;
  let actualizados = 0;
  let errores = 0;

  for (const tabla of TABLAS) {
    const res = await turso.execute(`SELECT * FROM ${tabla} WHERE isActive = 1`);
    console.log(`\n📦 ${tabla.toUpperCase()} (${res.rows.length} productos)`);

    for (const row of res.rows) {
      total++;
      try {
        const desc = generarDescripcion(tabla, row);
        await turso.execute({
          sql: `UPDATE ${tabla} SET descripcion = ? WHERE id = ?`,
          args: [desc, row.id],
        });
        actualizados++;
      } catch (e) {
        errores++;
        console.log(`  ❌ ERROR | SKU: ${row.sku} | ${e.message}`);
      }
    }
    console.log(`  ✅ ${res.rows.length} descripciones actualizadas`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("  RESUMEN");
  console.log("═".repeat(60));
  console.log(`  Total productos:    ${total}`);
  console.log(`  Actualizados:       ${actualizados}`);
  console.log(`  Errores:            ${errores}`);
  console.log("═".repeat(60) + "\n");
}

main().catch(e => { console.error(e); process.exitCode = 1; });
