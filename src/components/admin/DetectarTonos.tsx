"use client";

import { useState } from "react";
import { FiDroplet, FiLoader, FiCheck, FiAlertCircle, FiX } from "react-icons/fi";

/**
 * Completa el tono de los productos ya cargados, deduciendolo del nombre.
 *
 * **Muestra qué va a hacer antes de hacerlo.** Es una adivinanza sobre miles de
 * filas: aplicada a ciegas llenaría el catálogo de tonos plausibles y
 * equivocados, y eso es peor que la columna vacía. El reparto por tono y los
 * ejemplos están para poder cancelar a tiempo.
 *
 * Nunca pisa un tono cargado a mano. Correrlo dos veces no cambia nada la
 * segunda vez.
 */

type Vista = {
  aCompletar: number;
  sinDetectar: number;
  yaTenian: number;
  porTono: Record<string, number>;
  ejemplos: { tono: string; productos: string[] }[];
};

export default function DetectarTonos({ onAplicado }: { onAplicado?: () => void }) {
  const [vista, setVista] = useState<Vista | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");

  const analizar = async () => {
    setCargando(true);
    setError("");
    setResultado("");
    try {
      const res = await fetch("/api/productos/tonos", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo analizar");
      setVista(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async () => {
    setAplicando(true);
    setError("");
    try {
      const res = await fetch("/api/productos/tonos", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo aplicar");
      setResultado(`${json.data.aplicados} productos completados.`);
      setVista(null);
      onAplicado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="border border-[#E0DED8] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-semibold text-[#111] flex items-center gap-1.5">
            <FiDroplet size={13} className="text-[#aaa]" />
            Completar el tono automáticamente
          </h2>
          <p className="text-[11px] text-[#888] mt-1 max-w-[60ch] leading-relaxed">
            Deduce el tono de cada producto a partir de su nombre (&ldquo;Roble Gris Oscuro&rdquo; → Gris
            Oscuro). Sólo completa los que están vacíos: nunca pisa un tono cargado a mano.
            Te muestra qué va a hacer antes de aplicarlo.
          </p>
        </div>
        <button
          type="button"
          onClick={analizar}
          disabled={cargando}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors disabled:opacity-50"
        >
          {cargando ? <FiLoader size={12} className="animate-spin" /> : <FiDroplet size={12} />}
          Analizar
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 border border-red-200 bg-red-50 text-[12px] text-red-700">
          <FiAlertCircle size={14} className="shrink-0 mt-px" /> {error}
        </div>
      )}
      {resultado && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 text-[12px] text-[#111]">
          <FiCheck size={14} className="text-emerald-600" /> {resultado}
        </div>
      )}

      {vista && (
        <div className="mt-4 border-t border-[#F0EEE8] pt-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[12px] text-[#111]">
              <span className="font-semibold">{vista.aCompletar}</span> productos se van a completar ·{" "}
              <span className="text-[#888]">{vista.sinDetectar} sin detectar</span> ·{" "}
              <span className="text-[#888]">{vista.yaTenian} ya tenían tono</span>
            </p>
            <button
              type="button"
              onClick={() => setVista(null)}
              title="Cancelar"
              className="shrink-0 p-1 text-[#ccc] hover:text-[#555] transition-colors"
            >
              <FiX size={14} />
            </button>
          </div>

          {vista.aCompletar === 0 ? (
            <p className="text-[11px] text-[#888]">
              No hay nada para completar: o ya tienen tono, o el nombre no dice de qué color son.
            </p>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {vista.ejemplos.map((e) => (
                  <div key={e.tono} className="flex items-start gap-3">
                    <span className="shrink-0 w-32 text-[11px] font-semibold text-[#111]">
                      {e.tono}{" "}
                      <span className="text-[#aaa] font-normal">({vista.porTono[e.tono]})</span>
                    </span>
                    <span className="text-[10px] text-[#888] leading-relaxed min-w-0">
                      {e.productos.join(" · ")}
                      {vista.porTono[e.tono] > e.productos.length ? " …" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={aplicar}
                disabled={aplicando}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] text-white text-[11px] hover:bg-[#DF8635] transition-colors disabled:opacity-40"
              >
                {aplicando ? <FiLoader size={12} className="animate-spin" /> : <FiCheck size={12} />}
                Aplicar a {vista.aCompletar} productos
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
