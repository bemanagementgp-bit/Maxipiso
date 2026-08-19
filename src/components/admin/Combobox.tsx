"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

/**
 * Campo de texto con sugerencias de lo que ya se usó.
 *
 * **No es un select.** Se puede escribir cualquier cosa: la lista sugiere los
 * valores que ya existen en esa categoría para que "Max Core" no termine
 * cargado también como "MaxCore" y "max core" —tres marcas distintas para el
 * filtro del catálogo, que se arma con los valores distintos de la tabla—, pero
 * un valor nuevo siempre se puede escribir.
 */

type Props = {
  value: string;
  onChange: (valor: string) => void;
  opciones: string[];
  placeholder?: string;
  className?: string;
  id?: string;
};

export default function Combobox({ value, onChange, opciones, placeholder, className, id }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const generado = useId();
  const listaId = `${id ?? generado}-opciones`;

  /**
   * Filtrado por lo tipeado. Sin acentos y sin distinguir mayúsculas: buscar
   * "porcelanato" tiene que encontrar "Porcelánato".
   */
  const filtradas = useMemo(() => {
    const norm = (t: string) =>
      t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const q = norm(value);
    if (!q) return opciones;
    const empiezan: string[] = [];
    const contienen: string[] = [];
    for (const o of opciones) {
      const n = norm(o);
      if (n.startsWith(q)) empiezan.push(o);
      else if (n.includes(q)) contienen.push(o);
    }
    // Las que empiezan igual van primero: es lo que se espera al tipear.
    return [...empiezan, ...contienen];
  }, [value, opciones]);

  // Cerrar al hacer click afuera.
  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [abierto]);

  // Mantener a la vista la opción resaltada al moverse con las flechas.
  useEffect(() => {
    if (!abierto || resaltado < 0) return;
    const el = listaRef.current?.children[resaltado] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [resaltado, abierto]);

  const elegir = (valor: string) => {
    onChange(valor);
    setAbierto(false);
    setResaltado(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) { setAbierto(true); setResaltado(0); return; }
      const paso = e.key === "ArrowDown" ? 1 : -1;
      setResaltado((prev) => {
        const siguiente = prev + paso;
        if (siguiente < 0) return filtradas.length - 1;
        if (siguiente >= filtradas.length) return 0;
        return siguiente;
      });
      return;
    }
    if (e.key === "Enter" && abierto && resaltado >= 0 && filtradas[resaltado]) {
      // Solo intercepta el Enter si hay una opción resaltada: si no, deja pasar
      // lo tipeado, que es un valor nuevo perfectamente válido.
      e.preventDefault();
      elegir(filtradas[resaltado]);
      return;
    }
    if (e.key === "Escape" && abierto) {
      e.preventDefault();
      setAbierto(false);
      setResaltado(-1);
    }
  };

  const hayOpciones = opciones.length > 0;

  return (
    <div ref={contenedorRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setResaltado(-1); }}
        onFocus={() => hayOpciones && setAbierto(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
      />

      {hayOpciones && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setAbierto((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#777] transition-colors"
          aria-label="Ver valores usados"
        >
          <FiChevronDown size={13} className={abierto ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      )}

      {abierto && hayOpciones && (
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white border border-[#E0DED8] shadow-lg rounded-sm"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-[#aaa]">
              Sin coincidencias — se va a guardar como valor nuevo
            </li>
          ) : (
            filtradas.map((opcion, i) => (
              <li
                key={opcion}
                role="option"
                aria-selected={opcion === value}
                // `onMouseDown` y no `onClick`: el click dispara despues del
                // blur del input, que ya habria cerrado la lista.
                onMouseDown={(e) => { e.preventDefault(); elegir(opcion); }}
                onMouseEnter={() => setResaltado(i)}
                className={`px-3 py-1.5 text-[12px] cursor-pointer transition-colors ${
                  i === resaltado ? "bg-[#FFF8F1] text-[#111]" : "text-[#555] hover:bg-[#FAFAF8]"
                } ${opcion === value ? "font-medium" : ""}`}
              >
                {opcion}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
