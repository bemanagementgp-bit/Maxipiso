import { describe, expect, it } from "vitest";
import { SHEET_SCHEMAS, detectSchema } from "./sheet-schemas";
import { encabezadosDe } from "./planilla-export";

/**
 * A qué categoría pertenece cada hoja de un Excel.
 *
 * Se deduce de los encabezados, y es la decisión más cara de todo el import: si
 * se equivoca, mete porcelanatos en la tabla de flotantes. No tira error —los
 * campos que coinciden se guardan— y se descubre cuando el catálogo muestra
 * productos en la categoría que no es.
 */

describe("detectSchema", () => {
  it("reconoce cada categoría por los encabezados de su propia plantilla", () => {
    // La prueba que importa: lo que exporta el sistema tiene que volver a
    // entrar en la misma tabla. Es el ciclo que usa quien carga.
    for (const schema of SHEET_SCHEMAS) {
      const { schema: detectado, recognized } = detectSchema(encabezadosDe(schema));
      expect(recognized, `no reconoció la hoja de ${schema.label}`).toBe(true);
      expect(detectado.id, `${schema.label} se detectó como ${detectado.label}`).toBe(schema.id);
    }
  });

  it("no reconoce una hoja sin ninguna columna firma", () => {
    // Sin esto, una hoja cualquiera caía en el primer schema y sus filas
    // terminaban en la tabla de pisos flotantes.
    const { recognized } = detectSchema(["nombre", "apellido", "telefono"]);
    expect(recognized).toBe(false);
  });

  it("ignora mayúsculas y espacios en los encabezados", () => {
    const flotantes = SHEET_SCHEMAS.find((s) => s.id === "pisos-flotantes")!;
    const gritados = encabezadosDe(flotantes).map((h) => `  ${h.toUpperCase()}  `);
    expect(detectSchema(gritados).schema.id).toBe("pisos-flotantes");
  });
});

describe("encabezadosDe", () => {
  it("no repite columnas", () => {
    // El `fieldMap` mapea varias claves al mismo campo —`imagen` e `imagenes`—
    // para aceptar las dos formas al importar; la plantilla emite una sola.
    for (const schema of SHEET_SCHEMAS) {
      const headers = encabezadosDe(schema);
      expect(new Set(headers).size, `${schema.label} repite encabezados`).toBe(headers.length);
    }
  });

  it("toda categoría lleva SKU, que es la clave del import", () => {
    for (const schema of SHEET_SCHEMAS) {
      const campos = encabezadosDe(schema).map((h) => schema.fieldMap[h]);
      expect(campos, `${schema.label} no tiene SKU`).toContain("sku");
    }
  });

  it("toda categoría puede cargar variantes y al menos un precio", () => {
    for (const schema of SHEET_SCHEMAS) {
      const campos = encabezadosDe(schema).map((h) => schema.fieldMap[h]);
      expect(campos, `${schema.label} no tiene variantes`).toContain("varianteDe");
      expect(campos, `${schema.label} no tiene variantes`).toContain("varianteOpciones");
      // Accesorios fue la única sin ninguna columna de importe: una manta bajo
      // piso no tenía dónde cargar el precio.
      expect(
        campos.some((c) => typeof c === "string" && c.startsWith("precio")),
        `${schema.label} no tiene ninguna columna de precio`,
      ).toBe(true);
    }
  });
});
