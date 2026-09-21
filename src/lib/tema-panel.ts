"use client";

import { useSyncExternalStore } from "react";

/**
 * El tema del panel, leído del DOM.
 *
 * Existe por los gráficos. Todo lo demás del panel cambia de color con CSS
 * —el tema reasigna las clases— pero Recharts dibuja SVG y pone los colores
 * como atributos `fill` y `stroke`, y en un atributo de presentación `var()`
 * no se resuelve. Así que esos colores tienen que llegar como un hex, y para
 * eso hace falta saber el tema del lado de React.
 *
 * Lee `data-theme` de <html>, que es donde lo dejan el script previo al pintado
 * y el layout del panel, y se vuelve a renderizar cuando cambia. No hay
 * contexto ni estado compartido: el DOM ya es la fuente de verdad del tema y
 * duplicarla en un provider daría dos lugares que se pueden desincronizar.
 */

export type TemaPanel = "warm" | "dark";

/** Colores que los gráficos no pueden tomar del CSS. */
export const COLORES_GRAFICO: Record<TemaPanel, { neutro: string; grilla: string; ejes: string }> = {
  warm: { neutro: "#111111", grilla: "#f0ede8", ejes: "#bbbbbb" },
  dark: { neutro: "#C4C4C4", grilla: "#2A2C30", ejes: "#8E8E8E" },
};

function leer(): TemaPanel {
  if (typeof document === "undefined") return "warm";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "warm";
}

/** Avisa cuando `data-theme` cambia. */
function suscribir(alCambiar: () => void): () => void {
  const obs = new MutationObserver(alCambiar);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

/**
 * `useSyncExternalStore` y no `useState` con un efecto.
 *
 * El tema vive en el DOM, que para React es un sistema externo: esta es la API
 * que existe justamente para eso. La versión con efecto pintaba una vez en
 * claro y corregía después —un parpadeo en los gráficos al entrar en oscuro— y
 * React 19 la marca como render en cascada.
 *
 * El tercer argumento es el valor del servidor, donde no hay DOM. Devuelve
 * "warm" para que el HTML del servidor y el primer render del cliente
 * coincidan; el script previo al pintado ya dejó el atributo puesto, así que
 * el primer `leer()` del cliente da el tema correcto sin repintar el resto.
 */
export function useTemaPanel(): TemaPanel {
  return useSyncExternalStore(suscribir, leer, () => "warm" as TemaPanel);
}
