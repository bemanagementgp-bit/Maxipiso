"use client";

import { useState } from "react";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
import { ImportMasivaModal } from "../../../../components/admin/ImportMasivaModal";

type Toast = { id: number; type: "success" | "error"; message: string };

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 text-[12px] font-medium text-white min-w-[300px] shadow-lg ${
            t.type === "success" ? "bg-[#111]" : "bg-red-600"
          }`}
        >
          {t.type === "success" ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
            <FiX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ImportacionPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-8">

      {/* Encabezado */}
      <div>
        <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Importación masiva</h1>
        <p className="text-[11px] text-[#aaa] mt-1">
          Cargá o actualizá productos en lote desde un archivo Excel
        </p>
      </div>

      {/* Card principal de acción */}
      <div className="bg-white border border-[#E0DED8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-8 py-7 border-b border-[#E0DED8]">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 border border-[#E0DED8] flex items-center justify-center shrink-0">
              <FiUploadCloud size={22} className="text-[#DF8635]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#111]">Importar desde Excel</p>
              <p className="text-[11px] text-[#aaa] mt-1 max-w-md leading-relaxed">
                Subí un archivo .xlsx con tus productos. El sistema detecta automáticamente nuevos registros y actualizaciones, y te muestra una vista previa antes de confirmar.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="shrink-0 flex items-center gap-2 h-9 px-6 text-[11px] font-medium text-white bg-[#DF8635] hover:bg-[#c97220] transition-colors rounded-sm"
          >
            <FiUploadCloud size={14} />
            Iniciar importación
          </button>
        </div>

        {/* Info de formato */}
        <div className="px-8 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
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
              items: ["Máximo 5.000 filas por archivo", "Tamaño máximo: 5 MB", "SKUs duplicados en el archivo son ignorados", "SKUs existentes son actualizados"],
            },
          ].map(({ title, items }) => (
            <div key={title}>
              <p className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mb-2.5">{title}</p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[11px] text-[#555]">
                    <span className="w-1 h-1 rounded-full bg-[#DF8635] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <ImportMasivaModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onImportDone={({ createdCount, updatedCount }) => {
          setIsOpen(false);
          addToast("success", `Importación completada: ${createdCount} nuevos · ${updatedCount} actualizados`);
        }}
      />

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
