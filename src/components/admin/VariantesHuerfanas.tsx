"use client";

import { useState } from "react";
import Link from "next/link";
import { FiLoader, FiAlertCircle, FiCheck, FiEyeOff, FiExternalLink } from "react-icons/fi";
import { SE_ARREGLA_SOLO, TEXTO_MOTIVO, type MotivoInvisible } from "@/lib/visibilidad";

/**
 * Encuentra los productos cargados y activos que aun asi no aparecen.
 *
 * El catalogo dibuja una card por grupo de variantes, y esa card es la del
 * principal. Un producto con `variante de` cargado no sale solo: sale entrando
 * al principal. Cuando el principal no se ve —porque esta apagado, sin foto, o
 * directamente no existe— el grupo entero desaparece, y no hay forma de
 * notarlo salvo ir producto por producto.
 *
 * Los cuatro motivos se agrupan en dos: los que apuntan a la nada, que el
 * boton repara vaciando la columna, y los que tienen el grupo bien armado pero
 * el principal cerrado, que se arreglan yendo a ese producto. Por eso los
 * segundos se listan con link y no con boton: ver `lib/visibilidad`.
 */

type Ejemplo = {
  id: string;
  sku: string;
  nombre: string;
  tabla: string;
  tablaLabel: string;
  varianteDe: string;
  principal: string;
  motivo: MotivoInvisible;
};

type Reporte = {
  total: number;
  arreglables: number;
  seApuntanASiMismos: number;
  principalInexistente: number;
  principalApagado: number;
  principalSinFoto: number;
  sinBoton: number;
  ejemplos: Ejemplo[];
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
      // Se vuelve a mirar en vez de limpiar: los que necesitan mano quedan.
      await analizar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setAplicando(false);
    }
  };

  const aMano = reporte ? reporte.ejemplos.filter((e) => !SE_ARREGLA_SOLO.has(e.motivo)) : [];
  const solos = reporte ? reporte.ejemplos.filter((e) => SE_ARREGLA_SOLO.has(e.motivo)) : [];

  return (
    <div className="border border-[#E0DED8] bg-white p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[#111]">
            <FiEyeOff size={13} className="text-[#aaa]" />
            Productos que no se ven en el catálogo
          </h2>
          <p className="text-[11px] text-[#888] mt-1 leading-relaxed max-w-[62ch]">
            El catálogo muestra una card por grupo de variantes, y esa card es la del producto
            principal. Un producto con &ldquo;variante de&rdquo; cargado se ve entrando al principal
            y eligiéndolo en el selector. No se llega si el principal está inactivo, sin foto o no
            existe, y tampoco si ninguna opción lo distingue de sus hermanas: seis niveladores
            cargados todos como &ldquo;Color: Plata&rdquo; no dan un selector, dan un grupo mudo.
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

      {reporte && reporte.total === 0 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 text-[11px] text-[#111] rounded-sm">
          <FiCheck size={13} className="text-emerald-600" />
          Todos los productos cargados aparecen en el catálogo.
        </div>
      )}

      {reporte && reporte.total > 0 && (
        <div className="mt-3 space-y-3">
          {/* Los que apuntan a la nada: un botón los devuelve al catálogo. */}
          {solos.length > 0 && (
            <div className="border border-[#E0DED8] rounded-sm overflow-hidden">
              <div className="px-3 py-2 bg-[#FFF8F1] border-b border-[#E0DED8] flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#111]">
                  <span className="font-semibold">{reporte.arreglables}</span> con el grupo roto
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
                {solos.map((e) => (
                  <li key={e.id} className="px-3 py-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#111] truncate">{e.nombre}</p>
                      <p className="text-[9px] text-[#aaa] font-mono">{e.sku} · {e.tablaLabel}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#888]">{TEXTO_MOTIVO[e.motivo]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Los que tienen el grupo bien: hay que ir a abrir el principal. */}
          {aMano.length > 0 && (
            <div className="border border-[#E0DED8] rounded-sm overflow-hidden">
              <div className="px-3 py-2 bg-[#F7F6F3] border-b border-[#E0DED8]">
                <p className="text-[11px] text-[#111]">
                  <span className="font-semibold">{aMano.length}</span> escondidos detrás de su producto principal
                  {reporte.principalApagado > 0 && ` · ${reporte.principalApagado} con el principal inactivo`}
                  {reporte.principalSinFoto > 0 && ` · ${reporte.principalSinFoto} con el principal sin foto`}
                  {reporte.sinBoton > 0 && ` · ${reporte.sinBoton} sin un botón que lleve a ellas`}
                </p>
                <p className="text-[10px] text-[#888] mt-0.5">
                  El grupo está bien armado, así que el botón no las toca. Se arreglan prendiendo el
                  principal, dándole una foto, o escribiendo en cada variante el valor que de verdad
                  la distingue —si todas dicen lo mismo, la ficha no puede dibujar el selector—.
                </p>
              </div>
              <ul className="divide-y divide-[#F0EEE8] max-h-64 overflow-y-auto">
                {aMano.map((e) => (
                  <li key={e.id} className="px-3 py-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#111] truncate">{e.nombre}</p>
                      <p className="text-[9px] text-[#aaa] font-mono">{e.sku} · {e.tablaLabel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-[#888]">{TEXTO_MOTIVO[e.motivo]}</p>
                      <Link
                        href={`/panel?buscar=${encodeURIComponent(e.varianteDe)}`}
                        className="inline-flex items-center gap-1 text-[10px] text-[#DF8635] hover:underline"
                      >
                        <FiExternalLink size={9} /> {e.principal}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reporte.total > reporte.ejemplos.length && (
            <p className="text-[10px] text-[#bbb]">
              Se muestran los primeros {reporte.ejemplos.length} de {reporte.total}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
