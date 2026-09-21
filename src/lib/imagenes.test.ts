import { describe, expect, it } from "vitest";
import { parseImagenes, primeraImagen, imagenesParaPlanilla } from "./imagenes";

/**
 * La columna `imagenes` llegó a tener cinco parsers distintos, y ninguno
 * aceptaba la barra vertical que la plantilla promete. Un Excel cargado según
 * las instrucciones dejaba una foto rota. Estas pruebas fijan las tres formas
 * que la columna puede tener hoy.
 */

describe("parseImagenes", () => {
  it("lee el array JSON, que es como lo guarda el panel", () => {
    expect(parseImagenes('["/a.jpg","/b.jpg"]')).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("acepta la barra vertical, que es la que dice la plantilla", () => {
    expect(parseImagenes("/a.jpg | /b.jpg")).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("acepta también coma y punto y coma", () => {
    expect(parseImagenes("/a.jpg, /b.jpg")).toEqual(["/a.jpg", "/b.jpg"]);
    expect(parseImagenes("/a.jpg; /b.jpg")).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("una URL sola es una lista de una", () => {
    expect(parseImagenes("https://res.cloudinary.com/x/y.jpg")).toEqual([
      "https://res.cloudinary.com/x/y.jpg",
    ]);
  });

  it("no parte la URL por los dos puntos del protocolo", () => {
    // El separador es la barra, no los dos puntos: si no, "https://..." se
    // cortaba en dos y quedaban dos imágenes rotas.
    expect(parseImagenes("https://a.com/1.jpg | https://b.com/2.jpg")).toHaveLength(2);
  });

  it("devuelve lista vacía para lo vacío y lo roto", () => {
    expect(parseImagenes(null)).toEqual([]);
    expect(parseImagenes("")).toEqual([]);
    expect(parseImagenes("[]")).toEqual([]);
    // Un array a medio escribir no se adivina: mejor sin fotos que con basura.
    expect(parseImagenes('["/a.jpg"')).toEqual([]);
  });

  it("descarta los huecos", () => {
    expect(parseImagenes("/a.jpg |  | /b.jpg")).toEqual(["/a.jpg", "/b.jpg"]);
    expect(parseImagenes('["/a.jpg","",null]')).toEqual(["/a.jpg"]);
  });
});

describe("primeraImagen", () => {
  it("la portada es la primera de la lista", () => {
    expect(primeraImagen('["/portada.jpg","/otra.jpg"]')).toBe("/portada.jpg");
    expect(primeraImagen("/portada.jpg | /otra.jpg")).toBe("/portada.jpg");
  });

  it("sin imágenes devuelve null, que es lo que esconde el producto del catálogo", () => {
    expect(primeraImagen(null)).toBeNull();
    expect(primeraImagen("[]")).toBeNull();
  });
});

describe("imagenesParaPlanilla", () => {
  it("exporta con la barra, que es lo que la importación vuelve a leer", () => {
    expect(imagenesParaPlanilla('["/a.jpg","/b.jpg"]')).toBe("/a.jpg | /b.jpg");
  });

  it("ida y vuelta por el Excel sin perder fotos", () => {
    const guardado = '["/a.jpg","/b.jpg","/c.jpg"]';
    expect(parseImagenes(imagenesParaPlanilla(guardado))).toEqual(parseImagenes(guardado));
  });

  it("sin imágenes deja la celda vacía", () => {
    expect(imagenesParaPlanilla(null)).toBe("");
  });
});

describe("el ida y vuelta del panel", () => {
  it("una lista de planilla se lee entera al abrir el producto", () => {
    // El editor cargaba la columna con `JSON.parse` a secas. Con "url1 | url2"
    // —como queda todo lo cargado por Excel— eso tiraba excepción, la lista
    // arrancaba vacía y al guardar se escribía vacía: el producto perdía todas
    // sus fotos y desaparecía del catálogo. Bastaba con abrirlo y guardar.
    const deLaPlanilla = "https://res.cloudinary.com/x/1.jpg | https://res.cloudinary.com/x/2.jpg";
    expect(parseImagenes(deLaPlanilla)).toHaveLength(2);
  });

  it("una URL sola tampoco se pierde", () => {
    expect(parseImagenes("https://res.cloudinary.com/x/1.jpg")).toHaveLength(1);
  });
});
