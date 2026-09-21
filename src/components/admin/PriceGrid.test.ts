import { describe, expect, it } from "vitest";
import { parsearNumero } from "./PriceGrid";

/**
 * Lo que se tipea en una celda de la grilla de precios.
 *
 * Se aceptan las dos convenciones porque en la práctica se pega texto de
 * planillas: "14372,45" y "14372.45" son lo mismo. Un error acá no se ve —el
 * número entra igual— y sale a la luz cuando alguien cotiza mil veces más
 * barato de lo que corresponde.
 */

describe("parsearNumero", () => {
  it("lee la coma decimal, que es como se escribe acá", () => {
    expect(parsearNumero("14372,45")).toBe(14372.45);
    expect(parsearNumero("0,5")).toBe(0.5);
  });

  it("lee también el punto decimal, que es como lo pega una planilla en inglés", () => {
    expect(parsearNumero("14372.45")).toBe(14372.45);
  });

  it("con los dos separadores, el punto es de miles", () => {
    expect(parsearNumero("1.234,56")).toBe(1234.56);
    expect(parsearNumero("1.234.567,89")).toBe(1234567.89);
  });

  it("ignora los espacios", () => {
    expect(parsearNumero("  1 234,56 ")).toBe(1234.56);
  });

  it("una celda vacía es null y no cero", () => {
    // Cero es un precio; vacío es "no cargado". Confundirlos ponía en cero
    // todo lo que no se había completado.
    expect(parsearNumero("")).toBeNull();
    expect(parsearNumero("   ")).toBeNull();
  });

  it("acepta el entero pelado", () => {
    expect(parsearNumero("18900")).toBe(18900);
  });

  it("rechaza lo que no es un número", () => {
    expect(parsearNumero("abc")).toBe("invalido");
    expect(parsearNumero("12abc")).toBe("invalido");
  });

  it("rechaza los negativos", () => {
    // Un precio o un stock negativo siempre es un error de tipeo.
    expect(parsearNumero("-100")).toBe("invalido");
  });

  it("deja escribir el separador sin romper", () => {
    // Mientras se tipea "2,5" pasa por "2,": si eso diera inválido, la celda
    // se marcaba en rojo en medio de la carga.
    expect(parsearNumero("2,")).toBe(2);
    expect(parsearNumero("2.")).toBe(2);
  });
});
