"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiSearch, FiX, FiLoader, FiPlus } from "react-icons/fi";
import { primeraImagen } from "@/lib/imagenes";

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

type Elegido = {
  id: string;
  nombre: string;
  sku: string;
  imagen: string | null;
  categoria: string;
  /** Con qué categorías dice servir. Ordena los sugeridos. */
  compatibleCon: string;
};

type Props = {
  /** Ids ya elegidos, en el orden en que se muestran en la ficha. */
  elegidos: string[];
  onChange: (ids: string[]) => void;
  /** Se excluye de los resultados: un producto no se complementa a sí mismo. */
  productoActualId?: string | null;
  /**
   * Categoría del producto que se está editando, como la muestra el panel.
   *
   * Ordena los sugeridos: un zócalo que dice servir para flotantes va antes que
   * uno de porcelanato cuando se está cargando un flotante.
   */
  categoriaActual?: string | null;
};

/**
 * De dónde salen los recomendados.
 *
 * El complemento de un piso es casi siempre un accesorio —el zócalo, la manta,
 * el perfil—, así que se ofrecen esos de entrada y no hay que acordarse de
 * ningún SKU para empezar. Buscar sigue estando para el resto.
 */
const CATEGORIA_RECOMENDADA = "accesorios";



function aElegido(p: Record<string, unknown>): Elegido {
  return {
    id: String(p.id),
    nombre: String(p.nombre ?? p.especie ?? p.sku ?? ""),
    sku: String(p.sku ?? ""),
    imagen: primeraImagen(p.imagenes),
    categoria: String(p._tablaLabel ?? ""),
    compatibleCon: String(p.compatibleCon ?? ""),
  };
}

export default function ComplementariosPicker({ elegidos, onChange, productoActualId, categoriaActual }: Props) {
  const [detalle, setDetalle] = useState<Record<string, Elegido>>({});
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<Elegido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [recomendados, setRecomendados] = useState<Elegido[]>([]);
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

  // Los accesorios activos, una sola vez al montar. Son pocos y se reusan en
  // cada producto que se carga, asi que no hace falta volver a pedirlos.
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/productos?tabla=${CATEGORIA_RECOMENDADA}&take=24&skip=0&estado=activo`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelado || !d) return;
        const filas: Record<string, unknown>[] = d?.productos ?? d?.data?.productos ?? [];
        setRecomendados(filas.map(aElegido));
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, []);

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

  /**
   * Sugeridos, los compatibles primero.
   *
   * `compatibleCon` es texto libre ("Pisos flotantes y vinílicos"), así que se
   * compara por prefijos de las palabras largas de la categoría: "flotantes"
   * → "flotan", que encuentra igual "flotante" y "Flotantes". Las palabras
   * cortas no sirven —"pisos" está en media docena de categorías— y por eso se
   * descartan.
   *
   * Es un orden, no un filtro: un accesorio sin `compatibleCon` cargado sigue
   * apareciendo, sólo que después. Con la columna vacía en casi todo el
   * catálogo, filtrar dejaría la lista en cero.
   */
  const recomendadosLibres = (() => {
    const libres = recomendados.filter((p) => p.id !== productoActualId && !elegidos.includes(p.id));
    const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const raices = sinTildes(categoriaActual ?? "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 5)
      .map((w) => w.slice(0, 6));
    if (raices.length === 0) return libres;
    const sirve = (p: Elegido) => {
      const texto = sinTildes(p.compatibleCon);
      return texto ? raices.some((r) => texto.includes(r)) : false;
    };
    return [...libres.filter(sirve), ...libres.filter((p) => !sirve(p))];
  })();

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

      {/* Recomendados: los accesorios, que son el complemento habitual. Van
          abajo del buscador y no arriba para no tapar lo ya elegido, y se
          esconden mientras se busca, que es cuando estorban. */}
      {consulta.trim().length < 2 && recomendadosLibres.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[#aaa] mb-1.5">
            Accesorios sugeridos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recomendadosLibres.slice(0, 12).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregar(p)}
                title={`${p.nombre} · ${p.sku}`}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 border border-[#E0DED8] hover:border-[#DF8635] bg-white transition-colors rounded-sm max-w-[190px]"
              >
                {p.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagen} alt="" className="w-5 h-5 object-cover rounded-sm shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-5 h-5 bg-[#F0EEE8] rounded-sm shrink-0" />
                )}
                <span className="text-[10px] text-[#555] truncate">{p.nombre}</span>
                <FiPlus size={10} className="text-[#ccc] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-1.5 text-[9px] text-[#bbb] leading-relaxed">
        Aparecen en la ficha, arriba de &ldquo;Productos Similares&rdquo;. Si no elegís ninguno,
        la sección no se muestra.
      </p>
    </div>
  );
}
