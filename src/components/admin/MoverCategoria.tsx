"use client";

import { useEffect, useState } from "react";
import { FiLoader, FiAlertTriangle, FiArrowRight } from "react-icons/fi";

/**
 * Cambiar un producto de categoria, con el aviso de que se pierde.
 *
 * Las 8 categorias son 8 tablas, asi que esto no edita un campo: mueve la fila
 * de una a otra. Lo que la categoria nueva no tiene se pierde —la abrasion de
 * un piso flotante no existe en accesorios— y eso **se muestra antes**, con el
 * valor a la vista, igual que el detector de tonos y el de invisibles.
 *
 * Por eso no alcanzaba con destrabar el desplegable: elegir otra categoria
 * abre este cartel, y recien el boton de adentro mueve.
 */

type Plan = {
  destinoLabel: string;
  sePierden: { key: string; valor: string }[];
  precioMovido: { desde: string; hasta: string } | null;
  salioDelGrupo: boolean;
};

export default function MoverCategoria({
  productoId,
  destino,
  etiquetas,
  onCancelar,
  onMovido,
}: {
  productoId: string;
  /** Nombre de tabla de la categoria elegida. */
  destino: string;
  /** `key` de columna -> como se llama en el ABM, para nombrar lo que se pierde. */
  etiquetas: Record<string, string>;
  onCancelar: () => void;
  onMovido: (destino: string) => void;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [moviendo, setMoviendo] = useState(false);

  // Sin reset al empezar: el padre monta uno nuevo por destino (`key`), asi que
  // este siempre arranca en blanco. Resetear aca seria un `setState` sincrono
  // dentro del efecto, que es un render de mas por cada cambio.
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/productos/${productoId}/mover?destino=${encodeURIComponent(destino)}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.error ?? "No se pudo revisar el cambio");
        return j.data as Plan;
      })
      .then((d) => { if (!cancelado) setPlan(d); })
      .catch((e) => { if (!cancelado) setError(e instanceof Error ? e.message : "Error de red"); });
    return () => { cancelado = true; };
  }, [productoId, destino]);

  const mover = async () => {
    setMoviendo(true);
    setError("");
    try {
      const res = await fetch(`/api/productos/${productoId}/mover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destino }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? "No se pudo mover");
      onMovido(j.data.destinoLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setMoviendo(false);
    }
  };

  return (
    <div className="mt-2 border border-[#E0DED8] bg-[#FFF8F1] rounded-sm p-3">
      {error && (
        <div className="flex items-start gap-2 text-[11px] text-red-700">
          <FiAlertTriangle size={13} className="shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {!error && !plan && (
        <p className="flex items-center gap-2 text-[11px] text-[#888]">
          <FiLoader size={12} className="animate-spin" /> Revisando qué pasa con los datos…
        </p>
      )}

      {plan && !error && (
        <>
          <p className="text-[11px] text-[#111] font-medium">
            Mover a <span className="font-semibold">{plan.destinoLabel}</span>
          </p>

          {plan.sePierden.length > 0 ? (
            <>
              <p className="text-[10px] text-[#888] mt-1.5">
                {plan.destinoLabel} no tiene est{plan.sePierden.length === 1 ? "e campo" : "os campos"}, así que
                se {plan.sePierden.length === 1 ? "pierde" : "pierden"}:
              </p>
              <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                {plan.sePierden.map((c) => (
                  <li key={c.key} className="text-[10px] text-[#555]">
                    <span className="font-medium">{etiquetas[c.key] ?? c.key}</span>
                    <span className="text-[#aaa]"> · {c.valor}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[10px] text-[#888] mt-1.5">No se pierde ningún dato.</p>
          )}

          {plan.precioMovido && (
            <p className="text-[10px] text-[#555] mt-1.5 flex items-center gap-1">
              El precio pasa de <code className="text-[#111]">{plan.precioMovido.desde}</code>
              <FiArrowRight size={9} className="text-[#aaa]" />
              <code className="text-[#111]">{plan.precioMovido.hasta}</code>
            </p>
          )}

          {plan.salioDelGrupo && (
            <p className="text-[10px] text-amber-700 mt-1.5">
              Deja de ser variante: el grupo vive dentro de una categoría, así que allá pasa a ser
              un producto suelto con su propia card.
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={mover}
              disabled={moviendo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm transition-colors"
            >
              {moviendo ? <FiLoader size={12} className="animate-spin" /> : null}
              Mover
            </button>
            <button
              type="button"
              onClick={onCancelar}
              disabled={moviendo}
              className="px-3 py-1.5 text-[11px] text-[#888] hover:text-[#111] transition-colors"
            >
              Cancelar
            </button>
          </div>
          <p className="text-[9px] text-[#bbb] mt-2 leading-relaxed">
            Se guarda al mover, sin pasar por el botón de abajo. Las fotos, el SKU, el historial y
            el link del catálogo se conservan.
          </p>
        </>
      )}
    </div>
  );
}
