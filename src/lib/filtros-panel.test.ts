import { describe, expect, it } from "vitest";
import { escribirFiltros, FILTROS_VACIOS, hayFiltros, leerFiltros } from "./filtros-panel";

/**
 * El ABM guarda sus filtros en la URL para no perderlos al ir y volver del
 * editor. Si la ida y la vuelta no coinciden, guardar un producto devuelve a
 * una pantalla distinta de la que se estaba mirando, que es justamente lo que
 * esto vino a arreglar.
 */

const leer = (qs: string) => leerFiltros(new URLSearchParams(qs));

describe("leerFiltros", () => {
  it("sin parámetros devuelve la vista por defecto", () => {
    expect(leer("")).toEqual(FILTROS_VACIOS);
  });

  it("lee los filtros fijos", () => {
    expect(leer("buscar=3727&cat=accesorios&marca=Kekol&estado=todos&img=sin")).toEqual({
      buscar: "3727", tabla: "accesorios", marca: "Kekol", estado: "todos", imagen: "sin", extra: {},
    });
  });

  it("lee los filtros por característica, que dependen de la categoría", () => {
    expect(leer("cat=accesorios&f_subtipo=Terminaciones+de+Aluminio&f_tono=Plata").extra).toEqual({
      subtipo: "Terminaciones de Aluminio",
      tono: "Plata",
    });
  });

  it("ignora los vacíos y lo que no tiene el prefijo", () => {
    expect(leer("f_subtipo=&otro=x&f_tono=Plata").extra).toEqual({ tono: "Plata" });
  });
});

describe("escribirFiltros", () => {
  it("la vista limpia no ensucia la URL", () => {
    expect(escribirFiltros(FILTROS_VACIOS)).toBe("");
    expect(hayFiltros(FILTROS_VACIOS)).toBe(false);
  });

  it("ida y vuelta sin perder nada", () => {
    // Es la condición que hace que volver del editor devuelva a la misma
    // pantalla: lo que se escribe al salir tiene que leerse igual al entrar.
    const filtros = {
      buscar: "terminacion", tabla: "accesorios", marca: "Kekol",
      estado: "todos", imagen: "con",
      extra: { subtipo: "Terminaciones de Aluminio", tipoProducto: "Perfil" },
    };
    expect(leer(escribirFiltros(filtros))).toEqual(filtros);
  });

  it("el mismo estado da siempre la misma URL", () => {
    // Las claves se ordenan: si no, tildar dos filtros en distinto orden deja
    // dos entradas de historial para la misma pantalla.
    const a = escribirFiltros({ ...FILTROS_VACIOS, extra: { tono: "Plata", subtipo: "T" } });
    const b = escribirFiltros({ ...FILTROS_VACIOS, extra: { subtipo: "T", tono: "Plata" } });
    expect(a).toBe(b);
  });

  it("no escribe el estado por defecto pero sí los otros", () => {
    expect(escribirFiltros({ ...FILTROS_VACIOS, estado: "activo" })).toBe("");
    expect(escribirFiltros({ ...FILTROS_VACIOS, estado: "inactivo" })).toBe("estado=inactivo");
  });

  it("escapa lo que el usuario tipea", () => {
    const filtros = { ...FILTROS_VACIOS, buscar: "piso & deck 100%", marca: "a=b" };
    expect(leer(escribirFiltros(filtros))).toEqual(filtros);
  });
});
