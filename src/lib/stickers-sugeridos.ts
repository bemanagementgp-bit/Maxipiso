import type { PosicionSticker, TipoSticker } from "@/lib/stickers";

/**
 * Los diez stickers con los que arranca el catalogo.
 *
 * Estan en codigo y no solo en una migracion para que se puedan cargar desde el
 * panel con un boton: aplicar SQL a mano en la base de produccion es un tramite
 * que no tiene por que hacer quien administra el catalogo.
 *
 * Los ids son fijos y legibles. Eso hace que cargarlos dos veces no duplique
 * nada, y que cambiarle el tipo o la imagen a uno mas adelante no toque a los
 * productos que ya lo tienen asignado.
 *
 * Las esquinas no son arbitrarias:
 *  - Las banderas arriba a la izquierda: son la procedencia, se leen primero.
 *  - Lo comercial arriba a la derecha, que es donde el ojo busca el precio.
 *  - Lo tecnico abajo a la derecha.
 *  - Nada abajo a la izquierda: ahi la card del catalogo tiene el chip del SKU.
 */

export type StickerSugerido = {
  id: string;
  nombre: string;
  tipo: TipoSticker;
  imagenUrl: string | null;
  texto: string | null;
  colorFondo: string | null;
  colorTexto: string | null;
  posicion: PosicionSticker;
  orden: number;
};

export const STICKERS_SUGERIDOS: StickerSugerido[] = [
  // Las banderas reusan los SVG de `public/flags`, los mismos que ya se usan
  // para el origen del producto: no hay que subir nada.
  { id: "stk_bandera_alemania",  nombre: "Bandera de Alemania",   tipo: "imagen", imagenUrl: "/flags/de.svg", texto: null, colorFondo: null, colorTexto: null, posicion: "arriba-izq", orden: 0 },
  { id: "stk_bandera_americana", nombre: "Bandera Americana",     tipo: "imagen", imagenUrl: "/flags/us.svg", texto: null, colorFondo: null, colorTexto: null, posicion: "arriba-izq", orden: 1 },
  { id: "stk_bandera_italia",    nombre: "Bandera Italia",        tipo: "imagen", imagenUrl: "/flags/it.svg", texto: null, colorFondo: null, colorTexto: null, posicion: "arriba-izq", orden: 2 },
  { id: "stk_bandera_ue",        nombre: "Bandera Union Europea", tipo: "imagen", imagenUrl: "/flags/eu.svg", texto: null, colorFondo: null, colorTexto: null, posicion: "arriba-izq", orden: 3 },

  { id: "stk_oferta",       nombre: "Oferta",       tipo: "texto", imagenUrl: null, texto: "OFERTA",       colorFondo: "#DF8635", colorTexto: "#FFFFFF", posicion: "arriba-der", orden: 0 },
  { id: "stk_mas_vendido",  nombre: "Mas Vendido",  tipo: "texto", imagenUrl: null, texto: "MÁS VENDIDO",  colorFondo: "#111111", colorTexto: "#FFFFFF", posicion: "arriba-der", orden: 1 },
  { id: "stk_novedad",      nombre: "Novedad",      tipo: "texto", imagenUrl: null, texto: "NOVEDAD",      colorFondo: "#2E7D5B", colorTexto: "#FFFFFF", posicion: "arriba-der", orden: 2 },

  { id: "stk_waterproof",      nombre: "Waterproof",      tipo: "texto", imagenUrl: null, texto: "WATERPROOF",      colorFondo: "#12608F", colorTexto: "#FFFFFF", posicion: "abajo-der", orden: 0 },
  { id: "stk_water_resistant", nombre: "Water Resistant", tipo: "texto", imagenUrl: null, texto: "WATER RESISTANT", colorFondo: "#4A94C4", colorTexto: "#FFFFFF", posicion: "abajo-der", orden: 1 },
  // Va como etiqueta de texto porque no hay logo. Cuando lo tengan se cambia a
  // tipo imagen desde el panel: el id no cambia, asi que los productos que ya lo
  // tengan asignado siguen mostrandolo.
  { id: "stk_importado",       nombre: "Producto Importado", tipo: "texto", imagenUrl: null, texto: "IMPORTADO",  colorFondo: "#4A4A4A", colorTexto: "#FFFFFF", posicion: "abajo-der", orden: 2 },
];
