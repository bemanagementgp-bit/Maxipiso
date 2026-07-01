"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiX, FiFile, FiDownload, FiChevronDown } from "react-icons/fi";

type Step = "idle" | "preview" | "importing" | "done" | "error";
type Toast = { id: number; type: "success" | "error"; message: string };

type SheetResult = {
  sheetName: string;
  schemaId: string;
  schemaLabel: string;
  score: number;
  detectedColumns: { original: string; mapsTo: string }[];
  rowCount: number;
  toCreate: number;
  toUpdate: number;
  skip: number;
};

type PreviewData = {
  sheetResults: SheetResult[];
  totals: { create: number; update: number; skip: number };
  totalRows: number;
};

const SCHEMA_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "pisos-flotantes":  { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-400" },
  "porcelanatos":     { bg: "bg-stone-50",   text: "text-stone-700",  border: "border-stone-200",  dot: "bg-stone-400" },
  "revestimientos":   { bg: "bg-teal-50",    text: "text-teal-700",   border: "border-teal-200",   dot: "bg-teal-400" },
  "pisos-vinilicos":  { bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-400" },
  "pisos-madera":     { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400" },
  "deck":             { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200",  dot: "bg-green-400" },
  "maderas":          { bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-400" },
  "accesorios":       { bg: "bg-pink-50",    text: "text-pink-700",   border: "border-pink-200",   dot: "bg-pink-400" },
};

const PASOS = [
  { n: 1, label: "Preparar el archivo",   desc: "El sistema detecta la categoria de cada hoja automaticamente" },
  { n: 2, label: "Subir el archivo",      desc: "Arrastra el archivo Excel o hace click en el area de carga" },
  { n: 3, label: "Revisar la deteccion",  desc: "Verifica las hojas detectadas y las categorias asignadas" },
  { n: 4, label: "Confirmar importacion", desc: "Confirma para aplicar los cambios a la base de datos" },
];

const CATEGORIAS_SOPORTADAS = [
  { id: "pisos-flotantes",  label: "Pisos Flotantes" },
  { id: "porcelanatos",     label: "Porcelanatos y Ceramicos" },
  { id: "revestimientos",   label: "Revestimientos" },
  { id: "pisos-vinilicos",  label: "Pisos Vinilicos" },
  { id: "pisos-madera",     label: "Pisos de Madera e Ingenieria" },
  { id: "deck",             label: "Deck WPC" },
  { id: "maderas",          label: "Maderas" },
  { id: "accesorios",       label: "Accesorios" },
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
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
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
    setPreview(null);
    setExpandedSheet(null);
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
    setFile(null); setStep("idle"); setPreview(null); setExpandedSheet(null);
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
      addToast("success", `Importacion completada: ${data.data.createdCount} nuevos - ${data.data.updatedCount} actualizados`);
      fetch("/api/reportes/importaciones").then((r) => r.json()).then((d) => { if (d.success) setSesiones(d.data.sesiones); }).catch(() => {});
    } catch (err: any) {
      addToast("error", err.message);
      setStep("error");
    }
  };

  const totals = preview?.totals;
  const activeStep = step === "idle" ? 2 : step === "preview" ? 3 : 4;
  const canConfirm = !!preview && step === "preview" && ((totals?.create ?? 0) + (totals?.update ?? 0)) > 0;

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Importacion masiva</h1>
          <p className="text-[11px] text-[#aaa] mt-1">El sistema detecta la categoria de cada hoja automaticamente por sus columnas</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        <div className="bg-white border border-[#E0DED8] flex flex-col">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) selectFile(f); }}
            onClick={() => step === "idle" && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center mx-5 mt-5 border-2 border-dashed transition-all rounded-sm ${
              dragging ? "border-[#DF8635] bg-[#FFF8F0] cursor-copy"
              : step === "done" ? "border-emerald-300 bg-emerald-50"
              : step === "error" ? "border-red-200 bg-red-50"
              : file ? "border-[#D0CEC8] bg-[#FAFAF8]"
              : "border-[#D0CEC8] hover:border-[#DF8635]/60 hover:bg-[#FFFCFA] cursor-pointer"
            }`}
          >
            {step === "done" ? (
              <div className="flex flex-col items-center py-8">
                <FiCheckCircle size={36} className="text-emerald-500 mb-3" />
                <p className="text-[14px] font-medium text-emerald-700">Importacion completada</p>
                <button onClick={resetFile} className="mt-3 text-[11px] text-[#aaa] hover:text-[#555] underline underline-offset-2 transition-colors">
                  Cargar otro archivo
                </button>
              </div>
            ) : step === "error" ? (
              <div className="flex flex-col items-center py-8">
                <FiAlertCircle size={36} className="text-red-400 mb-3" />
                <p className="text-[14px] font-medium text-red-600">Error en la importacion</p>
                <button onClick={resetFile} className="mt-3 text-[11px] text-[#aaa] hover:text-[#555] underline underline-offset-2 transition-colors">
                  Intentar de nuevo
                </button>
              </div>
            ) : step === "importing" ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-8 h-8 border-2 border-[#111]/20 border-t-[#111] rounded-full animate-spin mb-4" />
                <p className="text-[14px] font-medium text-[#111]">Importando productos...</p>
                <p className="text-[12px] text-[#aaa] mt-1">No cerres esta ventana</p>
              </div>
            ) : file ? (
              <div className="flex items-center gap-4 px-5 py-4 w-full">
                <FiFile size={28} className="text-[#DF8635] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111] truncate">{file.name}</p>
                  <p className="text-[11px] text-[#aaa] mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB
                    {preview
                      ? ` - ${preview.sheetResults.length} hoja${preview.sheetResults.length !== 1 ? "s" : ""} detectada${preview.sheetResults.length !== 1 ? "s" : ""}`
                      : " - Analizando..."}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); resetFile(); }} className="text-[11px] text-[#bbb] hover:text-[#555] underline underline-offset-2 transition-colors shrink-0">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center">
                <FiUploadCloud size={40} className="text-[#C8C6C0] mb-3" />
                <p className="text-[14px] font-medium text-[#555]">Arrasta tu archivo aqui</p>
                <p className="text-[12px] text-[#bbb] mt-1">
                  o <span className="text-[#DF8635] underline underline-offset-2 cursor-pointer">hace click para seleccionar</span>
                </p>
                <p className="text-[10px] text-[#ccc] mt-3 uppercase tracking-[0.08em]">.xlsx .xls - max. 5 MB</p>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />

          {/* Spinner analisis */}
          {step === "preview" && !preview && file && (
            <div className="flex items-center gap-3 mx-5 mt-4 px-4 py-3 bg-[#FAFAF8] border border-[#E8E6E0] rounded-sm">
              <div className="w-4 h-4 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin shrink-0" />
              <span className="text-[12px] text-[#777]">Analizando hojas del archivo...</span>
            </div>
          )}

          {/* Totales */}
          {preview && step === "preview" && (
            <div className="mx-5 mt-4 flex gap-3">
              {(totals?.create ?? 0) > 0 && (
                <div className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-sm text-center">
                  <div className="text-[20px] font-semibold text-emerald-700 tabular-nums leading-none">{totals!.create}</div>
                  <div className="text-[9px] uppercase tracking-[0.08em] text-emerald-600 mt-1">Nuevos</div>
                </div>
              )}
              {(totals?.update ?? 0) > 0 && (
                <div className="flex-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-sm text-center">
                  <div className="text-[20px] font-semibold text-amber-700 tabular-nums leading-none">{totals!.update}</div>
                  <div className="text-[9px] uppercase tracking-[0.08em] text-amber-600 mt-1">Actualizaciones</div>
                </div>
              )}
              {(totals?.skip ?? 0) > 0 && (
                <div className="flex-1 px-4 py-3 bg-[#F0EEE8] border border-[#DDD] rounded-sm text-center">
                  <div className="text-[20px] font-semibold text-[#999] tabular-nums leading-none">{totals!.skip}</div>
                  <div className="text-[9px] uppercase tracking-[0.08em] text-[#bbb] mt-1">Omitidos</div>
                </div>
              )}
            </div>
          )}

          {/* Deteccion por hoja */}
          {preview && step === "preview" && preview.sheetResults.length > 0 && (
            <div className="mx-5 mt-4">
              <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#888] mb-3">
                Hojas detectadas ({preview.sheetResults.length})
              </p>
              <div className="space-y-2">
                {preview.sheetResults.map((sheet) => {
                  const colors = SCHEMA_COLORS[sheet.schemaId] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400" };
                  const isExpanded = expandedSheet === sheet.sheetName;

                  return (
                    <div key={sheet.sheetName} className="border border-[#E8E6E0] rounded-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedSheet(isExpanded ? null : sheet.sheetName)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAF8] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-semibold text-[#333] truncate">{sheet.sheetName}</span>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} shrink-0`}>
                              {sheet.schemaLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] text-[#aaa]">{sheet.rowCount} filas</span>
                            {sheet.toCreate > 0 && <span className="text-[10px] text-emerald-600 font-medium">+{sheet.toCreate} nuevos</span>}
                            {sheet.toUpdate > 0 && <span className="text-[10px] text-amber-600 font-medium">{sheet.toUpdate} actualizados</span>}
                            {sheet.skip > 0 && <span className="text-[10px] text-[#bbb]">{sheet.skip} omitidos</span>}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-[9px] text-[#bbb] uppercase tracking-[0.06em]">Confianza</div>
                            <div className={`text-[11px] font-semibold ${sheet.score >= 3 ? "text-emerald-600" : sheet.score >= 2 ? "text-amber-600" : "text-red-400"}`}>
                              {sheet.score >= 3 ? "Alta" : sheet.score >= 2 ? "Media" : "Baja"}
                            </div>
                          </div>
                          <FiChevronDown size={13} className={`text-[#ccc] transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#F0EEE8] px-4 py-3 bg-[#FAFAF8]">
                          <p className="text-[9px] uppercase tracking-[0.1em] text-[#bbb] mb-2">Mapeo de columnas</p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                            {sheet.detectedColumns.map((col, i) => (
                              <div key={i} className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] text-[#777] truncate flex-1">{col.original}</span>
                                <span className="text-[9px] text-[#ddd] shrink-0">-&gt;</span>
                                <span className={`text-[10px] font-medium shrink-0 ${
                                  col.mapsTo === "ignorado" ? "text-[#ccc]"
                                  : col.mapsTo === "specs" ? "text-[#aaa]"
                                  : "text-[#DF8635]"
                                }`}>
                                  {col.mapsTo}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-5 py-4 mt-2 flex justify-end">
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

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#E0DED8] px-6 py-6">
            <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#888] mb-5">Pasos para importar</p>
            <div className="space-y-5">
              {PASOS.map(({ n, label, desc }) => {
                const done = n < activeStep;
                const active = n === activeStep;
                return (
                  <div key={n} className="flex gap-3.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 transition-all ${done ? "bg-emerald-500 text-white" : active ? "bg-[#DF8635] text-white" : "bg-[#F0EEE8] text-[#ccc]"}`}>
                      {done ? "+" : n}
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

          <div className="bg-white border border-[#E0DED8] px-6 py-5">
            <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#888] mb-4">Categorias soportadas</p>
            <div className="space-y-2">
              {CATEGORIAS_SOPORTADAS.map(({ id, label }) => {
                const colors = SCHEMA_COLORS[id] ?? { dot: "bg-gray-400" };
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                    <span className="text-[11px] text-[#555]">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-[#E0DED8] px-6 py-6 flex-1">
            <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[#888] mb-4">Ultimas importaciones</p>
            {sesiones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                <p className="text-[11px] text-[#ccc]">Sin registros aun</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EEE8]">
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
                      <span className="text-[9px] bg-[#111] text-white px-1.5 py-0.5 rounded-sm font-medium uppercase tracking-[0.04em]">OK</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="border border-[#E0DED8] bg-white overflow-hidden">
        <button
          onClick={() => { const next = !infoOpen; setInfoOpen(next); if (!next) localStorage.setItem("import_info_seen", "1"); }}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#FAFAF8] transition-colors"
        >
          <span className="text-[11px] text-[#999] uppercase tracking-[0.08em]">Como funciona la deteccion automatica</span>
          <FiChevronDown size={14} className={`text-[#ccc] transition-transform duration-200 ${infoOpen ? "rotate-180" : ""}`} />
        </button>
        {infoOpen && (
          <div className="border-t border-[#E0DED8] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E0DED8]">
            {[
              { title: "Deteccion por columnas", accent: true, items: ["Cada categoria tiene columnas unicas llamadas firma", "El sistema compara los headers de cada hoja con las firmas", "Se asigna la categoria con mayor coincidencia", "La confianza indica cuantas columnas clave coincidieron"] },
              { title: "Campos extraidos", accent: false, items: ["SKU, Nombre, Marca, Precio, Moneda", "Stock, Imagen, Descripcion", "Categoria y Subcategoria (de Categoria Principal)", "Todo lo demas va a Especificaciones (datos tecnicos)"] },
              { title: "Consideraciones", accent: false, items: ["Maximo 1.000 productos por archivo", "Tamano maximo: 5 MB", "SKUs duplicados en el archivo son ignorados", "SKUs existentes son actualizados automaticamente"] },
            ].map(({ title, accent, items }) => (
              <div key={title} className="px-7 py-5">
                <p className={`text-[9px] uppercase tracking-[0.12em] font-semibold mb-3.5 ${accent ? "text-[#DF8635]" : "text-[#888]"}`}>{title}</p>
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
