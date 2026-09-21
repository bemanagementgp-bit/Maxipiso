import { describe, expect, it } from "vitest";
import { detectarTono, tonosValidos } from "./tono-detector";

/**
 * Deduce el tono de un producto a partir de su nombre.
 *
 * Lo corre un botón del panel sobre todo el catálogo de una, así que un falso
 * positivo no se ve: completa cientos de filas con el tono equivocado y no hay
 * nada en pantalla que lo delate.
 */

const de = (nombre: string) => detectarTono({ nombre });

describe("detectarTono", () => {
  it("reconoce los tonos simples", () => {
    expect(de("Roble Blanco")).toBe("Blanco");
    expect(de("Pizarra Negra")).toBe("Negro");
    expect(de("Piso Gris")).toBe("Gris");
    expect(de("Nogal Marrón")).toBe("Marrón");
  });

  it("prefiere el tono compuesto sobre el simple", () => {
    // "Gris Oscuro" contiene "Gris": sin probar los compuestos primero, todo
    // lo oscuro quedaba cargado como gris a secas.
    expect(de("Roble Gris Oscuro")).toBe("Gris Oscuro");
    expect(de("Nogal Marrón Oscuro")).toBe("Marrón Oscuro");
  });

  it("reconoce los sinónimos del rubro", () => {
    expect(de("Piso Wengue")).toBe("Marrón Oscuro");
    expect(de("Roble Antracita")).toBe("Gris Oscuro");
    expect(de("Tabla Grafito")).toBe("Gris Oscuro");
  });

  it("no se come palabras que contienen un tono", () => {
    // "Arena" contiene "Negra"? No, pero "Serena" contiene "arena", y sin
    // límites de palabra el detector encontraba tonos dentro de otras palabras.
    expect(de("Serena")).toBeNull();
    expect(de("Negrete")).toBeNull();
  });

  it("no inventa tono para una especie de madera", () => {
    // El roble puede ser claro u oscuro según la línea: adivinarlo es peor que
    // dejarlo vacío, porque nadie vuelve a revisar lo que ya figura cargado.
    expect(de("Roble")).toBeNull();
    expect(de("Nogal")).toBeNull();
    expect(de("Lapacho")).toBeNull();
  });

  it("devuelve null cuando no hay nada que mirar", () => {
    expect(detectarTono({})).toBeNull();
    expect(de("")).toBeNull();
  });

  it("mira todos los campos, no sólo el nombre", () => {
    expect(detectarTono({ nombre: "Serie V", linea: "Blanco Nórdico" })).toBe("Blanco");
    expect(detectarTono({ nombre: "Serie V", descripcion: "Acabado negro mate" })).toBe("Negro");
  });

  it("ignora mayúsculas y acentos", () => {
    expect(de("PISO MARRON OSCURO")).toBe("Marrón Oscuro");
    expect(de("piso marrón oscuro")).toBe("Marrón Oscuro");
  });

  it("sólo devuelve tonos de la lista del ABM", () => {
    // Si devolviera uno que no está en el desplegable, el producto quedaba con
    // un valor que después no se puede volver a elegir a mano.
    const validos = new Set(tonosValidos());
    for (const nombre of ["Roble Gris Oscuro", "Piso Wengue", "Pizarra Negra", "Arena Beige"]) {
      const t = detectarTono({ nombre });
      if (t) expect(validos.has(t)).toBe(true);
    }
  });
});
