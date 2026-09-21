import { describe, expect, it } from "vitest";
import { parseOpciones, serializarOpciones, ejesDeVariantes, type VarianteFila } from "./variantes";

/**
 * La columna `varianteOpciones` es una sola celda de texto que viaja igual
 * desde el Excel y desde el panel. Si el parser se corre, las variantes dejan
 * de agruparse y la ficha muestra botones de más o de menos, sin error visible.
 */

describe("parseOpciones", () => {
  it("lee el formato de la planilla", () => {
    expect(parseOpciones("Color: Roble ; Medidas: 120x20")).toEqual([
      { tipo: "Color", valor: "Roble" },
      { tipo: "Medidas", valor: "120x20" },
    ]);
  });

  it("tolera espacios de más y celdas vacías", () => {
    expect(parseOpciones("  Color :   Roble  ")).toEqual([{ tipo: "Color", valor: "Roble" }]);
    expect(parseOpciones("")).toEqual([]);
    expect(parseOpciones(null)).toEqual([]);
    expect(parseOpciones(undefined)).toEqual([]);
  });

  it("descarta lo que no tiene dos puntos en vez de romper la fila", () => {
    expect(parseOpciones("Roble ; Medidas: 120x20")).toEqual([{ tipo: "Medidas", valor: "120x20" }]);
  });

  it("descarta el par a medio llenar", () => {
    expect(parseOpciones("Color: ; Medidas: 90x15")).toEqual([{ tipo: "Medidas", valor: "90x15" }]);
    expect(parseOpciones(": Roble")).toEqual([]);
  });

  it("se queda con el primero cuando el tipo viene repetido", () => {
    // Dos "Color" en la misma variante no significan nada, y sin esto la ficha
    // dibujaba dos filas de botones para el mismo eje.
    expect(parseOpciones("Color: Roble ; color: Nogal")).toEqual([{ tipo: "Color", valor: "Roble" }]);
  });

  it("corta en seis opciones", () => {
    const larga = Array.from({ length: 10 }, (_, i) => `T${i}: v${i}`).join(" ; ");
    expect(parseOpciones(larga)).toHaveLength(6);
  });
});

describe("serializarOpciones", () => {
  it("vuelve al formato de la planilla", () => {
    expect(serializarOpciones([
      { tipo: "Color", valor: "Roble" },
      { tipo: "Medidas", valor: "120x20" },
    ])).toBe("Color: Roble ; Medidas: 120x20");
  });

  it("ida y vuelta sin perder nada", () => {
    const original = "Color: Roble ; Medidas: 120x20 ; Acabado: Mate";
    expect(serializarOpciones(parseOpciones(original))).toBe(original);
  });

  it("no guarda nada cuando no hay pares completos", () => {
    expect(serializarOpciones([])).toBe("");
    expect(serializarOpciones([{ tipo: "Color", valor: "" }])).toBe("");
  });
});

// ── Ejes del selector de la ficha ──────────────────────────────────────────

function fila(id: string, opciones: string, actual = false): VarianteFila {
  return { id, sku: id, opciones: parseOpciones(opciones), imagen: null, actual };
}

describe("ejesDeVariantes", () => {
  const grupo = [
    fila("a", "Color: Roble ; Medidas: 120x20", true),
    fila("b", "Color: Roble ; Medidas: 90x15"),
    fila("c", "Color: Nogal ; Medidas: 120x20"),
    fila("d", "Color: Nogal ; Medidas: 90x15"),
  ];

  it("arma un eje por tipo", () => {
    const ejes = ejesDeVariantes(grupo);
    expect(ejes.map((e) => e.tipo)).toEqual(["Color", "Medidas"]);
    expect(ejes[0].valores.map((v) => v.valor)).toEqual(["Roble", "Nogal"]);
  });

  it("cambiar de color mantiene la medida elegida", () => {
    // Es la razón de ser de los pares tipo/valor: elegir Nogal desde
    // "Roble 120x20" tiene que llevar a "Nogal 120x20", no a una fila al azar.
    const [color] = ejesDeVariantes(grupo);
    expect(color.valores.find((v) => v.valor === "Nogal")?.id).toBe("c");
  });

  it("marca como elegido el valor de la fila actual", () => {
    const [color, medidas] = ejesDeVariantes(grupo);
    expect(color.valores.find((v) => v.elegido)?.valor).toBe("Roble");
    expect(medidas.valores.find((v) => v.elegido)?.valor).toBe("120x20");
  });

  it("cae en el primero con ese valor cuando la combinación no existe", () => {
    // No todas las combinaciones se fabrican. Un botón muerto es peor que uno
    // que lleva a la variante más parecida.
    const incompleto = [
      fila("a", "Color: Roble ; Medidas: 120x20", true),
      fila("b", "Color: Nogal ; Medidas: 90x15"),
    ];
    const [color] = ejesDeVariantes(incompleto);
    expect(color.valores.find((v) => v.valor === "Nogal")?.id).toBe("b");
  });

  it("no dibuja un eje con un solo valor", () => {
    // Si todas son "Espesor: 8mm" eso no es una opción, es un dato del producto.
    const mismoEspesor = [
      fila("a", "Color: Roble ; Espesor: 8mm", true),
      fila("b", "Color: Nogal ; Espesor: 8mm"),
    ];
    expect(ejesDeVariantes(mismoEspesor).map((e) => e.tipo)).toEqual(["Color"]);
  });
});
