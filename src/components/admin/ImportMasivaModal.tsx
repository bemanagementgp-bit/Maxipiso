"use client";

import { useEffect, useRef, useState } from "react";
import { FiX, FiUploadCloud, FiCheckCircle, FiAlertCircle, FiFile } from "react-icons/fi";

interface ImportMasivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: (result: { createdCount: number; updatedCount: number }) => void;
}

type Step = "idle" | "preview" | "importing" | "done" | "error";

const PASOS = [
  { n: 1, label: "Preparar la plantilla", desc: "Descargá el modelo Excel con las columnas requeridas" },
  { n: 2, label: "Completar los datos", desc: "Completá SKU, nombre, marca y precio en cada fila" },
  { n: 3, label: "Subir el archivo", desc: "Arrastrá el archivo o hacé click en el área de carga" },
  { n: 4, label: "Confirmar los cambios", desc: "Revisá el resumen y confirmá la importación" },
];

function tiempoRelativo(fecha: Date) {
  const diff = (Date.now() - new Date(fecha).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
  return `hace ${Math.round(diff / 86400)} d`;
}

export function ImportMasivaModal({ isOpen, onClose, onImportDone }: ImportMasivaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [sesiones, setSesiones] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar últimas importaciones al abrir
  useEffect(() => {
    if (!isOpen) return;
    setFile(null); setStep("idle"); setPreview(null); setResult(null); setError("");
    fetch("/api/reportes/importaciones")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSesiones(d.data.sesiones); })
      .catch(() => {});
  }, [isOpen]);

  // Drag & Drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  };

  const selectFile = async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "xlsm"].includes(ext ?? "")) {
      setError("Solo se aceptan archivos Excel (.xlsx, .xls)");
      return;
    }
    setFile(f);
    setError("");
    setStep("preview");
    await loadPreview(f);
  };

  const loadPreview = async (f: File) => {
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/productos/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al analizar");
      setPreview(data.data);
    } catch (err: any) {
      setError(err.message);
      setStep("idle");
      setFile(null);
    }
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
      setResult(data.data);
      setStep("done");
      onImportDone({ createdCount: data.data.createdCount, updatedCount: data.data.updatedCount });
    } catch (err: any) {
      setError(err.message);
      setStep("error");
    }
  };

  const resetFile = () => {
    setFile(null); setStep("idle"); setPreview(null); setResult(null); setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!isOpen) return null;

  const totals = preview?.totals;
  const activeStep = step === "idle" ? 3 : step === "preview" ? 4 : step === "importing" ? 4 : 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={step === "importing" ? undefined : onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#E0DED8] shrink-0">
          <div>
            <h2 className="text-[15px] font-medium text-[#111]">Importación masiva de productos</h2>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#aaa] mt-0.5">
              Cargá hasta 5.000 productos desde un archivo Excel
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={step === "importing"}
            className="p-1.5 text-[#ccc] hover:text-[#777] transition-colors disabled:opacity-30"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Izquierda: zona de carga ── */}
          <div className="flex-[1.1] border-r border-[#E0DED8] flex flex-col px-8 py-6 gap-5">

            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => step === "idle" && inputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer rounded-sm min-h-[200px] ${
                dragging
                  ? "border-[#DF8635] bg-[#FFF8F0]"
                  : step === "done"
                  ? "border-emerald-300 bg-emerald-50 cursor-default"
                  : step === "error"
                  ? "border-red-200 bg-red-50 cursor-default"
                  : file
                  ? "border-[#E0DED8] bg-[#FAFAF8] cursor-default"
                  : "border-[#E0DED8] hover:border-[#DF8635]/60 hover:bg-[#FAFAF8]"
              }`}
            >
              {step === "done" ? (
                <>
                  <FiCheckCircle size={36} className="text-emerald-500 mb-3" />
                  <p className="text-[13px] font-medium text-emerald-700">Importación completada</p>
                  <p className="text-[11px] text-emerald-600 mt-1">
                    {result?.createdCount} nuevos · {result?.updatedCount} actualizados
                  </p>
                  <button onClick={resetFile} className="mt-4 text-[10px] uppercase tracking-[0.07em] text-[#aaa] hover:text-[#555] underline underline-offset-2">
                    Cargar otro archivo
                  </button>
                </>
              ) : step === "error" ? (
                <>
                  <FiAlertCircle size={36} className="text-red-400 mb-3" />
                  <p className="text-[13px] font-medium text-red-600">Error en la importación</p>
                  <p className="text-[11px] text-red-500 mt-1 text-center max-w-[240px]">{error}</p>
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
                    {preview && ` · ${(totals?.create ?? 0) + (totals?.update ?? 0) + (totals?.skip ?? 0)} filas`}
                  </p>
                  {preview && (
                    <div className="mt-4 flex gap-3 text-center">
                      <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-sm">
                        <div className="text-[16px] font-medium text-emerald-700 tabular-nums">{totals?.create ?? 0}</div>
                        <div className="text-[9px] uppercase tracking-[0.06em] text-emerald-600 mt-0.5">Nuevos</div>
                      </div>
                      <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-sm">
                        <div className="text-[16px] font-medium text-amber-700 tabular-nums">{totals?.update ?? 0}</div>
                        <div className="text-[9px] uppercase tracking-[0.06em] text-amber-600 mt-0.5">Actualizaciones</div>
                      </div>
                      {(totals?.skip ?? 0) > 0 && (
                        <div className="px-3 py-2 bg-[#F0EEE8] border border-[#E0DED8] rounded-sm">
                          <div className="text-[16px] font-medium text-[#999] tabular-nums">{totals?.skip}</div>
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
                    o{" "}
                    <span className="text-[#DF8635] underline underline-offset-2">hacé click para seleccionar</span>
                  </p>
                  <p className="text-[10px] text-[#ccc] mt-3 uppercase tracking-[0.06em]">.xlsx · .xls · máx. 5 MB</p>
                </>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
            />

            {/* Error inline */}
            {error && step === "idle" && (
              <p className="text-[11px] text-red-500 flex items-center gap-1.5">
                <FiAlertCircle size={12} /> {error}
              </p>
            )}
          </div>

          {/* ── Derecha: pasos + historial ── */}
          <div className="w-[280px] flex flex-col overflow-y-auto shrink-0">

            {/* Pasos */}
            <div className="px-6 py-5 border-b border-[#E0DED8]">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mb-4">Pasos para importar</p>
              <div className="space-y-4">
                {PASOS.map(({ n, label, desc }) => {
                  const done = n < activeStep;
                  const active = n === activeStep;
                  return (
                    <div key={n} className="flex gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold mt-0.5 ${
                        done ? "bg-emerald-100 text-emerald-700" : active ? "bg-[#DF8635] text-white" : "bg-[#F0EEE8] text-[#bbb]"
                      }`}>
                        {done ? "✓" : n}
                      </div>
                      <div>
                        <p className={`text-[12px] font-medium leading-tight ${active ? "text-[#111]" : done ? "text-[#888]" : "text-[#bbb]"}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-[#bbb] mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Últimas importaciones */}
            <div className="px-6 py-5 flex-1">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mb-3">Últimas importaciones</p>
              {sesiones.length === 0 ? (
                <p className="text-[11px] text-[#ccc] italic">Sin registros aún</p>
              ) : (
                <div className="space-y-2">
                  {sesiones.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#F0EEE8] last:border-0">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[#555] truncate">
                          importacion_{new Date(s.fecha).toLocaleDateString("es-AR").replace(/\//g, "-")}
                        </p>
                        <p className="text-[10px] text-[#bbb] mt-0.5">{tiempoRelativo(s.fecha)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="text-[11px] font-medium text-[#555] tabular-nums">{s.cantidad}</span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-[0.04em]">
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

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-[#E0DED8] bg-[#FAFAF8] shrink-0">
          <button
            onClick={onClose}
            disabled={step === "importing"}
            className="h-9 px-5 text-[11px] font-medium text-[#555] border border-[#E0DED8] hover:border-[#bbb] hover:text-[#111] transition-all rounded-sm disabled:opacity-30"
          >
            {step === "done" ? "Cerrar" : "Cancelar"}
          </button>

          <div className="flex items-center gap-3">
            {/* Descargar plantilla */}
            <a
              href="/plantilla-importacion.xlsx"
              className="text-[10px] uppercase tracking-[0.07em] text-[#DF8635] hover:text-[#c97220] transition-colors"
              download
            >
              Descargar plantilla
            </a>
            <button
              onClick={handleConfirmar}
              disabled={!preview || step !== "preview" || (totals?.create === 0 && totals?.update === 0)}
              className="h-9 px-6 text-[11px] font-medium text-white bg-[#DF8635] hover:bg-[#c97220] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm flex items-center gap-2"
            >
              {step === "importing" && <div className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />}
              Importar productos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
