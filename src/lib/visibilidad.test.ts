import { describe, expect, it } from "vitest";
import { motivoDeInvisibilidad, SE_ARREGLA_SOLO, type FilaVisibilidad } from "./visibilidad";

/**
 * Las reglas de aca tienen que dar el mismo resultado que el `where` del
 * catalogo (`api/catalogo/todos`). Si se corren, el panel dice que un producto
 * se ve cuando no se ve, que es peor que no tener el detector.
 */

const fila = (p: Partial<FilaVisibilidad> = {}): FilaVisibilidad => ({
  id: "1",
  sku: "ACC-100",
  nombre: "Terminación T Aluminio",
  isActive: true,
  imagenes: '["https://res.cloudinary.com/x/foto.jpg"]',
  ...p,
});

describe("motivoDeInvisibilidad", () => {
  it("una variante sana de un principal sano no es un problema", () => {
    // No sale como card, y está bien: se ve entrando al principal.
    expect(motivoDeInvisibilidad(fila(), "ACC-001", fila({ sku: "ACC-001" }))).toBeNull();
  });

  it("detecta la que se declara variante de sí misma", () => {
    expect(motivoDeInvisibilidad(fila({ sku: "3722" }), "3722", fila({ sku: "3722" })))
      .toBe("se-apunta-a-si-mismo");
    // Sin importar mayúsculas ni espacios: así viene de la planilla.
    expect(motivoDeInvisibilidad(fila({ sku: "acc-100" }), " ACC-100 ", null))
      .toBe("se-apunta-a-si-mismo");
  });

  it("detecta la que apunta a un SKU que no existe", () => {
    expect(motivoDeInvisibilidad(fila(), "NO-EXISTE", null)).toBe("principal-inexistente");
  });

  it("detecta el grupo entero escondido detrás de un principal apagado", () => {
    // El caso que nadie ve: accesorio activo, con foto, y aun así no aparece.
    // No sale como card porque es variante, y el principal tampoco sale porque
    // está inactivo. El grupo completo desaparece del catálogo.
    expect(motivoDeInvisibilidad(fila(), "ACC-001", fila({ sku: "ACC-001", isActive: false })))
      .toBe("principal-apagado");
  });

  it("detecta el grupo escondido detrás de un principal sin foto", () => {
    // El catálogo exige imagen, así que un principal sin foto esconde a todas
    // sus variantes igual que uno apagado.
    for (const vacia of [null, "", "[]", "[null]"]) {
      expect(motivoDeInvisibilidad(fila(), "ACC-001", fila({ sku: "ACC-001", imagenes: vacia })))
        .toBe("principal-sin-foto");
    }
  });

  it("no culpa al grupo cuando la que está apagada o sin foto es la variante", () => {
    // Esa se esconde sola, y para eso ya están los filtros del panel. Avisarlo
    // acá sería mandar a prender un principal que no tiene la culpa.
    const principal = fila({ sku: "ACC-001", isActive: false });
    expect(motivoDeInvisibilidad(fila({ isActive: false }), "ACC-001", principal)).toBeNull();
    expect(motivoDeInvisibilidad(fila({ imagenes: "[]" }), "ACC-001", principal)).toBeNull();
  });

  it("el grupo roto se reporta aunque la fila esté apagada", () => {
    // Acá sí: vaciar la columna es correcto igual, y deja el producto listo
    // para cuando se lo prenda.
    expect(motivoDeInvisibilidad(fila({ sku: "X", isActive: false }), "X", null))
      .toBe("se-apunta-a-si-mismo");
    expect(motivoDeInvisibilidad(fila({ isActive: false, imagenes: null }), "NO-EXISTE", null))
      .toBe("principal-inexistente");
  });

  it("sin `variante de` no hay nada que revisar", () => {
    expect(motivoDeInvisibilidad(fila(), "", null)).toBeNull();
    expect(motivoDeInvisibilidad(fila(), "   ", null)).toBeNull();
  });
});

describe("SE_ARREGLA_SOLO", () => {
  it("sólo repara los grupos que apuntan a la nada", () => {
    // Desvincular una variante cuyo principal está apagado rompería un grupo
    // bien armado para tapar el síntoma. Eso se arregla prendiendo el principal.
    expect([...SE_ARREGLA_SOLO].sort()).toEqual(["principal-inexistente", "se-apunta-a-si-mismo"]);
  });
});
