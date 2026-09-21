import { describe, expect, it } from "vitest";
import { aTexto, parsearNumero } from "./numeros";

/**
 * Lo que se tipea en un campo de precio del panel.
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

describe("aTexto", () => {
  it("muestra el importe con coma decimal y sin miles", () => {
    // Sin miles a propósito: el input es para editar, no para leer. Con puntos
    // de miles cada tecla los recalcula y el cursor salta de lugar.
    expect(aTexto(1180.5)).toBe("1180,5");
    expect(aTexto(14372.45)).toBe("14372,45");
    expect(aTexto(1180)).toBe("1180");
  });

  it("redondea a dos decimales", () => {
    expect(aTexto(10.006)).toBe("10,01");
  });

  it("sin precio deja el campo vacío, no un cero", () => {
    // Un cero dicho por el formateador es un precio de cero, y esto se usa
    // para categorías donde "todavía no lo cargué" es lo normal.
    expect(aTexto(null)).toBe("");
    expect(aTexto(undefined)).toBe("");
    expect(aTexto("")).toBe("");
    expect(aTexto("hola")).toBe("");
  });

  it("ida y vuelta con parsearNumero", () => {
    // Es lo que sostiene al borrador: al salir de la celda se guarda el
    // número, y al volver a entrar el input tiene que mostrar lo mismo.
    for (const n of [0, 12, 1180.5, 14372.45]) {
      expect(parsearNumero(aTexto(n))).toBe(n);
    }
  });
});
