"use client";

import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { TIPOS_SUGERIDOS, type Opcion } from "@/lib/variantes";

/**
 * En qué se diferencia esta variante de sus hermanas.
 *
 * Son pares tipo/valor y no texto libre: el tipo sale de un desplegable y el
 * valor se escribe. Con texto libre, "Color" y "color" y "COLOR" terminaban
 * siendo tres ejes distintos en la ficha, y el selector mostraba tres filas de
 * botones donde tenía que haber una.
 *
 * El desplegable trae Color y Medidas armados, más los tipos que ya se usaron
 * en el catálogo, más "Otro" para inventar uno. La lista crece con el uso en
 * vez de quedar fija en lo que se nos ocurrió hoy.
 */

type Props = {
  opciones: Opcion[];
  onChange: (opciones: Opcion[]) => void;
  /** Tipos ya usados en el catálogo, para no reinventarlos con otra ortografía. */
  tiposConocidos?: string[];
};

const campo =
  "px-2.5 py-1.5 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#DF8635] rounded-sm";

const OTRO = "__otro__";

export default function OpcionesVarianteEditor({ opciones, onChange, tiposConocidos = [] }: Props) {
  /** Índices en los que se está escribiendo un tipo nuevo. */
  const [inventando, setInventando] = useState<Set<number>>(new Set());

  const tipos = (() => {
    const vistos = new Set<string>();
    const lista: string[] = [];
    for (const t of [...TIPOS_SUGERIDOS, ...tiposConocidos]) {
      const limpio = t.trim();
      if (!limpio || vistos.has(limpio.toLowerCase())) continue;
      vistos.add(limpio.toLowerCase());
      lista.push(limpio);
    }
    return lista;
  })();

  /**
   * Filas a medio llenar. Al guardar se descartan —un par sin tipo o sin valor
   * no dice nada— y sin este aviso el dato desaparecia sin que nadie lo notara.
   */
  const incompletas = opciones.filter(
    (o) => !o.tipo.trim() !== !o.valor.trim(),
  ).length;

  const editar = (i: number, cambios: Partial<Opcion>) =>
    onChange(opciones.map((o, j) => (j === i ? { ...o, ...cambios } : o)));

  const quitar = (i: number) => {
    onChange(opciones.filter((_, j) => j !== i));
    setInventando((prev) => {
      const siguiente = new Set<number>();
      for (const idx of prev) siguiente.add(idx > i ? idx - 1 : idx);
      siguiente.delete(i);
      return siguiente;
    });
  };

  /** El primer tipo sugerido que todavía no se usó: evita dos "Color". */
  const agregar = () => {
    const usados = new Set(opciones.map((o) => o.tipo.toLowerCase()));
    const libre = tipos.find((t) => !usados.has(t.toLowerCase())) ?? "";
    onChange([...opciones, { tipo: libre, valor: "" }]);
    if (!libre) setInventando((p) => new Set(p).add(opciones.length));
  };

  return (
    <div>
      {opciones.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {opciones.map((o, i) => {
            const escribiendo = inventando.has(i) || (!!o.tipo && !tipos.some((t) => t.toLowerCase() === o.tipo.toLowerCase()));
            return (
              <div key={i} className="flex items-center gap-1.5">
                {escribiendo ? (
                  <input
                    value={o.tipo}
                    onChange={(e) => editar(i, { tipo: e.target.value })}
                    placeholder="Tipo"
                    autoFocus={inventando.has(i)}
                    onFocus={(e) => e.target.select()}
                    className={`${campo} w-28 shrink-0`}
                  />
                ) : (
                  <select
                    value={o.tipo}
                    onChange={(e) => {
                      if (e.target.value === OTRO) {
                        // Se conserva el tipo actual: si el desplegable se toco
                        // sin querer, "Medidas" no se pierde. El texto arranca
                        // seleccionado, asi que escribir encima igual lo pisa.
                        setInventando((p) => new Set(p).add(i));
                        return;
                      }
                      editar(i, { tipo: e.target.value });
                    }}
                    className={`${campo} w-28 shrink-0`}
                  >
                    <option value="">Tipo…</option>
                    {tipos.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value={OTRO}>Otro…</option>
                  </select>
                )}

                <input
                  value={o.valor}
                  onChange={(e) => editar(i, { valor: e.target.value })}
                  placeholder={/medida/i.test(o.tipo) ? "120x20" : "Roble"}
                  className={`${campo} flex-1`}
                />

                <button
                  type="button"
                  onClick={() => quitar(i)}
                  title="Quitar"
                  className="shrink-0 p-1 text-[#ccc] hover:text-red-500 transition-colors"
                >
                  <FiX size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={agregar}
        className="flex items-center gap-1 px-2 py-1 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors rounded-sm"
      >
        <FiPlus size={11} /> Agregar opción
      </button>

      {incompletas > 0 && (
        <p className="mt-1.5 text-[10px] text-[#B45309] leading-relaxed">
          {incompletas === 1
            ? "Hay una opción sin completar: si guardás así, se descarta."
            : `Hay ${incompletas} opciones sin completar: si guardás así, se descartan.`}
        </p>
      )}

      <p className="mt-1.5 text-[9px] text-[#bbb] leading-relaxed">
        En qué se diferencia de las otras del grupo. En la planilla es una sola celda:{" "}
        <span className="text-[#888]">Color: Roble ; Medidas: 120x20</span>.
      </p>
    </div>
  );
}
