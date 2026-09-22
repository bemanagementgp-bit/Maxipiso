"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import Combobox from "./Combobox";
import { partirMultiple, unirMultiple } from "@/lib/opciones-fijas";

/**
 * Un campo que guarda varios valores en una sola celda, separados por ` | `.
 *
 * Existe por "Compatible con": un zócalo sirve para pisos flotantes **y**
 * vinílicos, y cargarlo como la frase "Pisos flotantes y vinílicos" dejaba al
 * filtro del catálogo ofreciendo esa frase entera como una opción, que no
 * matchea con ninguna de las dos categorías. Partido en dos valores, el
 * accesorio aparece bajo las dos.
 *
 * Lo elegido son chips que se sacan con la cruz; debajo queda el `Combobox` de
 * siempre para agregar. Sigue aceptando valores que no están en la lista,
 * porque el catálogo cambia antes que la lista.
 *
 * Lo que se tipea vive acá adentro y sólo se agrega cuando queda **elegido**
 * —tocando una opción o con Enter—, no con cada tecla: escribir "Maderas"
 * agregaba ocho chips, uno por letra.
 */
export default function MultiCombobox({
  value,
  onChange,
  opciones,
  className,
  placeholder = "Agregar…",
}: {
  value: string;
  onChange: (valor: string) => void;
  opciones: string[];
  className?: string;
  placeholder?: string;
}) {
  const [tipeado, setTipeado] = useState("");
  const elegidos = partirMultiple(value);
  const yaEstan = new Set(elegidos.map((v) => v.toLowerCase()));
  const disponibles = opciones.filter((o) => !yaEstan.has(o.trim().toLowerCase()));

  const agregar = (v: string) => {
    const limpio = v.trim();
    setTipeado("");
    if (!limpio || yaEstan.has(limpio.toLowerCase())) return;
    onChange(unirMultiple([...elegidos, limpio]));
  };

  const sacar = (v: string) =>
    onChange(unirMultiple(elegidos.filter((x) => x !== v)));

  return (
    <div className="space-y-1.5">
      {elegidos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {elegidos.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px] bg-[#F5F4F1] border border-[#E0DED8] rounded-sm text-[#111]"
            >
              {v}
              <button
                type="button"
                onClick={() => sacar(v)}
                title={`Sacar ${v}`}
                className="p-0.5 text-[#bbb] hover:text-red-500 transition-colors"
              >
                <FiX size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <Combobox
        // El campo lleva lo que se está tipeando, no lo elegido: eso vive en
        // los chips de arriba.
        value={tipeado}
        onChange={setTipeado}
        onCommit={agregar}
        opciones={disponibles}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
