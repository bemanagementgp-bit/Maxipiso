"use client";

import { useState } from "react";
import { FiLoader, FiAlertCircle, FiCheck, FiEyeOff } from "react-icons/fi";

/**
 * Encuentra los productos que quedaron invisibles por un `variante de` roto.
 *
 * El catálogo lista sólo los principales de cada grupo, así que un producto
 * que dice ser variante de un grupo inexistente no sale por ningún lado:
 * cargado, activo, con foto, y no aparece. Es el caso de las terminaciones de
 * aluminio, y no hay forma de verlo salvo ir producto por producto.
 *
 * Muestra qué va a tocar antes de tocarlo, como el detector de tonos: arreglar
 * es vaciar la columna, y eso devuelve el producto al catálogo como card
 * propia.
 */

type Ejemplo = {
  id: string;
  sku: string;
  nombre: string;
  tablaLabel: string;
  varianteDe: string;
  motivo: "se-apunta-a-si-mismo" | "principal-inexistente";
};

type Reporte = {
  total: number;
  seApuntanASiMismos: number;
  principalInexistente: number;
  ejemplos: Ejemplo[];
};

const MOTIVOS: Record<Ejemplo["motivo"], string> = {
  "se-apunta-a-si-mismo": "se declara variante de sí mismo",
  "principal-inexistente": "apunta a un SKU que no existe",
};

export default function VariantesHuerfanas() {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [listo, setListo] = useState("");
  const [error, setError] = useState("");

  const analizar = async () => {
    setCargando(true);
    setError("");
    setListo("");
    try {
      const res = await fetch("/api/productos/variantes-huerfanas", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo revisar");
      setReporte(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async () => {
    setAplicando(true);
    setError("");
    try {
      const res = await fetch("/api/productos/variantes-huerfanas", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo arreglar");
      setListo(`${json.data.arreglados} producto${json.data.arreglados === 1 ? "" : "s"} vuelve${json.data.arreglados === 1 ? "" : "n"} al catálogo.`);
      setReporte(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="border border-[#E0DED8] bg-white p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[#111]">
            <FiEyeOff size={13} className="text-[#aaa]" />
            Productos invisibles por un &ldquo;variante de&rdquo; roto
          </h2>
          <p className="text-[11px] text-[#888] mt-1 leading-relaxed max-w-[62ch]">
            Un producto que dice ser variante de un grupo que no existe no aparece en ningún
            lado: no se lista como card propia porque se lo toma por variante, y no está dentro
            de ningún grupo. Queda cargado, activo y con foto, sin verse.
          </p>
        </div>
        <button
          type="button"
          onClick={analizar}
          disabled={cargando}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors disabled:opacity-50 rounded-sm"
        >
          {cargando ? <FiLoader size={12} className="animate-spin" /> : null}
          Buscar invisibles
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 border border-red-200 bg-red-50 text-[11px] text-red-700 rounded-sm">
          <FiAlertCircle size={13} className="shrink-0 mt-px" /> {error}
        </div>
      )}

      {listo && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 text-[11px] text-[#111] rounded-sm">
          <FiCheck size={13} className="text-emerald-600" /> {listo}
        </div>
      )}

      {reporte && (
        reporte.total === 0 ? (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 text-[11px] text-[#111] rounded-sm">
            <FiCheck size={13} className="text-emerald-600" />
            Ningún producto tiene el grupo roto.
          </div>
        ) : (
          <div className="mt-3 border border-[#E0DED8] rounded-sm overflow-hidden">
            <div className="px-3 py-2 bg-[#FFF8F1] border-b border-[#E0DED8] flex items-center justify-between gap-3">
              <p className="text-[11px] text-[#111]">
                <span className="font-semibold">{reporte.total}</span> sin verse
                {reporte.seApuntanASiMismos > 0 && ` · ${reporte.seApuntanASiMismos} se declaran variante de sí mismos`}
                {reporte.principalInexistente > 0 && ` · ${reporte.principalInexistente} apuntan a un SKU que no existe`}
              </p>
              <button
                type="button"
                onClick={aplicar}
                disabled={aplicando}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm transition-colors"
              >
                {aplicando ? <FiLoader size={12} className="animate-spin" /> : null}
                Devolverlos al catálogo
              </button>
            </div>
            <ul className="divide-y divide-[#F0EEE8] max-h-64 overflow-y-auto">
              {reporte.ejemplos.map((e) => (
                <li key={e.id} className="px-3 py-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#111] truncate">{e.nombre}</p>
                    <p className="text-[9px] text-[#aaa] font-mono">{e.sku} · {e.tablaLabel}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[#888]">{MOTIVOS[e.motivo]}</span>
                </li>
              ))}
            </ul>
            {reporte.total > reporte.ejemplos.length && (
              <p className="px-3 py-2 text-[10px] text-[#bbb] border-t border-[#F0EEE8]">
                Se muestran los primeros {reporte.ejemplos.length}. Se arreglan los {reporte.total}.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
