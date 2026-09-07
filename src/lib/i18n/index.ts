import { es, type Diccionario } from "./diccionarios/es";
import { en } from "./diccionarios/en";
import { de } from "./diccionarios/de";
import { fr } from "./diccionarios/fr";
import { it } from "./diccionarios/it";
import { pt } from "./diccionarios/pt";
import { IDIOMA_POR_DEFECTO, type Idioma } from "./idiomas";

export const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en, de, fr, it, pt };

export function diccionarioDe(idioma: Idioma): Diccionario {
  return DICCIONARIOS[idioma] ?? DICCIONARIOS[IDIOMA_POR_DEFECTO];
}

/**
 * Reemplaza `{clave}` por su valor.
 *
 * Solo para los pocos textos con un dato adentro ("No se encontraron productos
 * en {categoria}"). No es un motor de plantillas: si un texto necesita mas que
 * esto, conviene partirlo en dos claves.
 */
export function interpolar(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (crudo, clave) =>
    clave in valores ? String(valores[clave]) : crudo,
  );
}

export type { Diccionario };
export * from "./idiomas";
