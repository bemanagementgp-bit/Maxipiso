"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiSearch, FiX, FiLoader } from "react-icons/fi";

/**
 * Elige a mano los productos complementarios de un producto.
 *
 * Es un buscador y no un desplegable porque el catálogo tiene miles de filas:
 * lo que se busca es un zócalo puntual, no "el primero de la lista". Y muestra
 * la foto de cada uno, porque quien carga reconoce el producto por la foto
 * antes que por el SKU.
 *
 * Se pueden elegir de cualquier categoría: el complemento de un piso suele ser
 * un accesorio, pero también puede ser un revestimiento.
 */

type Elegido = { id: string; nombre: string; sku: string; imagen: string | null; categoria: string };

type Props = {
  /** Ids ya elegidos, en el orden en que se muestran en la ficha. */
  elegidos: string[];
  onChange: (ids: string[]) => void;
  /** Se excluye de los resultados: un producto no se complementa a sí mismo. */
  productoActualId?: string | null;
};

function primeraImagen(crudo: unknown): string | null {
  const texto = String(crudo ?? "").trim();
  if (!texto) return null;
  try {
    const arr = JSON.parse(texto);
    return Array.isArray(arr) && arr[0] ? String(arr[0]) : null;
  } catch {
    return texto.split(/[;,]/)[0]?.trim() || null;
  }
}

function aElegido(p: Record<string, unknown>): Elegido {
  return {
    id: String(p.id),
    nombre: String(p.nombre ?? p.especie ?? p.sku ?? ""),
    sku: String(p.sku ?? ""),
    imagen: primeraImagen(p.imagenes),
    categoria: String(p._tablaLabel ?? ""),
  };
}

export default function ComplementariosPicker({ elegidos, onChange, productoActualId }: Props) {
  const [detalle, setDetalle] = useState<Record<string, Elegido>>({});
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<Elegido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Trae el nombre y la foto de los ids ya guardados.
   *
   * Sin esto, al abrir un producto ya cargado se verían ids crudos. Se piden
   * una sola vez por id: `detalle` se acumula y nunca se limpia mientras el
   * panel esté abierto.
   */
  const cargarFaltantes = useCallback(async (ids: string[]) => {
    const faltan = ids.filter((id) => !detalle[id]);
    if (faltan.length === 0) return;
    const traidos = await Promise.all(
      faltan.map(async (id) => {
        try {
          const r = await fetch(`/api/productos/${id}`);
          if (!r.ok) return null;
          const d = await r.json();
          return d?.data ? aElegido(d.data) : null;
        } catch {
          return null;
        }
      }),
    );
    const nuevos: Record<string, Elegido> = {};
    for (const p of traidos) if (p) nuevos[p.id] = p;
    if (Object.keys(nuevos).length > 0) setDetalle((prev) => ({ ...prev, ...nuevos }));
  }, [detalle]);

  useEffect(() => { cargarFaltantes(elegidos); }, [elegidos, cargarFaltantes]);

  // Buscar mientras se tipea, con un respiro: sin el debounce cada tecla
  // dispara una consulta a las 8 tablas.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = consulta.trim();
    if (q.length < 2) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/productos?search=${encodeURIComponent(q)}&take=8&skip=0`);
        const d = await r.json();
        const filas: Record<string, unknown>[] = d?.productos ?? d?.data?.productos ?? [];
        setResultados(filas.map(aElegido).filter((p) => p.id !== productoActualId));
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [consulta, productoActualId]);

  const agregar = (p: Elegido) => {
    setDetalle((prev) => ({ ...prev, [p.id]: p }));
    if (!elegidos.includes(p.id)) onChange([...elegidos, p.id]);
    setConsulta("");
    setResultados([]);
  };

  const quitar = (id: string) => onChange(elegidos.filter((x) => x !== id));

  return (
    <div>
      {elegidos.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {elegidos.map((id) => {
            const p = detalle[id];
            return (
              <div key={id} className="flex items-center gap-2 px-2 py-1.5 border border-[#E0DED8] bg-white rounded-sm">
                {p?.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagen} alt="" className="w-7 h-7 object-cover rounded-sm shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 bg-[#F0EEE8] rounded-sm shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#111] truncate leading-tight">{p?.nombre ?? "cargando…"}</p>
                  <p className="text-[9px] text-[#aaa] truncate">
                    {p?.sku}{p?.categoria ? ` · ${p.categoria}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(id)}
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

      <div className="relative">
        <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#ccc]" />
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar por SKU o nombre…"
          className="w-full pl-7 pr-7 py-1.5 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#DF8635] rounded-sm"
        />
        {buscando && <FiLoader size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#ccc] animate-spin" />}
      </div>

      {resultados.length > 0 && (
        <div className="mt-1 border border-[#E0DED8] bg-white rounded-sm max-h-52 overflow-y-auto">
          {resultados.map((p) => {
            const yaEsta = elegidos.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={yaEsta}
                onClick={() => agregar(p)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#FAFAF8] disabled:opacity-40 disabled:hover:bg-transparent border-b border-[#F0EEE8] last:border-0"
              >
                {p.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagen} alt="" className="w-7 h-7 object-cover rounded-sm shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 bg-[#F0EEE8] rounded-sm shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#111] truncate leading-tight">{p.nombre}</p>
                  <p className="text-[9px] text-[#aaa] truncate">{p.sku}{p.categoria ? ` · ${p.categoria}` : ""}</p>
                </div>
                {yaEsta && <span className="text-[9px] text-[#aaa] shrink-0">ya está</span>}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-1.5 text-[9px] text-[#bbb] leading-relaxed">
        Aparecen en la ficha, arriba de &ldquo;Productos Similares&rdquo;. Si no elegís ninguno,
        la sección no se muestra.
      </p>
    </div>
  );
}
