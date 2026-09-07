"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiAlertCircle, FiLoader, FiCopy, FiRefreshCw } from "react-icons/fi";

/**
 * Estado de la base.
 *
 * Responde una sola pregunta: ¿la base tiene todo lo que el código necesita?
 * Cuando la respuesta es no, muestra exactamente qué falta y el SQL que lo
 * arregla, para pegar en la consola de Turso.
 *
 * Está porque el síntoma de una migración sin aplicar es "0 productos", que se
 * parece demasiado a "no hay productos".
 */

type EstadoTabla = { modelo: string; tabla: string; existe: boolean; faltantes: string[]; sql: string[] };
type Reporte = { ok: boolean; tablas: EstadoTabla[]; sqlPendiente: string[] };

export default function DiagnosticoPage() {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/diagnostico/base", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo revisar la base");
      setReporte(json.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const copiar = async () => {
    if (!reporte) return;
    try {
      await navigator.clipboard.writeText(reporte.sqlPendiente.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError("No se pudo copiar. Seleccioná el texto a mano.");
    }
  };

  const conProblemas = reporte?.tablas.filter((t) => !t.existe || t.faltantes.length > 0) ?? [];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[900px]">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Estado de la base</h1>
          <p className="text-[12px] text-[#888] mt-1">
            Chequea que la base tenga todas las tablas y columnas que el sitio necesita. Si falta
            algo, el catálogo se ve vacío sin dar error.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors disabled:opacity-50"
        >
          <FiRefreshCw size={12} className={cargando ? "animate-spin" : ""} />
          Revisar
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 border border-red-200 bg-red-50 text-[12px] text-red-700">
          <FiAlertCircle size={14} className="shrink-0 mt-px" /> {error}
        </div>
      )}

      {cargando && !reporte ? (
        <div className="flex items-center gap-2 text-[12px] text-[#888] py-10">
          <FiLoader size={14} className="animate-spin" /> Revisando…
        </div>
      ) : reporte ? (
        <>
          {reporte.ok ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-emerald-200 bg-emerald-50 text-[13px] text-[#111] mb-6">
              <FiCheck size={16} className="text-emerald-600 shrink-0" />
              La base está al día. Las {reporte.tablas.length} tablas tienen todas sus columnas.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 px-4 py-3 border border-red-200 bg-red-50 text-[13px] text-red-800 mb-4">
                <FiAlertCircle size={16} className="shrink-0 mt-px" />
                <div>
                  <p className="font-semibold">
                    Falta aplicar una migración: {conProblemas.length}{" "}
                    {conProblemas.length === 1 ? "tabla" : "tablas"} sin actualizar.
                  </p>
                  <p className="mt-0.5 text-red-700">
                    Mientras tanto, esas categorías se ven vacías en el catálogo.
                  </p>
                </div>
              </div>

              {reporte.sqlPendiente.length > 0 && (
                <div className="border border-[#E0DED8] bg-white mb-6">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0EEE8]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                      SQL para correr en Turso
                    </p>
                    <button
                      type="button"
                      onClick={copiar}
                      className="flex items-center gap-1.5 px-2 py-1 border border-[#E0DED8] hover:border-[#DF8635] text-[10px] text-[#555] transition-colors"
                    >
                      {copiado ? <FiCheck size={11} className="text-emerald-600" /> : <FiCopy size={11} />}
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <pre className="px-3 py-2.5 text-[11px] leading-relaxed text-[#333] overflow-x-auto whitespace-pre">
{reporte.sqlPendiente.join("\n")}
                  </pre>
                  <p className="px-3 pb-2.5 text-[10px] text-[#bbb] leading-relaxed">
                    La consola de Turso corre una sentencia por vez: clickeá el ▶ de cada línea.
                    Si alguna dice &ldquo;duplicate column name&rdquo;, esa ya estaba.
                  </p>
                </div>
              )}
            </>
          )}

          <table className="w-full border border-[#E0DED8] bg-white">
            <thead>
              <tr className="border-b border-[#E0DED8]">
                <th className="text-left text-[9px] uppercase tracking-[0.08em] text-[#aaa] font-semibold px-3 py-2">Tabla</th>
                <th className="text-left text-[9px] uppercase tracking-[0.08em] text-[#aaa] font-semibold px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reporte.tablas.map((t) => {
                const bien = t.existe && t.faltantes.length === 0;
                return (
                  <tr key={t.tabla} className="border-b border-[#F0EEE8] last:border-0">
                    <td className="px-3 py-2">
                      <code className="text-[11px] text-[#111]">{t.tabla}</code>
                    </td>
                    <td className="px-3 py-2">
                      {bien ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                          <FiCheck size={11} /> al día
                        </span>
                      ) : !t.existe ? (
                        <span className="text-[11px] text-red-600">
                          la tabla no existe — falta correr la migración que la crea
                        </span>
                      ) : (
                        <span className="text-[11px] text-red-600">
                          falta{t.faltantes.length > 1 ? "n" : ""}:{" "}
                          <span className="font-mono">{t.faltantes.join(", ")}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}
