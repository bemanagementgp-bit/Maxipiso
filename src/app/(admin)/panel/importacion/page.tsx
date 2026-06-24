"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiX, FiFile, FiDownload, FiChevronDown } from "react-icons/fi";

type Step = "idle" | "preview" | "importing" | "done" | "error";
type Toast = { id: number; type: "success" | "error"; message: string };

const PASOS = [
  { n: 1, label: "Preparar la plantilla",   desc: "Descargá el modelo Excel con las columnas requeridas" },
  { n: 2, label: "Completar los datos",      desc: "Completá SKU, nombre, marca y precio en cada fila" },
  { n: 3, label: "Subir el archivo",         desc: "Arrastrá el archivo o hacé click en el área de carga" },
  { n: 4, label: "Confirmar los cambios",    desc: "Revisá el resumen y confirmá la importación" },
];

function tiempoRelativo(fecha: Date) {
  const diff = (Date.now() - new Date(fecha).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
  return `hace ${Math.round(diff / 86400)} d`;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 text-[12px] font-medium text-white min-w-[300px] shadow-lg ${t.type === "success" ? "bg-[#111]" : "bg-red-600"}`}>
          {t.type === "success" ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity"><FiX size={13} /></button>
        </div>
      ))}
    </div>
  );
}

export default function ImportacionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<any>(null);
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [infoOpen, setInfoOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("import_info_seen") !== "1";
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    fetch("/api/reportes/importaciones")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSesiones(d.data.sesiones); })
      .catch(() => {});
  }, []);

  const selectFile = async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "xlsm"].includes(ext ?? "")) {
      addToast("error", "Solo se aceptan archivos Excel (.xlsx, .xls)");
      return;
    }
    setFile(f);
    setStep("preview");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/productos/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al analizar");
      setPreview(data.data);
    } catch (err: any) {
      addToast("error", err.message);
      setStep("idle");
      setFile(null);
    }
  };

  const resetFile = () => {
    setFile(null); setStep("idle"); setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleConfirmar = async () => {
    if (!file) return;
    setStep("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/productos/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      setStep("done");
      addToast("success", `Importación completada: ${data.data.createdCount} nuevos · ${data.data.updatedCount} actualizados`);
      fetch("/api/reportes/importaciones").then((r) => r.json()).then((d) => { if (d.success) setSesiones(d.data.sesiones); }).catch(() => {});
    } catch (err: any) {
      addToast("error", err.message);
      setStep("error");
    }
  };

  const totals = preview?.totals;
  const activeStep = step === "idle" ? 3 : step === "preview" ? 4 : 4;
  const canConfirm = !!preview && step === "preview" && ((totals?.create ?? 0) + (totals?.update ?? 0)) > 0;

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Importación masiva</h1>
          <p className="text-[11px] text-[#aaa] mt-1">Cargá o actualizá productos en lote desde un archivo Excel</p>
        </div>
        <a
          href="/plantilla-importacion.xlsx"
          download
          className="flex items-center gap-1.5 h-8 px-3.5 text-[11px] font-medium text-[#555] border border-[#E0DED8] bg-white hover:border-[#999] hover:text-[#111] transition-all rounded-sm"
        >
          <FiDownload size={12} />
          Descargar plantilla
        </a>
      </div>

      {/* ── Bloque principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* Drop zone */}
        <div className="bg-white border border-[#E0DED8] flex flex-col">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) selectFile(f); }}
            onClick={() => step === "idle" && inputRef.current?.click()}
            className={`flex-1 flex flex-col items-center justify-center m-5 border-2 border-dashed transition-all rounded-sm min-h-[280px] ${
              dragging
                ? "border-[#DF8635] bg-[#FFF8F0] cursor-copy"
                : step === "done"
                ? "border-emerald-300 bg-emerald-50"
                : step === "error"
                ? "border-red-200 bg-red-50"
                : file
                ? "border-[#D0CEC8] bg-[#FAFAF8]"
                : "border-[#D0CEC8] hover:border-[#DF8635]/60 hover:bg-[#FFFCFA] cursor-pointer"
            }`}
          >
            {step === "done" ? (
              <>
                <FiCheckCircle size={40} className="text-emerald-500 mb-4" />
                <p className="text-[14px] font-medium text-emerald-700">Importación completada</p>
                <button onClick={resetFile} className="mt-4 text-[11px] text-[#aaa] hover:text-[#555] underline underline-offset-2 transition-colors">
                  Cargar otro archivo
                </button>
              </>
            ) : step === "error" ? (
              <>
                <FiAlertCircle size={40} className="text-red-400 mb-4" />
                <p className="text-[14px] font-medium text-red-600">Error en la importación</p>
                <button onClick={resetFile} className="mt-4 text-[11px] text-[#aaa] hover:text-[#555] underline underline-offset-2 transition-colors">
                  Intentar de nuevo
                </button>
              </>
            ) : step === "importing" ? (
              <>
                <div className="w-9 h-9 border-2 border-[#111]/20 border-t-[#111] rounded-full animate-spin mb-5" />
                <p className="text-[14px] font-medium text-[#111]">Importando productos...</p>
                <p className="text-[12px] text-[#aaa] mt-1.5">No cerrés esta ventana</p>
              </>
            ) : file ? (
              <>
                <FiFile size={36} className="text-[#DF8635] mb-4" />
                <p className="text-[14px] font-semibold text-[#111]">{file.name}</p>
                <p className="text-[11px] text-[#aaa] mt-1">
                  {(file.size / 1024).toFixed(0)} KB
                  {preview && ` · ${(totals?.create ?? 0) + (totals?.update ?? 0) + (totals?.skip ?? 0)} filas detectadas`}
                </p>
                {preview && (
                  <div className="mt-6 flex gap-3">
                    {(totals?.create ?? 0) > 0 && (
                      <div className="px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-sm text-center">
                        <div className="text-[22px] font-semibold text-emerald-700 tabular-nums leading-none">{totals.create}</div>
                        <div className="text-[9px] uppercase tracking-[0.08em] text-emerald-600 mt-1.5">Nuevos</div>
                      </div>
                    )}
                    {(totals?.update ?? 0) > 0 && (
                      <div className="px-5 py-3 bg-amber-50 border border-amber-200 rounded-sm text-center">
                        <div className="text-[22px] font-semibold text-amber-700 tabular-nums leading-none">{totals.update}</div>
                        <div className="text-[9px] uppercase tracking-[0.08em] text-amber-600 mt-1.5">Actualizaciones</div>
                      </div>
                    )}
                    {(totals?.skip ?? 0) > 0 && (
                      <div className="px-5 py-3 bg-[#F0EEE8] border border-[#DDD] rounded-sm text-center">
                        <div className="text-[22px] font-semibold text-[#999] tabular-nums leading-none">{totals.skip}</div>
                        <div className="text-[9px] uppercase tracking-[0.08em] text-[#bbb] mt-1.5">Omitidos</div>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={resetFile} className="mt-5 text-[11px] text-[#bbb] hover:text-[#555] underline underline-offset-2 transition-colors">
                  Cambiar archivo
                </button>
              </>
            ) : (
              <>
                <FiUploadCloud size={44} className="text-[#C8C6C0] mb-4" />
                <p className="text-[15px] font-medium text-[#555]">Arrastrá tu archivo aquí</p>
                <p className="text-[12px] text-[#bbb] mt-1.5">
                  o <span className="text-[#DF8635] underline underline-offset-2 cursor-pointer">hacé click para seleccionar</span>
                </p>
                <p className="text-[10px] text-[#ccc] mt-4 uppercase tracking-[0.08em]">.xlsx · .xls · máx. 5 MB</p>
              </>
            )}
          </div>

          <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />

          {/* Footer del bloque */}
          <div className="px-5 pb-5 flex justify-end">
            <button
              onClick={handleConfirmar}
              disabled={!canConfirm}
              className="flex items-center gap-2 h-10 px-8 text-[12px] font-semibold text-white bg-[#111] hover:bg-[#2a2a2a] disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded-sm tracking-wide"
            >
              {step === "importing" && <div className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />}
              Importar productos
            </button>
          </div>
        </div>

        {/* Pasos + historial */}
        <div className="flex flex-col gap-4">

          {/* Pasos */}
          <div className="bg-white border border-[#E0DED8] px-6 py-6">
            <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#888] mb-5">Pasos para importar</p>
            <div className="space-y-5">
              {PASOS.map(({ n, label, desc }) => {
                const done = n < activeStep;
                const active = n === activeStep;
                return (
                  <div key={n} className="flex gap-3.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 transition-all ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-[#DF8635] text-white" : "bg-[#F0EEE8] text-[#ccc]"
                    }`}>
                      {done ? "✓" : n}
                    </div>
                    <div>
                      <p className={`text-[12px] font-semibold leading-tight ${active ? "text-[#111]" : done ? "text-[#777]" : "text-[#ccc]"}`}>{label}</p>
                      <p className={`text-[10px] mt-0.5 leading-snug ${active ? "text-[#888]" : "text-[#ccc]"}`}>{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimas importaciones */}
          <div className="bg-white border border-[#E0DED8] px-6 py-6 flex-1">
            <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#888] mb-4">Últimas importaciones</p>
            {sesiones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                <p className="text-[11px] text-[#ccc]">Sin registros aún</p>
                <p className="text-[10px] text-[#ddd]">Las importaciones aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-[#F0EEE8]">
                {sesiones.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#444] truncate">
                        {new Date(s.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" })}
                      </p>
                      <p className="text-[10px] text-[#bbb] mt-0.5">{tiempoRelativo(s.fecha)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[13px] font-semibold text-[#333] tabular-nums">{s.cantidad}</span>
                      <span className="text-[9px] bg-[#111] text-white px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-[0.04em]">
                        OK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Info de formato (colapsable) ── */}
      <div className="border border-[#E0DED8] bg-white overflow-hidden">
        <button
          onClick={() => {
            const next = !infoOpen;
            setInfoOpen(next);
            if (!next) localStorage.setItem("import_info_seen", "1");
          }}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#FAFAF8] transition-colors"
        >
          <span className="text-[11px] text-[#999] uppercase tracking-[0.08em]">Especificaciones del formato</span>
          <FiChevronDown
            size={14}
            className={`text-[#ccc] transition-transform duration-200 ${infoOpen ? "rotate-180" : ""}`}
          />
        </button>

        {infoOpen && (
          <div className="border-t border-[#E0DED8] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E0DED8]">
            {[
              {
                title: "Columnas requeridas",
                accent: true,
                items: ["SKU / Código", "Nombre del producto", "Marca", "Precio"],
              },
              {
                title: "Columnas opcionales",
                accent: false,
                items: ["Categoría", "Subcategoría", "Descripción", "Imagen (URL)"],
              },
              {
                title: "Consideraciones",
                accent: false,
                items: [
                  "Máximo 1.000 productos por archivo",
                  "Tamaño máximo: 5 MB",
                  "SKUs duplicados en el archivo son ignorados",
                  "SKUs existentes son actualizados",
                ],
              },
            ].map(({ title, accent, items }) => (
              <div key={title} className="px-7 py-5">
                <p className={`text-[9px] uppercase tracking-[0.12em] font-semibold mb-3.5 ${accent ? "text-[#DF8635]" : "text-[#888]"}`}>
                  {title}
                </p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[12px] text-[#555]">
                      <span className={`w-1 h-1 rounded-full shrink-0 mt-[6px] ${accent ? "bg-[#DF8635]" : "bg-[#ccc]"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
