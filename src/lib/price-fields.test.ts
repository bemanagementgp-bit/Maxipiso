import { describe, expect, it } from "vitest";
import { getCamposDeDinero, getTodasLasCategorias } from "./price-fields";
import { CATEGORY_CONFIGS } from "./category-fields";

/**
 * Qué columna de dinero tiene cada categoría.
 *
 * Es de donde sale el destino del campo "precio" del formulario. Cuando esto
 * se escribía a mano, darle precio a accesorios —que usa `precio` a secas y no
 * `precioM2`— dejó el mapa apuntando a una columna inexistente: el alta de
 * cualquier accesorio fallaba con un 500 sin explicación.
 */

describe("getCamposDeDinero", () => {
  it("toda categoría tiene al menos una columna de precio", () => {
    for (const c of CATEGORY_CONFIGS) {
      const campos = getCamposDeDinero(c.tabla);
      expect(campos, `${c.label} no está en price-fields`).not.toBeNull();
      expect(campos!.precios.length, `${c.label} no tiene ninguna columna de precio`).toBeGreaterThan(0);
    }
  });

  it("la columna de precio existe de verdad en esa categoría", () => {
    // La prueba que importa: el formulario escribe en la primera, así que si
    // no es una columna real de la tabla, el guardado revienta.
    for (const c of CATEGORY_CONFIGS) {
      const campos = getCamposDeDinero(c.tabla)!;
      const reales = new Set(c.fields.map((f) => f.key));
      for (const p of campos.precios) {
        expect(reales.has(p.key), `${c.label} no tiene la columna ${p.key}`).toBe(true);
      }
      if (campos.stock) expect(reales.has(campos.stock.key)).toBe(true);
      if (campos.moneda) expect(reales.has(campos.moneda.key)).toBe(true);
    }
  });

  it("accesorios cobra por unidad, no por m²", () => {
    const acc = getCamposDeDinero("accesorios")!;
    expect(acc.precios[0].key).toBe("precio");
  });

  it("los pisos cobran por m²", () => {
    for (const tabla of ["pisos_flotantes", "porcellanatos", "pisos_vinilicos", "pisos_madera"]) {
      expect(getCamposDeDinero(tabla)!.precios[0].key, tabla).toBe("precioM2");
    }
  });

  it("una tabla que no existe devuelve null en vez de romper", () => {
    expect(getCamposDeDinero("no_existe")).toBeNull();
  });

  it("devuelve las ocho categorías", () => {
    expect(getTodasLasCategorias()).toHaveLength(CATEGORY_CONFIGS.length);
  });
});
