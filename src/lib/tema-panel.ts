"use client";

import { useEffect, useState } from "react";

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

export function useTemaPanel(): TemaPanel {
  // Arranca en claro y no en `leer()` porque en el render del servidor no hay
  // DOM: si difiriera del primer render del cliente, sería un desajuste de
  // hidratación. El efecto corrige apenas monta.
  const [tema, setTema] = useState<TemaPanel>("warm");

  useEffect(() => {
    setTema(leer());
    const obs = new MutationObserver(() => setTema(leer()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return tema;
}
