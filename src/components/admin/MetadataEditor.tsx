"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";

type Meta = { clave: string; valor: string };

interface MetadataEditorProps {
  value: Meta[];
  onChange: (meta: Meta[]) => void;
  tabla?: string;
}

const fieldClass =
  "px-2.5 py-1.5 text-[11px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc] rounded-sm w-full";

export function MetadataEditor({ value, onChange, tabla }: MetadataEditorProps) {
  const [suggestions, setSuggestions] = useState<{ clave: string; count: number }[]>([]);

  useEffect(() => {
    if (!tabla) { setSuggestions([]); return; }
    fetch("/api/productos/metadata-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabla }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSuggestions(d.data); })
      .catch(() => {});
  }, [tabla]);

  const update = (idx: number, field: "clave" | "valor", v: string) => {
    const next = value.map((m, i) => (i === idx ? { ...m, [field]: v } : m));
    onChange(next);
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, { clave: "", valor: "" }]);

  const applySuggestion = (clave: string) => {
    const alreadyExists = value.some((m) => m.clave.toLowerCase() === clave.toLowerCase());
    if (!alreadyExists) onChange([...value, { clave, valor: "" }]);
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !value.some((m) => m.clave.toLowerCase() === s.clave.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">
        Características adicionales
      </span>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={m.clave}
                onChange={(e) => update(i, "clave", e.target.value)}
                placeholder="Ej: Resistencia al agua"
                className={fieldClass}
                style={{ flex: "0 0 42%" }}
              />
              <input
                value={m.valor}
                onChange={(e) => update(i, "valor", e.target.value)}
                placeholder="Ej: Sí / AC5 / 12mm"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-[10px] text-[#aaa] hover:text-[#555] transition-colors"
      >
        <FiPlus size={12} />
        Agregar campo
      </button>

      {visibleSuggestions.length > 0 && (
        <div className="rounded-md overflow-hidden border border-[#111]/10">
          <div className="bg-[#111] px-3.5 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.12em] text-white/70 font-semibold">
              Campos frecuentes en esta categoría
            </span>
          </div>
          <div className="bg-[#FAFAF8] px-3.5 py-3 flex flex-wrap gap-2">
            {visibleSuggestions.map((s) => (
              <button
                key={s.clave}
                type="button"
                onClick={() => applySuggestion(s.clave)}
                className="group flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-[11px] bg-white border border-[#E0DED8] text-[#444] hover:border-[#111] hover:shadow-sm rounded-full transition-all duration-150"
              >
                <span className="font-semibold">{s.clave}</span>
                <span className="relative text-[9px] tabular-nums">
                  <span className="text-[#bbb] group-hover:opacity-0 transition-opacity duration-150">{s.count}x</span>
                  <span className="absolute inset-0 text-[#111] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">+</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
