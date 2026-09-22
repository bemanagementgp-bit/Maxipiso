import { describe, expect, it } from "vitest";
import { parseOpciones, serializarOpciones, ejesDeVariantes, pluralDeTipo, resumenDelGrupo, soloHermanas, variantesInalcanzables, type VarianteFila } from "./variantes";

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
  return { id, sku: id, nombre: id, opciones: parseOpciones(opciones), imagen: null, actual };
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

describe("soloHermanas", () => {
  const principal = { id: "p1", sku: "3722" };

  it("saca a la principal cuando se apunta a sí misma", () => {
    // Una importación con la columna "variante de" mal completada deja
    // `varianteDe` igual al SKU propio. La consulta por `varianteDe` devuelve
    // entonces también a la principal, el editor la mostraba dos veces y al
    // guardar decía "SKU repetido", bloqueando la edición del producto entero.
    expect(soloHermanas(principal, [{ id: "p1", sku: "3722" }])).toEqual([]);
  });

  it("la reconoce por SKU aunque venga con otro id", () => {
    expect(soloHermanas(principal, [{ id: "otro", sku: "3722" }])).toEqual([]);
    expect(soloHermanas(principal, [{ id: "otro", sku: " 3722 " }])).toEqual([]);
  });

  it("deja pasar las hermanas de verdad", () => {
    const hermanas = [{ id: "v1", sku: "3722-ORO" }, { id: "v2", sku: "3722-PLATA" }];
    expect(soloHermanas(principal, hermanas)).toEqual(hermanas);
  });

  it("no rompe sin principal", () => {
    expect(soloHermanas(null, [{ id: "v1", sku: "A" }])).toEqual([{ id: "v1", sku: "A" }]);
  });
});

describe("variantesInalcanzables", () => {
  it("un grupo sano llega a todas", () => {
    const grupo = [
      fila("a", "Color: Roble", true),
      fila("b", "Color: Nogal"),
      fila("c", "Color: Wengue"),
    ];
    expect(variantesInalcanzables(grupo)).toEqual([]);
  });

  it("una grilla de dos ejes se recorre a saltos, y eso cuenta", () => {
    // 3 colores x 2 medidas. Desde "Roble 120x20" no hay botón que lleve a
    // "Nogal 90x15" —los ejes mantienen lo demás igual, que es lo que se
    // quiere— pero se llega en dos clicks, pasando por Nogal 120x20. Mirar un
    // solo salto marcaría como rota la mitad de una grilla perfectamente sana.
    const grilla = [
      fila("roble-120", "Color: Roble ; Medidas: 120x20", true),
      fila("roble-90", "Color: Roble ; Medidas: 90x15"),
      fila("nogal-120", "Color: Nogal ; Medidas: 120x20"),
      fila("nogal-90", "Color: Nogal ; Medidas: 90x15"),
      fila("ceniza-120", "Color: Ceniza ; Medidas: 120x20"),
      fila("ceniza-90", "Color: Ceniza ; Medidas: 90x15"),
    ];
    expect(variantesInalcanzables(grilla)).toEqual([]);
  });

  it("encuentra a las que quedaron sin opciones", () => {
    // "Variante de" completado y la columna de al lado vacía: la fila no entra
    // en ningún eje, así que no hay botón que lleve a ella.
    const grupo = [fila("a", "Color: Roble", true), fila("b", "Color: Nogal"), fila("c", "")];
    expect(variantesInalcanzables(grupo).map((f) => f.id)).toEqual(["c"]);
  });

  it("encuentra el grupo entero escondido detrás de un eje de un solo valor", () => {
    // Siete niveladores cargados todos como "Color: Plata". El eje tiene un
    // solo valor, no se dibuja, y las seis hermanas quedan sin forma de
    // abrirse: cargadas, activas, con foto, y a las que no se llega.
    const grupo = [
      fila("plata", "Color: Plata", true),
      fila("oro", "Color: Plata"),
      fila("bronce", "Color: Plata"),
    ];
    expect(ejesDeVariantes(grupo)).toEqual([]);
    expect(variantesInalcanzables(grupo).map((f) => f.id)).toEqual(["oro", "bronce"]);
  });

  it("encuentra la segunda de dos filas con la misma combinación", () => {
    // Cada valor lleva a una sola fila: la repetida se queda sin botón propio.
    const grupo = [
      fila("a", "Color: Roble", true),
      fila("b", "Color: Nogal"),
      fila("c", "Color: Nogal"),
    ];
    expect(variantesInalcanzables(grupo).map((f) => f.id)).toEqual(["c"]);
  });

  it("la fila que se está viendo nunca cuenta como inalcanzable", () => {
    // Aunque haya quedado sin opciones y ningún botón lleve a ella: es la
    // página donde estamos parados, se llega estando ahí.
    const grupo = [fila("a", "", true), fila("b", "Color: Roble"), fila("c", "Color: Nogal")];
    expect(variantesInalcanzables(grupo)).toEqual([]);
  });

  it("un producto suelto no es un grupo", () => {
    expect(variantesInalcanzables([fila("a", "Color: Roble", true)])).toEqual([]);
    expect(variantesInalcanzables([])).toEqual([]);
  });
});

