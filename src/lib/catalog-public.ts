import type { SpecEntry } from "@/lib/all-products";

/**
 * Forma de un producto tal como lo consume el catalogo publico.
 *
 * Este archivo tenia ademas `enrichCatalogProduct`, `sortCatalogProducts`,
 * `isFeaturedSku` y un `PRODUCT_METADATA` con descripciones hardcodeadas de 8
 * SKUs. Nada de eso se llamaba: las descripciones y specs salen de la base
 * (ver `buildSpecsFromRow`). Solo el tipo estaba en uso.
 */
export type CatalogPublicProduct = {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  descripcion: string;
  precio: number;
  imagen: string | null;
  categoria: string | null;
  subcategoria: string | null;
  origen?: string | null;
  imagenes?: { url: string }[];
  galeria: string[];
  /** Specs derivadas de la fila, en orden de presentacion. */
  specs: SpecEntry[];
  destacado: boolean;
  unidadMedida?: string | null;
  moneda?: string | null;
};
