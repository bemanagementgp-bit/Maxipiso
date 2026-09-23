import { describe, expect, it } from "vitest";
import { unidadDeFila, unidadDePrecio, UNIDADES } from "./unidad-precio";

/**
 * Un precio sin unidad en un mayorista no es un detalle de formato: un cliente
 * preguntó si los $11.200 de una manta eran por metro, por rollo o por unidad,
 * y la ficha no lo decía.
 */

describe("unidadDePrecio", () => {
  it("lo cargado a mano manda", () => {
    // Si alguien dice que su piso se vende por rollo aunque el precio esté en
    // precioM2, sabe algo que la columna no cuenta.
    expect(unidadDePrecio("rollo", "precioM2")).toBe("rollo");
  });

  it("sin nada cargado, la deduce de la columna", () => {
    // Es lo que el catálogo mostraba antes, y no puede cambiar: hay cientos de
    // productos cargados sin `unidadMedida`.
    expect(unidadDePrecio(null, "precioM2")).toBe("m²");
    expect(unidadDePrecio("", "precioMl")).toBe("ml");
    expect(unidadDePrecio(undefined, "precioMLineal")).toBe("ml");
    expect(unidadDePrecio(null, "precioCaja")).toBe("caja");
  });

  it("de un precio a secas no se deduce nada", () => {
    // Es el caso de la manta: `precio` no implica ninguna unidad, y por eso
    // hubo que agregar el campo en vez de adivinar.
    expect(unidadDePrecio(null, "precio")).toBeNull();
    expect(unidadDePrecio(null, null)).toBeNull();
  });

  it("ignora los espacios de una celda de planilla", () => {
    expect(unidadDePrecio("  rollo  ", null)).toBe("rollo");
    expect(unidadDePrecio("   ", "precioM2")).toBe("m²");
  });
});

describe("unidadDeFila", () => {
  it("usa la unidad cargada aunque la fila tenga precio por metro", () => {
    expect(unidadDeFila({ unidadMedida: "rollo", precioM2: 100 })).toBe("rollo");
  });

  it("descubre la columna por cuál tiene valor", () => {
    expect(unidadDeFila({ precioM2: 9876.54 })).toBe("m²");
    expect(unidadDeFila({ precioMLineal: 500 })).toBe("ml");
  });

  it("un piso con precio por metro y por caja se cotiza por metro", () => {
    // El orden importa: es como se vende.
    expect(unidadDeFila({ precioM2: 100, precioCaja: 250 })).toBe("m²");
  });

  it("un accesorio sin unidad cargada no inventa ninguna", () => {
    // Antes de que existiera el campo, esto era la manta: número pelado.
    expect(unidadDeFila({ precio: 11200 })).toBeNull();
    expect(unidadDeFila({})).toBeNull();
  });

  it("un precio en cero no cuenta como la columna que se usa", () => {
    // "Sin cargar" no puede decidir cómo se lee el precio de al lado.
    expect(unidadDeFila({ precioM2: 0, precio: 11200 })).toBeNull();
  });
});

describe("UNIDADES", () => {
  it("ofrece las que se usan de verdad, sin repetir", () => {
    expect(UNIDADES).toContain("rollo");
    expect(UNIDADES).toContain("unidad");
    expect(UNIDADES).toContain("m²");
    expect(new Set(UNIDADES).size).toBe(UNIDADES.length);
  });
});