describe("resumenDelGrupo", () => {
  it("resume el primer eje, que es el que entra en una card", () => {
    // De los dos ejes de un piso, el que decide una compra de un vistazo es
    // el color; las medidas se ven entrando.
    const grupo = [
      fila("a", "Color: Roble ; Medidas: 120x20"),
      fila("b", "Color: Nogal ; Medidas: 120x20"),
      fila("c", "Color: Ceniza ; Medidas: 90x15"),
    ];
    const r = resumenDelGrupo(grupo)!;
    expect(r.tipo).toBe("Color");
    expect(r.total).toBe(3);
    expect(r.muestras.map((m) => m.valor)).toEqual(["Roble", "Nogal", "Ceniza"]);
  });

  it("corta las muestras pero no el total", () => {
    // La card dibuja unas pocas y pone "+N": el N sale del total, no de lo
    // que se dibujó, o diría "+0" con ocho colores cargados.
    const grupo = Array.from({ length: 8 }, (_, i) => fila(`v${i}`, `Color: C${i}`));
    const r = resumenDelGrupo(grupo)!;
    expect(r.muestras).toHaveLength(5);
    expect(r.total).toBe(8);
  });

  it("un producto suelto no tiene nada que contar", () => {
    expect(resumenDelGrupo([fila("a", "Color: Roble")])).toBeNull();
    expect(resumenDelGrupo([])).toBeNull();
  });

  it("sin opción que distinga, cuenta versiones en vez de callarse", () => {
    // Los niveladores cargados todos como "Color: Plata": no hay eje que
    // nombrar, pero el grupo existe y la ficha los lista bajo "Otras
    // versiones". Callarse sería peor, porque es justo el caso en que el
    // catálogo parecía tener un producto donde había cuatro.
    const mudo = [
      fila("a", "Color: Plata", true),
      fila("b", "Color: Plata"),
      fila("c", "Color: Plata"),
    ];
    expect(resumenDelGrupo(mudo)).toEqual({ tipo: "", total: 3, muestras: [] });
  });
});

describe("pluralDeTipo", () => {
  it("pluraliza los tipos que se usan de verdad", () => {
    expect(pluralDeTipo("Color", 6)).toBe("6 colores");
    expect(pluralDeTipo("Espesor", 3)).toBe("3 espesores");
    expect(pluralDeTipo("Acabado", 2)).toBe("2 acabados");
    // La tilde cae en el plural. Una falta de ortografía en la card la ve
    // todo el que entra al catálogo.
    expect(pluralDeTipo("Terminación", 4)).toBe("4 terminaciones");
  });

  it("no le agrega una s a lo que ya la tiene", () => {
    expect(pluralDeTipo("Medidas", 2)).toBe("2 medidas");
  });

  it("en singular no pluraliza", () => {
    expect(pluralDeTipo("Color", 1)).toBe("1 color");
  });
});
