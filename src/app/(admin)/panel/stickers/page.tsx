"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiPlus, FiTrash2, FiUpload, FiLoader, FiAlertCircle, FiCheck, FiDownloadCloud } from "react-icons/fi";
import {
  COLOR_FONDO_DEFECTO,
  COLOR_TEXTO_DEFECTO,
  ESCALAS,
  ESCALA_DEFECTO,
  POSICIONES,
  type PosicionSticker,
  type Sticker,
  type TipoSticker,
} from "@/lib/stickers";

/**
 * ABM de stickers.
 *
 * La lista es una tabla y no un formulario grande a propósito: son etiquetas
 * cortas y lo que más se hace es mirarlas todas juntas, cambiarle el color a una
 * y apagar otra. Cada fila se edita en el lugar y se guarda sola.
 */

type Borrador = {
  nombre: string;
  tipo: TipoSticker;
  imagenUrl: string;
  texto: string;
  colorFondo: string;
  colorTexto: string;
  posicion: PosicionSticker;
  orden: number;
  escala: number;
  isActive: boolean;
};

const VACIO: Borrador = {
  nombre: "",
  tipo: "texto",
  imagenUrl: "",
  texto: "",
  colorFondo: COLOR_FONDO_DEFECTO,
  colorTexto: COLOR_TEXTO_DEFECTO,
  posicion: "arriba-izq",
  orden: 0,
  escala: ESCALA_DEFECTO,
  isActive: true,
};

/**
 * Medidas recomendadas del archivo.
 *
 * El sticker se dibuja a 36 px de alto como maximo, y al 200% a 72: 200 px deja
 * margen para pantallas retina sin que el archivo pese de mas. El ancho sale
 * solo, porque lo que se fija es el alto.
 */
const MEDIDAS_SUGERIDAS = "PNG con fondo transparente, 200 px de alto (el ancho, el que quede). Hasta 5 MB.";

const input =
  "w-full px-2.5 py-1.5 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#DF8635] rounded-sm";
const label = "block text-[9px] uppercase tracking-[0.08em] text-[#aaa] mb-1";

/**
 * Como se va a ver sobre la foto.
 *
 * Aplica la escala igual que `StickerOverlay`, asi que subir el tamano se ve
 * en el panel sin tener que ir al catalogo a mirar un producto.
 */
function Vista({ s }: { s: Borrador }) {
  const f = (s.escala || ESCALA_DEFECTO) / 100;
  if (s.tipo === "imagen") {
    return s.imagenUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.imagenUrl}
        alt=""
        className="w-auto object-contain"
        style={{ height: `${28 * f}px` }}
        referrerPolicy="no-referrer"
      />
    ) : (
      <span className="text-[10px] text-[#ccc]">sin imagen</span>
    );
  }
  return (
    <span
      className="font-bold uppercase tracking-wide leading-none whitespace-nowrap"
      style={{
        backgroundColor: s.colorFondo || COLOR_FONDO_DEFECTO,
        color: s.colorTexto || COLOR_TEXTO_DEFECTO,
        fontSize: `${9 * f}px`,
        padding: `${2 * f}px ${8 * f}px`,
        borderRadius: `${4 * f}px`,
      }}
    >
      {s.texto || s.nombre || "etiqueta"}
    </span>
  );
}

