import { describe, expect, it } from "vitest";
import { CAMPOS_MULTIPLES, opcionesDe, partirMultiple, unirMultiple } from "./opciones-fijas";

/**
 * Los filtros del catálogo se arman con los valores distintos que hay
 * cargados, así que estas dos funciones deciden si un accesorio compatible con
 * dos categorías aparece bajo las dos o bajo ninguna.
 */

describe("partirMultiple", () => {
  it("parte por la barra y limpia los espacios", () => {
    expect(partirMultiple("Pisos Flotantes | Pisos Vinílicos")).toEqual([
      "Pisos Flotantes",
      "Pisos Vinílicos",
    ]);
    expect(partirMultiple("Pisos Flotantes|Decks")).toEqual(["Pisos Flotantes", "Decks"]);
  });

  it("un solo valor sigue siendo un valor", () => {
    // Lo que ya está cargado no tiene barras y tiene que seguir andando.
    expect(partirMultiple("Pisos flotantes y vinilicos")).toEqual(["Pisos flotantes y vinilicos"]);
  });

  it("descarta vacíos y repetidos", () => {
    expect(partirMultiple("Decks |  | Decks | decks")).toEqual(["Decks"]);
    expect(partirMultiple("")).toEqual([]);
    expect(partirMultiple(null)).toEqual([]);
  });
});

describe("unirMultiple", () => {
  it("ida y vuelta sin perder nada", () => {
    const valores = ["Pisos Flotantes", "Pisos Vinílicos", "Decks"];
    expect(partirMultiple(unirMultiple(valores))).toEqual(valores);
  });

  it("separa con espacios, que es como se lee en una planilla", () => {
    expect(unirMultiple(["Decks", "Maderas"])).toBe("Decks | Maderas");
  });

  it("sin nada seleccionado guarda la celda vacía", () => {
    expect(unirMultiple([])).toBe("");
  });
});

describe("opcionesDe", () => {
  it("ofrece las categorías del catálogo para compatible con", () => {
    // Con las mismas palabras que los botones del catálogo: "Pisos flotantes"
    // acá y "Pisos Flotantes" allá serían dos opciones para la misma cosa.
    expect(opcionesDe("compatibleCon")).toContain("Pisos Flotantes");
    expect(opcionesDe("compatibleCon")).toContain("Pisos Vinílicos");
  });

  it("no pierde lo que ya estaba cargado y no figura en la lista", () => {
    // Un producto viejo dice "Pisos flotantes y vinilicos": editarlo no puede
    // hacer desaparecer ese valor sin avisar.
    expect(opcionesDe("compatibleCon", ["Pisos flotantes y vinilicos"]))
      .toContain("Pisos flotantes y vinilicos");
  });

  it("un campo sin lista fija sigue sugiriendo lo cargado", () => {
    expect(opcionesDe("composicion", ["PVC", "Aluminio"])).toEqual(["PVC", "Aluminio"]);
  });
});

describe("CAMPOS_MULTIPLES", () => {
  it("compatible con acepta varias categorías", () => {
    expect(CAMPOS_MULTIPLES.has("compatibleCon")).toBe(true);
  });
});
