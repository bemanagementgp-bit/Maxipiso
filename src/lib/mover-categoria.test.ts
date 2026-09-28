import { describe, expect, it } from "vitest";
import { planearMudanza } from "./mover-categoria";

/**
 * Cambiar la categoría de un producto es moverlo de tabla, así que lo que no
 * se copia se pierde para siempre. Todo lo que decide qué viaja tiene que
 * estar acá y no dentro de la ruta.
 */

const columnas = (...ks: string[]) => new Set(ks);

const piso = {
  id: "abc123",
  sku: "PF-001",
  nombre: "Roble Natural",
  precioM2: 9876.54,
  abrasion: "AC4",
  imagenes: '["https://x/foto.jpg"]',
  isActive: true,
  updatedAt: new Date("2026-01-01"),
};

describe("planearMudanza", () => {
  it("conserva el id", () => {
    // Es lo que hace que la mudanza no rompa nada alrededor: la URL pública,
    // los productos que lo tienen como complementario y el historial cuelgan
    // todos del id.
    const { data } = planearMudanza(piso, columnas("id", "sku", "nombre"));
    expect(data.id).toBe("abc123");
  });

  it("copia lo que la categoría destino tiene", () => {
    const { data } = planearMudanza(piso, columnas("id", "sku", "nombre", "imagenes", "isActive"));
    expect(data.nombre).toBe("Roble Natural");
    expect(data.imagenes).toBe('["https://x/foto.jpg"]');
    expect(data.isActive).toBe(true);
  });

  it("avisa lo que se pierde, con el valor", () => {
    // No se descubre después: si un piso pasa a accesorios, la abrasión no
    // existe allá y quien lo mueve tiene que poder decidir con eso a la vista.
    const { sePierden } = planearMudanza(piso, columnas("id", "sku", "nombre"));
    expect(sePierden).toContainEqual({ key: "abrasion", valor: "AC4" });
  });

  it("no avisa de campos vacíos", () => {
    // Perder una columna que no tenía nada no es perder nada.
    const { sePierden } = planearMudanza(
      { ...piso, abrasion: null, bisel: "" },
      columnas("id", "sku", "nombre"),
    );
    expect(sePierden.map((c) => c.key)).not.toContain("abrasion");
    expect(sePierden.map((c) => c.key)).not.toContain("bisel");
  });

  it("lleva el precio a la columna que la categoría destino usa", () => {
    // `precioM2` no existe en accesorios, que cobra `precio` a secas. Perder
    // el precio en una mudanza se descubre cuando alguien cotiza mal.
    const { data, precioMovido, sePierden } = planearMudanza(
      piso,
      columnas("id", "sku", "nombre", "precio"),
      { precioOrigen: "precioM2", precioDestino: "precio" },
    );
    expect(data.precio).toBe(9876.54);
    expect(precioMovido).toEqual({ desde: "precioM2", hasta: "precio" });
    expect(sePierden.map((c) => c.key)).not.toContain("precioM2");
  });

  it("si la destino no tiene dónde poner el precio, lo dice", () => {
    const { sePierden, precioMovido } = planearMudanza(
      piso,
      columnas("id", "sku", "nombre"),
      { precioOrigen: "precioM2", precioDestino: null },
    );
    expect(precioMovido).toBeNull();
    expect(sePierden).toContainEqual({ key: "precioM2", valor: "9876.54" });
  });

  it("no toca el precio cuando las dos categorías usan la misma columna", () => {
    const { data, precioMovido } = planearMudanza(
      piso,
      columnas("id", "sku", "nombre", "precioM2"),
      { precioOrigen: "precioM2", precioDestino: "precioM2" },
    );
    expect(data.precioM2).toBe(9876.54);
    expect(precioMovido).toBeNull();
  });

  it("sale del grupo de variantes", () => {
    // El grupo se arma con el SKU del principal dentro de la misma tabla, así
    // que mudarse deja el vínculo apuntando a un SKU que allá no existe — y
    // eso es exactamente lo que vuelve invisible a un producto.
    const { data, salioDelGrupo } = planearMudanza(
      { ...piso, varianteDe: "PF-000", varianteOpciones: "Color: Roble" },
      columnas("id", "sku", "nombre", "varianteDe", "varianteOpciones"),
    );
    expect(data.varianteDe).toBeNull();
    expect(data.varianteOpciones).toBeNull();
    expect(salioDelGrupo).toBe(true);
  });

  it("no dice que salió de un grupo si no estaba en ninguno", () => {
    const { salioDelGrupo } = planearMudanza(
      { ...piso, varianteDe: null },
      columnas("id", "sku", "varianteDe"),
    );
    expect(salioDelGrupo).toBe(false);
  });

  it("deja que Prisma ponga updatedAt", () => {
    // Tiene que marcar la mudanza, no la última edición en la tabla vieja.
    const { data } = planearMudanza(piso, columnas("id", "sku", "updatedAt"));
    expect(data).not.toHaveProperty("updatedAt");
  });

  it("conserva la fecha de alta", () => {
    // La antigüedad del producto es un dato real; mudarlo no lo hace nuevo.
    const alta = new Date("2025-03-01");
    const { data } = planearMudanza({ ...piso, createdAt: alta }, columnas("id", "sku", "createdAt"));
    expect(data.createdAt).toBe(alta);
  });
});
