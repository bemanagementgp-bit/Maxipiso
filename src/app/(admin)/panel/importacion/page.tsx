"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiX, FiFile } from "react-icons/fi";

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
      // refrescar sesiones
      fetch("/api/reportes/importaciones").then((r) => r.json()).then((d) => { if (d.success) setSesiones(d.data.sesiones); }).catch(() => {});
    } catch (err: any) {
      addToast("error", err.message);
      setStep("error");
    }
  };

  const totals = preview?.totals;
  const activeStep = step === "idle" ? 3 : step === "preview" ? 4 : 4;

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-8">

      {/* Encabezado */}
      <div>
        <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Importación masiva</h1>
        <p className="text-[11px] text-[#aaa] mt-1">Cargá o actualizá productos en lote desde un archivo Excel</p>
      </div>

      {/* Bloque principal — drop zone + guía lateral */}
      <div className="bg-white border border-[#E0DED8] flex overflow-hidden">

        {/* Izquierda: zona de carga */}
        <div className="flex-[1.3] flex flex-col px-8 py-7 gap-6 border-r border-[#E0DED8]">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) selectFile(f); }}
            onClick={() => (step === "idle") && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center border-2 border-dashed transition-all rounded-sm min-h-[260px] ${
              dragging
                ? "border-[#DF8635] bg-[#FFF8F0] cursor-copy"
                : step === "done"
                ? "border-emerald-300 bg-emerald-50"
                : step === "error"
                ? "border-red-200 bg-red-50"
                : file
                ? "border-[#E0DED8] bg-[#FAFAF8]"
                : "border-[#E0DED8] hover:border-[#DF8635]/50 hover:bg-[#FAFAF8] cursor-pointer"
            }`}
          >
            {step === "done" ? (
              <>
                <FiCheckCircle size={36} className="text-emerald-500 mb-3" />
                <p className="text-[13px] font-medium text-emerald-700">Importación completada</p>
                <button onClick={resetFile} className="mt-4 text-[10px] uppercase tracking-[0.07em] text-[#aaa] hover:text-[#555] underline underline-offset-2">
                  Cargar otro archivo
                </button>
              </>
            ) : step === "error" ? (
              <>
                <FiAlertCircle size={36} className="text-red-400 mb-3" />
                <p className="text-[13px] font-medium text-red-600">Error en la importación</p>
                <button onClick={resetFile} className="mt-4 text-[10px] uppercase tracking-[0.07em] text-[#aaa] hover:text-[#555] underline underline-offset-2">
                  Intentar de nuevo
                </button>
              </>
            ) : step === "importing" ? (
              <>
                <div className="w-8 h-8 border-2 border-[#111]/20 border-t-[#111] rounded-full animate-spin mb-4" />
                <p className="text-[13px] font-medium text-[#111]">Importando productos...</p>
                <p className="text-[11px] text-[#aaa] mt-1">No cerrés esta ventana</p>
              </>
            ) : file ? (
              <>
                <FiFile size={32} className="text-[#DF8635] mb-3" />
                <p className="text-[13px] font-medium text-[#111]">{file.name}</p>
                <p className="text-[11px] text-[#aaa] mt-1">
                  {(file.size / 1024).toFixed(0)} KB
                  {preview && ` · ${(totals?.create ?? 0) + (totals?.update ?? 0) + (totals?.skip ?? 0)} filas detectadas`}
                </p>
                {preview && (
                  <div className="mt-5 flex gap-3 text-center">
                    <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-sm">
                      <div className="text-[18px] font-medium text-emerald-700 tabular-nums">{totals?.create ?? 0}</div>
                      <div className="text-[9px] uppercase tracking-[0.06em] text-emerald-600 mt-0.5">Nuevos</div>
                    </div>
                    <div className="px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-sm">
                      <div className="text-[18px] font-medium text-amber-700 tabular-nums">{totals?.update ?? 0}</div>
                      <div className="text-[9px] uppercase tracking-[0.06em] text-amber-600 mt-0.5">Actualizaciones</div>
                    </div>
                    {(totals?.skip ?? 0) > 0 && (
                      <div className="px-4 py-2.5 bg-[#F0EEE8] border border-[#E0DED8] rounded-sm">
                        <div className="text-[18px] font-medium text-[#999] tabular-nums">{totals?.skip}</div>
                        <div className="text-[9px] uppercase tracking-[0.06em] text-[#bbb] mt-0.5">Omitidos</div>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={resetFile} className="mt-4 text-[10px] uppercase tracking-[0.07em] text-[#aaa] hover:text-[#555] underline underline-offset-2">
                  Cambiar archivo
                </button>
              </>
            ) : (
              <>
                <FiUploadCloud size={40} className="text-[#E0DED8] mb-3" />
                <p className="text-[13px] font-medium text-[#777]">Arrastrá tu archivo aquí</p>
                <p className="text-[11px] text-[#bbb] mt-1">
                  o <span className="text-[#DF8635] underline underline-offset-2">hacé click para seleccionar</span>
                </p>
                <p className="text-[10px] text-[#ccc] mt-3 uppercase tracking-[0.06em]">.xlsx · .xls · máx. 5 MB</p>
              </>
            )}
          </div>

          <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />

          {/* Footer de acciones */}
          <div className="flex items-center justify-between">
            <a href="/plantilla-importacion.xlsx" download className="text-[10px] uppercase tracking-[0.07em] text-[#aaa] hover:text-[#555] transition-colors">
              Descargar plantilla
            </a>
            <button
              onClick={handleConfirmar}
              disabled={!preview || step !== "preview" || (totals?.create === 0 && totals?.update === 0)}
              className="flex items-center gap-2 h-9 px-6 text-[11px] font-medium text-white bg-[#111] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
            >
              {step === "importing" && <div className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />}
              Importar productos
            </button>
          </div>
        </div>

        {/* Derecha: pasos + historial */}
        <div className="w-[280px] shrink-0 flex flex-col divide-y divide-[#E0DED8]">

          {/* Pasos */}
          <div className="px-6 py-6">
            <p className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mb-5">Pasos para importar</p>
            <div className="space-y-4">
              {PASOS.map(({ n, label, desc }) => {
                const done = n < activeStep;
                const active = n === activeStep;
                return (
                  <div key={n} className="flex gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold mt-0.5 transition-colors ${
                      done ? "bg-emerald-100 text-emerald-700" : active ? "bg-[#DF8635] text-white" : "bg-[#F0EEE8] text-[#bbb]"
                    }`}>
                      {done ? "✓" : n}
                    </div>
                    <div>
                      <p className={`text-[12px] font-medium leading-tight ${active ? "text-[#111]" : done ? "text-[#888]" : "text-[#bbb]"}`}>{label}</p>
                      <p className="text-[10px] text-[#bbb] mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimas importaciones */}
          <div className="px-6 py-6 flex-1">
            <p className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mb-4">Últimas importaciones</p>
            {sesiones.length === 0 ? (
              <p className="text-[11px] text-[#ccc] italic">Sin registros aún</p>
            ) : (
              <div className="space-y-1">
                {sesiones.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#F0EEE8] last:border-0">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#555] truncate">
                        importacion_{new Date(s.fecha).toLocaleDateString("es-AR").replace(/\//g, "-")}
                      </p>
                      <p className="text-[10px] text-[#bbb] mt-0.5">{tiempoRelativo(s.fecha)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <span className="text-[11px] font-medium text-[#555] tabular-nums">{s.cantidad}</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-[0.04em]">OK</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info de formato */}
      <div className="bg-white border border-[#E0DED8]">
        <div className="px-8 py-5 border-b border-[#E0DED8]">
          <p className="text-[11px] text-[#555] leading-relaxed max-w-2xl">
            Subí un archivo .xlsx con tus productos. El sistema detecta automáticamente nuevos registros y actualizaciones, y te muestra una vista previa antes de confirmar.
          </p>
        </div>
        <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              title: "Columnas requeridas",
              items: ["SKU / Código", "Nombre del producto", "Marca", "Precio"],
            },
            {
              title: "Columnas opcionales",
              items: ["Categoría", "Subcategoría", "Descripción", "Imagen (URL)"],
            },
            {
              title: "Consideraciones",
              items: [
                "Máximo 1.000 productos por archivo",
                "Tamaño máximo: 5 MB",
                "SKUs duplicados en el archivo son ignorados",
                "SKUs existentes son actualizados",
              ],
            },
          ].map(({ title, items }) => (
            <div key={title}>
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mb-3">{title}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-[#555]">
                    <span className="w-1 h-1 rounded-full bg-[#DF8635] shrink-0 mt-[5px]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
