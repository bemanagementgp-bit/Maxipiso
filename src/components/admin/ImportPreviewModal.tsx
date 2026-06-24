"use client";

import { useState } from "react";
import { FiX, FiAlertTriangle, FiPlus, FiRefreshCw, FiSlash, FiCopy } from "react-icons/fi";

type PreviewItem = { sku: string; nombre: string; marca: string; precio: number; cambios?: string[]; motivo?: string };
type PreviewData = {
  toCreate: PreviewItem[];
  toUpdate: PreviewItem[];
  toSkip: PreviewItem[];
  duplicates: PreviewItem[];
  totals: { create: number; update: number; skip: number; duplicates: number };
};

interface ImportPreviewModalProps {
  isOpen: boolean;
  previewData: PreviewData | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

type Tab = "create" | "update" | "skip" | "duplicates";

export function ImportPreviewModal({ isOpen, previewData, isLoading, onConfirm, onClose }: ImportPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("create");

  if (!isOpen) return null;

  const tabs: { key: Tab; label: string; count: number; color: string; icon: React.ElementType }[] = [
    { key: "create", label: "Nuevos", count: previewData?.totals.create ?? 0, color: "text-green-600 bg-green-50", icon: FiPlus },
    { key: "update", label: "Actualizaciones", count: previewData?.totals.update ?? 0, color: "text-amber-600 bg-amber-50", icon: FiRefreshCw },
    { key: "duplicates", label: "Duplicados", count: previewData?.totals.duplicates ?? 0, color: "text-orange-600 bg-orange-50", icon: FiCopy },
    { key: "skip", label: "Omitidos", count: previewData?.totals.skip ?? 0, color: "text-gray-500 bg-gray-100", icon: FiSlash },
  ];

  const currentItems: PreviewItem[] =
    activeTab === "create" ? (previewData?.toCreate ?? []) :
    activeTab === "update" ? (previewData?.toUpdate ?? []) :
    activeTab === "duplicates" ? (previewData?.duplicates ?? []) :
    (previewData?.toSkip ?? []);

  const hasDuplicates = (previewData?.totals.duplicates ?? 0) > 0;
  const total = (previewData?.totals.create ?? 0) + (previewData?.totals.update ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#111]">Vista previa de importación</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Revisá los cambios antes de confirmar
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {/* Alerta de duplicados */}
        {hasDuplicates && (
          <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 bg-orange-50 rounded-xl border border-orange-100">
            <FiAlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
            <p className="text-xs text-orange-700">
              <strong>{previewData?.totals.duplicates} SKU(s) duplicados</strong> detectados en el archivo. Serán omitidos de la importación.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 px-6 mt-4 shrink-0">
          {tabs.map(({ key, label, count, color, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === key
                  ? `${color} border-current/20 shadow-sm`
                  : "text-gray-400 border-transparent hover:bg-gray-50"
              }`}
            >
              <Icon size={12} />
              {label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === key ? "bg-white/60" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4 min-h-0">
          {currentItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-300">
              No hay ítems en esta categoría
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-medium border-b border-gray-100">
                  <th className="text-left pb-2 pr-4">SKU</th>
                  <th className="text-left pb-2 pr-4">Nombre</th>
                  <th className="text-left pb-2 pr-4">Marca</th>
                  <th className="text-right pb-2 pr-4">Precio</th>
                  {activeTab === "update" && <th className="text-left pb-2">Cambios</th>}
                  {(activeTab === "skip" || activeTab === "duplicates") && <th className="text-left pb-2">Motivo</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-gray-500">{item.sku || "—"}</td>
                    <td className="py-2.5 pr-4 font-medium text-[#111] max-w-[200px] truncate">{item.nombre || "—"}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{item.marca || "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-[#111]">
                      {item.precio > 0 ? `$${item.precio.toLocaleString("es-AR")}` : "—"}
                    </td>
                    {activeTab === "update" && (
                      <td className="py-2.5 max-w-[220px]">
                        {item.cambios?.length ? (
                          <ul className="space-y-0.5">
                            {item.cambios.map((c, j) => (
                              <li key={j} className="text-amber-600 truncate">{c}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-300">Sin cambios</span>
                        )}
                      </td>
                    )}
                    {(activeTab === "skip" || activeTab === "duplicates") && (
                      <td className="py-2.5 text-gray-400">{item.motivo ?? (activeTab === "duplicates" ? "SKU repetido en el archivo" : "")}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <p className="text-sm text-gray-500">
            Se procesarán <strong className="text-[#111]">{total}</strong> productos
            {hasDuplicates && <span className="text-orange-500"> ({previewData?.totals.duplicates} omitidos por duplicados)</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || total === 0}
              className="px-5 py-2.5 rounded-xl bg-[#111] hover:bg-[#333] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                `Confirmar importación`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
