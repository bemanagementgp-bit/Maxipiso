"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiGlobe } from "react-icons/fi";
import { useIdioma } from "@/components/providers/IdiomaProvider";
import { IDIOMAS } from "@/lib/i18n/idiomas";

/**
 * Selector de idioma del header.
 *
 * Cada opcion se muestra **en su propio idioma** ("Deutsch", no "Alemán"): quien
 * lo busca no lee espanol, y es la unica forma de que lo encuentre.
 *
 * Cambiar de idioma no recarga la pagina: el texto vive en el contexto y se
 * re-renderiza. La cookie queda escrita para la proxima visita.
 */
export default function SelectorIdioma({ compacto = false }: { compacto?: boolean }) {
  const { idioma, cambiarIdioma, t } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alEscapar = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", alClickear);
    document.addEventListener("keydown", alEscapar);
    return () => {
      document.removeEventListener("mousedown", alClickear);
      document.removeEventListener("keydown", alEscapar);
    };
  }, [abierto]);

  const actual = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0];

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={t.idioma.cambiar}
        title={t.idioma.cambiar}
        className={`flex items-center gap-1.5 rounded-full border border-gray-200 hover:border-[#DF8635] transition-colors ${
          compacto ? "px-2.5 py-1.5 text-xs" : "px-3 py-1.5 text-sm"
        }`}
      >
        <FiGlobe size={compacto ? 13 : 15} className="text-gray-400 shrink-0" />
        <span className="font-semibold text-[#111111] uppercase">{actual.codigo}</span>
        <FiChevronDown
          size={12}
          className={`text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto && (
        <ul
          role="listbox"
          aria-label={t.idioma.etiqueta}
          className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-[60]"
        >
          {IDIOMAS.map((i) => {
            const activo = i.codigo === idioma;
            return (
              <li key={i.codigo}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activo}
                  lang={i.codigo}
                  onClick={() => { cambiarIdioma(i.codigo); setAbierto(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    activo ? "text-[#DF8635] font-semibold bg-[#DF8635]/5" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">{i.bandera}</span>
                  {i.nombre}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
