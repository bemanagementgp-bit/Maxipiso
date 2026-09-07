"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiUpload, FiLoader, FiAlertCircle, FiCheck, FiExternalLink } from "react-icons/fi";
import { hrefDeLinea, type LineaHome } from "@/lib/lineas-home";

/**
 * Portadas del home.
 *
 * Se muestra cada línea como se ve en la página —la foto en 4/3 con el rótulo
 * encima— y no como una fila de tabla: lo que se está editando es una imagen, y
 * quien la cambia tiene que ver cómo queda antes de guardar.
 *
 * Cada card se guarda sola. No hay alta ni baja: las líneas son las 8
 * categorías del catálogo, así que para sacar una del home se la apaga.
 */

const input =
  "w-full px-2.5 py-1.5 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#DF8635] rounded-sm";
const label = "block text-[9px] uppercase tracking-[0.08em] text-[#aaa] mb-1";

type Estado = { original: LineaHome; borrador: LineaHome };

function cambiada({ original, borrador }: Estado): boolean {
  return (
    original.label !== borrador.label ||
    original.imagenUrl !== borrador.imagenUrl ||
    original.orden !== borrador.orden ||
    original.isActive !== borrador.isActive
  );
}

export default function PortadasPage() {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const archivosRef = useRef<Record<string, HTMLInputElement | null>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // `todos=1`: el panel también ve las apagadas, para poder reactivarlas.
      const res = await fetch("/api/lineas?todos=1", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar");
      setEstados(
        (json.data.lineas as LineaHome[]).map((l) => ({ original: l, borrador: { ...l } })),
      );
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

  const editar = (slug: string, cambios: Partial<LineaHome>) => {
    setEstados((prev) =>
      prev.map((e) => (e.borrador.slug === slug ? { ...e, borrador: { ...e.borrador, ...cambios } } : e)),
    );
  };

  /** Sube la foto y la deja en el borrador. Reusa el endpoint de las imágenes de producto. */
  const subirImagen = async (slug: string, file: File) => {
    setSubiendo(slug);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? `El servidor rechazó la imagen (HTTP ${res.status})`);
      editar(slug, { imagenUrl: json.data.url });
      setAviso("Foto subida. Todavía falta guardar la card.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(null);
      const campo = archivosRef.current[slug];
      if (campo) campo.value = "";
    }
  };

  const guardar = async (borrador: LineaHome) => {
    setGuardando(borrador.slug);
    setError("");
    try {
      const res = await fetch(`/api/lineas/${borrador.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: borrador.label,
          imagenUrl: borrador.imagenUrl,
          orden: borrador.orden,
          isActive: borrador.isActive,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar");
      const guardada = json.data as LineaHome;
      setEstados((prev) =>
        prev.map((e) =>
          e.borrador.slug === guardada.slug ? { original: guardada, borrador: { ...guardada } } : e,
        ),
      );
      setAviso("Portada actualizada. Ya se ve en la página principal.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Portadas del home</h1>
        <p className="text-[12px] text-[#888] mt-1">
          Las 8 cards de <span className="text-[#555]">Nuestras líneas de productos</span> en la
          página principal. Cambiá la foto, el rótulo o el orden y guardá: el cambio se ve al
          instante.
        </p>
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

      {cargando ? (
        <div className="flex items-center gap-2 text-[12px] text-[#888] py-10">
          <FiLoader size={14} className="animate-spin" /> Cargando portadas…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {estados.map((estado) => {
            const { borrador } = estado;
            const sucia = cambiada(estado);
            const esteSubiendo = subiendo === borrador.slug;
            return (
              <div
                key={borrador.slug}
                className={`border bg-white ${sucia ? "border-[#DF8635]" : "border-[#E0DED8]"}`}
              >
                {/* Vista previa con el mismo aspecto que la card del home. */}
                <div
                  className={`relative bg-[#FAFAF8] overflow-hidden ${borrador.isActive ? "" : "opacity-40"}`}
                  style={{ aspectRatio: "4/3" }}
                >
                  {borrador.imagenUrl ? (
                    // `img` crudo: es una vista previa del panel, no vale la
                    // pena pasarla por el optimizador de Next.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={borrador.imagenUrl}
                      alt={borrador.label}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#ccc]">
                      sin foto
                    </div>
                  )}
                  <div className="absolute inset-x-0 top-0 px-3 pt-3">
                    <span className="inline-block bg-white/85 px-2 py-1 font-black uppercase text-[10px] text-[#1a1a1a] tracking-[0.06em]">
                      {borrador.label || "sin rótulo"}
                    </span>
                  </div>
                  {!borrador.isActive && (
                    <div className="absolute inset-x-0 bottom-0 bg-[#111] text-white text-[9px] uppercase tracking-[0.08em] text-center py-1">
                      no se muestra
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[10px] text-[#aaa]">{borrador.slug}</code>
                    <a
                      href={hrefDeLinea(borrador.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-[#888] hover:text-[#DF8635] transition-colors"
                      title="Ver la categoría en el catálogo"
                    >
                      catálogo <FiExternalLink size={10} />
                    </a>
                  </div>

                  <div>
                    <label className={label}>Rótulo</label>
                    <input
                      value={borrador.label}
                      onChange={(e) => editar(borrador.slug, { label: e.target.value })}
                      className={input}
                    />
                  </div>

                  <div>
                    <label className={label}>Foto</label>
                    <div className="flex gap-2">
                      <input
                        value={borrador.imagenUrl}
                        onChange={(e) => editar(borrador.slug, { imagenUrl: e.target.value })}
                        placeholder="https://…"
                        className={input}
                      />
                      <button
                        type="button"
                        onClick={() => archivosRef.current[borrador.slug]?.click()}
                        disabled={esteSubiendo}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors disabled:opacity-50"
                        title="Subir una foto desde la compu"
                      >
                        {esteSubiendo ? <FiLoader size={12} className="animate-spin" /> : <FiUpload size={12} />}
                        Subir
                      </button>
                      <input
                        ref={(el) => { archivosRef.current[borrador.slug] = el; }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) subirImagen(borrador.slug, f);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="w-16">
                      <label className={label}>Orden</label>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={borrador.orden}
                        onChange={(e) => editar(borrador.slug, { orden: Number(e.target.value) })}
                        className={input}
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#555] pb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={borrador.isActive}
                        onChange={(e) => editar(borrador.slug, { isActive: e.target.checked })}
                        className="accent-[#DF8635]"
                      />
                      Se muestra
                    </label>
                    <button
                      type="button"
                      onClick={() => guardar(borrador)}
                      disabled={!sucia || guardando === borrador.slug}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#111] text-white text-[11px] hover:bg-[#DF8635] transition-colors disabled:opacity-30 disabled:hover:bg-[#111]"
                    >
                      {guardando === borrador.slug ? (
                        <FiLoader size={12} className="animate-spin" />
                      ) : (
                        <FiCheck size={12} />
                      )}
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