export default function StickersPage() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [nuevo, setNuevo] = useState<Borrador>(VACIO);
  const [creando, setCreando] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  /** Id de la fila que esta subiendo, o "nuevo" para el alta. */
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [cargandoSugeridos, setCargandoSugeridos] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // `todos=1`: el panel necesita ver también los apagados para reactivarlos.
      const res = await fetch("/api/stickers?todos=1", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar");
      setStickers(json.data.stickers);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  /**
   * Sube el PNG y entrega la URL a quien la haya pedido. Reusa el mismo endpoint
   * que las fotos de producto.
   *
   * Recibe el destino como callback porque suben tanto el alta como cada fila
   * de la tabla: sin eso, un sticker ya creado no podia cambiar su imagen.
   */
  const subirImagen = async (file: File, destino: (url: string) => void, quien: string) => {
    setSubiendo(quien);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `El servidor rechazó la imagen (HTTP ${res.status})`);
      destino(json.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(null);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  /**
   * Carga los diez stickers iniciales.
   *
   * Los ids son fijos, asi que apretarlo dos veces no duplica nada ni pisa lo
   * que se haya editado a mano: solo agrega los que falten.
   */
  const cargarSugeridos = async () => {
    setCargandoSugeridos(true);
    setError("");
    try {
      const res = await fetch("/api/stickers/sugeridos", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar");
      const { creados, yaEstaban } = json.data;
      setAviso(
        creados === 0
          ? "Ya estaban todos cargados."
          : `${creados} sticker${creados === 1 ? "" : "s"} cargado${creados === 1 ? "" : "s"}` +
            (yaEstaban > 0 ? ` (${yaEstaban} ya estaban).` : "."),
      );
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setCargandoSugeridos(false);
    }
  };

  const crear = async () => {
    setCreando(true);
    setError("");
    try {
      const res = await fetch("/api/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo crear");
      setNuevo(VACIO);
      setAviso("Sticker creado");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setCreando(false);
    }
  };

  const guardar = async (s: Sticker) => {
    setGuardandoId(s.id);
    setError("");
    try {
      const res = await fetch(`/api/stickers/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar");
      setAviso(`"${s.nombre}" guardado`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardandoId(null);
    }
  };

  const borrar = async (id: string) => {
    try {
      const res = await fetch(`/api/stickers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "No se pudo borrar");
      setConfirmarBorrar(null);
      setAviso("Sticker borrado");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar");
    }
  };

  const editar = (id: string, cambios: Partial<Sticker>) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1320px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
        <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Stickers</h1>
        <p className="text-[12px] text-[#888] mt-1">
          Etiquetas que se dibujan encima de la foto de portada. Se eligen por producto al
          cargarlo, en la sección <span className="text-[#555]">Stickers sobre la foto</span>.
        </p>
        </div>
        <button
          type="button"
          onClick={cargarSugeridos}
          disabled={cargandoSugeridos}
          title="Crea los 10 stickers iniciales. Repetirlo no duplica nada."
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors disabled:opacity-50"
        >
          {cargandoSugeridos ? <FiLoader size={12} className="animate-spin" /> : <FiDownloadCloud size={12} />}
          Cargar los 10 sugeridos
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2 border border-red-200 bg-red-50 text-[12px] text-red-700">
          <FiAlertCircle size={14} className="shrink-0 mt-px" /> {error}
        </div>
      )}
      {aviso && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 text-[12px] text-[#111]">
          <FiCheck size={14} className="text-emerald-600" /> {aviso}
        </div>
      )}

      {/* Alta */}
      <div className="border border-[#E0DED8] bg-white p-4 mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888] mb-3">
          Nuevo sticker
        </h2>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className={label}>Nombre</label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Bandera de Alemania"
              className={input}
            />
          </div>

          <div>
            <label className={label}>Tipo</label>
            <select
              value={nuevo.tipo}
              onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoSticker })}
              className={input}
            >
              <option value="texto">Etiqueta de texto</option>
              <option value="imagen">Imagen</option>
            </select>
          </div>

          {nuevo.tipo === "texto" ? (
            <>
              <div className="w-32">
                <label className={label}>Texto</label>
                <input
                  value={nuevo.texto}
                  onChange={(e) => setNuevo({ ...nuevo, texto: e.target.value })}
                  placeholder="OFERTA"
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Fondo</label>
                <input
                  type="color"
                  value={nuevo.colorFondo}
                  onChange={(e) => setNuevo({ ...nuevo, colorFondo: e.target.value })}
                  className="h-[30px] w-12 border border-[#E0DED8] rounded-sm cursor-pointer"
                />
              </div>
              <div>
                <label className={label}>Texto</label>
                <input
                  type="color"
                  value={nuevo.colorTexto}
                  onChange={(e) => setNuevo({ ...nuevo, colorTexto: e.target.value })}
                  className="h-[30px] w-12 border border-[#E0DED8] rounded-sm cursor-pointer"
                />
              </div>
            </>
          ) : (
            <div>
              <label className={label}>Imagen</label>
              <label
                title={MEDIDAS_SUGERIDAS}
                className="flex items-center gap-2 h-[30px] px-3 border border-dashed border-[#E0DED8] hover:border-[#aaa] cursor-pointer rounded-sm"
              >
                {subiendo === "nuevo" ? <FiLoader size={12} className="animate-spin" /> : <FiUpload size={12} className="text-[#ccc]" />}
                <span className="text-[10px] uppercase tracking-[0.06em] text-[#999]">
                  {subiendo === "nuevo" ? "Subiendo..." : nuevo.imagenUrl ? "Cambiar" : "Subir"}
                </span>
                <input
                  ref={archivoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) subirImagen(f, (url) => setNuevo((p) => ({ ...p, tipo: "imagen", imagenUrl: url })), "nuevo");
                  }}
                />
              </label>
            </div>
          )}

          <div>
            <label className={label}>Esquina</label>
            <select
              value={nuevo.posicion}
              onChange={(e) => setNuevo({ ...nuevo, posicion: e.target.value as PosicionSticker })}
              className={input}
            >
              {POSICIONES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className={label}>Tamaño</label>
            <select
              value={nuevo.escala}
              onChange={(e) => setNuevo({ ...nuevo, escala: Number(e.target.value) })}
              className={input}
            >
              {ESCALAS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 min-h-[30px] py-1 border border-[#E0DED8] bg-[#FAFAF8] rounded-sm">
            <span className="text-[9px] uppercase tracking-[0.06em] text-[#aaa]">Se ve así</span>
            <Vista s={nuevo} />
          </div>

          <button
            onClick={crear}
            disabled={creando || subiendo !== null}
            className="flex items-center gap-1.5 h-[30px] px-4 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm"
          >
            {creando ? <FiLoader size={12} className="animate-spin" /> : <FiPlus size={12} />}
            Crear
          </button>
        </div>

        <p className="mt-3 text-[10px] text-[#bbb]">
          Imagen: {MEDIDAS_SUGERIDAS}
        </p>
      </div>

      {/* Listado */}
      <div className="border border-[#E0DED8] bg-white overflow-x-auto">
        {cargando ? (
          <div className="px-4 py-10 text-center text-[12px] text-[#999]">Cargando...</div>
        ) : stickers.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-[#999]">
            Todavía no hay stickers. Creá el primero acá arriba.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#E0DED8] text-[10px] uppercase tracking-[0.06em] text-[#888]">
                <th className="text-left px-3 py-2.5">Vista</th>
                <th className="text-left px-3 py-2.5">Nombre</th>
                <th className="text-left px-3 py-2.5">Tipo</th>
                <th className="text-left px-3 py-2.5">Texto / imagen</th>
                <th className="text-left px-3 py-2.5">Colores</th>
                <th className="text-left px-3 py-2.5">Esquina</th>
                <th className="text-left px-3 py-2.5">Tamaño</th>
                <th className="text-left px-3 py-2.5 w-16">Orden</th>
                <th className="text-left px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {stickers.map((s) => (
                <tr key={s.id} className="border-b border-[#F0EEE9] hover:bg-[#FAFAF8]">
                  <td className="px-3 py-2">
                    <Vista s={{ ...VACIO, ...s, imagenUrl: s.imagenUrl ?? "", texto: s.texto ?? "", colorFondo: s.colorFondo ?? "", colorTexto: s.colorTexto ?? "" }} />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={s.nombre}
                      onChange={(e) => editar(s.id, { nombre: e.target.value })}
                      className={`${input} w-36`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* Cambiar de tipo no borra el otro lado: el texto y la URL
                        se guardan los dos, y se dibuja el que diga `tipo`. */}
                    <select
                      value={s.tipo}
                      onChange={(e) => editar(s.id, { tipo: e.target.value as TipoSticker })}
                      className={`${input} w-[104px]`}
                    >
                      <option value="texto">Texto</option>
                      <option value="imagen">Imagen</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {s.tipo === "imagen" ? (
                      <div className="flex items-center gap-2">
                        <label
                          title={MEDIDAS_SUGERIDAS}
                          className="shrink-0 flex items-center gap-1.5 h-[28px] px-2 border border-dashed border-[#E0DED8] hover:border-[#aaa] cursor-pointer rounded-sm"
                        >
                          {subiendo === s.id ? <FiLoader size={11} className="animate-spin" /> : <FiUpload size={11} className="text-[#ccc]" />}
                          <span className="text-[10px] uppercase tracking-[0.06em] text-[#999]">
                            {subiendo === s.id ? "Subiendo..." : s.imagenUrl ? "Cambiar" : "Subir"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) subirImagen(f, (url) => editar(s.id, { imagenUrl: url }), s.id);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-[#bbb] font-mono truncate max-w-[110px]" title={s.imagenUrl ?? ""}>
                          {(s.imagenUrl ?? "").split("/").pop() || "sin archivo"}
                        </span>
                      </div>
                    ) : (
                      <input
                        value={s.texto ?? ""}
                        onChange={(e) => editar(s.id, { texto: e.target.value })}
                        placeholder="OFERTA"
                        className={`${input} w-28`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {s.tipo === "texto" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={s.colorFondo ?? COLOR_FONDO_DEFECTO}
                          onChange={(e) => editar(s.id, { colorFondo: e.target.value })}
                          className="h-6 w-8 border border-[#E0DED8] rounded-sm cursor-pointer"
                          title="Fondo"
                        />
                        <input
                          type="color"
                          value={s.colorTexto ?? COLOR_TEXTO_DEFECTO}
                          onChange={(e) => editar(s.id, { colorTexto: e.target.value })}
                          className="h-6 w-8 border border-[#E0DED8] rounded-sm cursor-pointer"
                          title="Texto"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#ccc]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.posicion}
                      onChange={(e) => editar(s.id, { posicion: e.target.value as PosicionSticker })}
                      className={`${input} w-40`}
                    >
                      {POSICIONES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.escala}
                      onChange={(e) => editar(s.id, { escala: Number(e.target.value) })}
                      className={`${input} w-32`}
                    >
                      {ESCALAS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={s.orden}
                      onChange={(e) => editar(s.id, { orden: Number(e.target.value) })}
                      className={`${input} w-14`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => editar(s.id, { isActive: !s.isActive })}
                      className={`px-2 py-1 text-[10px] rounded-sm border ${
                        s.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#E0DED8] bg-[#FAFAF8] text-[#999]"
                      }`}
                    >
                      {s.isActive ? "Activo" : "Apagado"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {confirmarBorrar === s.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => borrar(s.id)} className="px-2 py-1 text-[10px] text-white bg-red-600 hover:bg-red-700 rounded-sm">
                          Borrar
                        </button>
                        <button onClick={() => setConfirmarBorrar(null)} className="px-2 py-1 text-[10px] text-[#777] hover:text-[#111]">
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => guardar(s)}
                          disabled={guardandoId === s.id}
                          className="px-2.5 py-1 text-[10px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm"
                        >
                          {guardandoId === s.id ? "..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => setConfirmarBorrar(s.id)}
                          title="Borrar"
                          className="p-1 text-[#ccc] hover:text-red-500"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-[10px] text-[#bbb] leading-relaxed">
        Apagar un sticker lo saca de todos los productos sin perder la configuración. Borrarlo
        también lo saca, y los productos que lo tenían simplemente dejan de mostrarlo.
      </p>
    </div>
  );
}
