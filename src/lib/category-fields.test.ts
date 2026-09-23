import { describe, expect, it } from "vitest";
import { CATEGORY_CONFIGS } from "./category-fields";

/**
 * Estas configs son la fuente de verdad del ABM: de acá salen los campos del
 * editor, las columnas de la grilla y qué acepta la importación. Un campo
 * declarado dos veces dibuja dos inputs para la misma columna, y uno que falta
 * es un dato que no se puede cargar por ningún lado.
 */

describe("CATEGORY_CONFIGS", () => {
  it("ninguna categoría declara el mismo campo dos veces", () => {
    for (const config of CATEGORY_CONFIGS) {
      const keys = config.fields.map((f) => f.key);
      expect(new Set(keys).size, `${config.tabla} repite un campo`).toBe(keys.length);
    }
  });

  it("todas pueden decir por qué unidad cobran", () => {
    // Un cliente preguntó si los $11.200 de una manta eran por metro, por
    // rollo o por unidad. La respuesta tiene que poder cargarse en las 8.
    for (const config of CATEGORY_CONFIGS) {
      expect(
        config.fields.some((f) => f.key === "unidadMedida"),
        `${config.tabla} no tiene unidad de precio`,
      ).toBe(true);
    }
  });

  it("todas tienen al menos una columna de precio", () => {
    for (const config of CATEGORY_CONFIGS) {
      expect(
        config.fields.some((f) => f.key.startsWith("precio")),
        `${config.tabla} no tiene precio`,
      ).toBe(true);
    }
  });

  it("los campos de precio se llaman igual en todas", () => {
    // "Unidad de medida" en una y "Unidad de precio" en otra son, para quien
    // carga, dos campos distintos.
    //
    // Sólo los de precio: `nombre` es "Nombre de madera" en maderas a
    // propósito, porque ahí el producto es la especie y el nombre es otra cosa.
    const DEBEN_COINCIDIR = ["unidadMedida", "moneda", "stock", "precioM2", "precioCaja"];
    const etiquetas = new Map<string, Set<string>>();
    for (const config of CATEGORY_CONFIGS) {
      for (const f of config.fields) {
        if (!DEBEN_COINCIDIR.includes(f.key)) continue;
        etiquetas.set(f.key, (etiquetas.get(f.key) ?? new Set()).add(f.label));
      }
    }
    for (const [key, labels] of etiquetas) {
      expect([...labels], `${key} se llama de varias formas`).toHaveLength(1);
    }
  });
});
