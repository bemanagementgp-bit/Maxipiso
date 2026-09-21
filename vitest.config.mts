import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Pruebas de las funciones puras del dominio.
 *
 * No hay pruebas de componentes ni de endpoints a propósito: lo que se cubre es
 * donde un error corrompe datos en silencio —parsers de precios, de opciones de
 * variante, de imágenes, el detector de tonos, el armado de la planilla—. Todo
 * eso hoy se verifica a mano en el navegador, y una coma perdida no se ve hasta
 * que alguien mira un precio raro semanas después.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
