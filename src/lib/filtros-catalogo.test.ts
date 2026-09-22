import { describe, expect, it } from "vitest";
import { claveDeValor, MIN_VALORES, opcionesDeFiltro } from "./filtros-catalogo";

/**
 * Los filtros del catálogo se arman con lo que hay cargado, así que cualquier
 * descuido acá se ve en la tienda: el filtro de Uso llegó a ofrecer "interior"
 * e "Interior" como dos opciones, y cada una devolvía la mitad de los
 * productos.
 */

const valores = (opciones: ReturnType<typeof opcionesDeFiltro>) => opciones.map((o) => o.valor);

describe("opcionesDeFiltro", () => {
  it("no ofrece dos veces la misma palabra escrita distinto", () => {
    const o = opcionesDeFiltro(["Exterior", "interior", "Interior"]);
    expect(valores(o)).toEqual(["Exterior", "Interior"]);
  });

  it("muestra la escritura más cargada, que es como está escrito el catálogo", () => {
    const o = opcionesDeFiltro(["interior", "interior", "interior", "Interior"]);
    expect(valores(o)).toEqual(["interior"]);
  });

  it("empatadas, gana la que arranca en mayúscula", () => {
    // Es la que se lee como título en un filtro.
    const o = opcionesDeFiltro(["interior", "Interior"]);
    expect(valores(o)).toEqual(["Interior"]);
  });

  it("los acentos tampoco parten el grupo", () => {
    const o = opcionesDeFiltro(["Vinílico", "Vinilico", "vinílico"]);
    expect(o).toHaveLength(1);
  });

  it("elegir una trae todas las escrituras", () => {
    // Mostrar "Interior" y filtrar sólo por "Interior" perdería los productos
    // cargados como "interior": peor que el problema original.
    const [opcion] = opcionesDeFiltro(["interior", "Interior", "INTERIOR"]);
    expect(opcion.equivalentes.sort()).toEqual(["INTERIOR", "Interior", "interior"]);
  });

  it("parte los campos de varios valores", () => {
    const o = opcionesDeFiltro(
      ["Pisos Flotantes | Pisos Vinílicos", "Pisos Flotantes | Decks"],
      { multiple: true },
    );
    expect(valores(o)).toEqual(["Decks", "Pisos Flotantes", "Pisos Vinílicos"]);
  });

  it("aplica los alias de marca antes de agrupar", () => {
    const o = opcionesDeFiltro(["Max Core", "MaxCore"], { alias: { "Max Core": "MaxCore" } });
    expect(valores(o)).toEqual(["MaxCore"]);
  });

  it("ordena los números por valor y no como texto", () => {
    expect(valores(opcionesDeFiltro(["10", "9", "2"]))).toEqual(["2", "9", "10"]);
  });

  it("ignora vacíos y lo que no es texto", () => {
    expect(opcionesDeFiltro(["", "   ", null, 7, undefined, "Gris"])).toHaveLength(1);
  });

  it("da siempre la misma lista para la misma base", () => {
    // Sin orden estable, la lista del filtro cambiaba de posición entre
    // consultas y parecía que se movía sola.
    const a = opcionesDeFiltro(["Interior", "Exterior", "interior"]);
    const b = opcionesDeFiltro(["interior", "Exterior", "Interior"]);
    expect(valores(a)).toEqual(valores(b));
  });
});

describe("claveDeValor", () => {
  it("junta lo que para quien busca es la misma palabra", () => {
    expect(claveDeValor("Interior")).toBe(claveDeValor("  interior "));
    expect(claveDeValor("Vinílico")).toBe(claveDeValor("vinilico"));
    expect(claveDeValor("Piso  Vinilico")).toBe(claveDeValor("piso vinilico"));
  });

  it("no junta lo que de verdad es distinto", () => {
    expect(claveDeValor("Interior")).not.toBe(claveDeValor("Exterior"));
  });
});

describe("MIN_VALORES", () => {
  it("un filtro de un solo valor no separa nada", () => {
    // "Tipo de accesorio: Accesorios" ocupa lugar, invita a un click y
    // devuelve exactamente lo mismo que ya estaba en pantalla.
    expect(MIN_VALORES).toBe(2);
  });
});
