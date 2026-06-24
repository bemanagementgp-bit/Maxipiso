"use client";

import { useState } from "react";
import {
  FiPlus, FiDownload, FiUpload,
  FiCheckCircle, FiAlertCircle, FiX,
} from "react-icons/fi";
import { ProductTable } from "../../../components/admin/ProductTable";
import { QuickEditPanel } from "../../../components/admin/QuickEditPanel";
import { HistorialModal } from "../../../components/admin/HistorialModal";
import { ImportPreviewModal } from "../../../components/admin/ImportPreviewModal";
import { Product } from "../../../types";

// ── Toast ─────────────────────────────────────────────────────────────────────
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

// ── Select filtro ─────────────────────────────────────────────────────────────
function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-3 text-[11px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] text-[#555] transition-colors rounded-sm appearance-none pr-7 cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23aaa' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {children}
    </select>
  );
}

const CATEGORIAS = ["Pisos", "Maderas", "Decks", "Revestimientos", "Accesorios", "Otros"];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductosPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [historialProductId, setHistorialProductId] = useState<string>();
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("activo");

  const [isLoading, setIsLoading] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleSaveProduct = async (formData: any) => {
    setIsLoading(true);
    try {
      const method = selectedProduct ? "PUT" : "POST";
      const url = selectedProduct ? `/api/productos/${selectedProduct.id}` : "/api/productos";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setIsPanelOpen(false);
      setSelectedProduct(null);
      setTableRefreshKey((v) => v + 1);
      addToast("success", selectedProduct ? "Producto actualizado" : "Producto creado");
    } catch {
      addToast("error", "No se pudo guardar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/productos/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `productos-maxipiso-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast("success", "Exportación completada");
    } catch {
      addToast("error", "Error al exportar");
    }
  };

  const handleImportSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/productos/import/preview", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPendingImportFile(file);
      setImportPreviewData(data.data);
      setIsImportPreviewOpen(true);
    } catch {
      addToast("error", "No se pudo analizar el archivo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingImportFile) return;
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingImportFile);
      const res = await fetch("/api/productos/import", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsImportPreviewOpen(false);
      setPendingImportFile(null);
      setImportPreviewData(null);
      setTableRefreshKey((v) => v + 1);
      addToast("success", `${data.data.createdCount} creados · ${data.data.updatedCount} actualizados`);
    } catch {
      addToast("error", "Error al importar el archivo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Gestión de productos</h1>
          <p className="text-[11px] text-[#aaa] mt-1">
            Administrá y controlá todo el catálogo de Maxipiso
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-8 px-3.5 text-[11px] font-medium text-[#222] border border-[#555] bg-white hover:bg-[#F4F4F2] transition-all rounded-sm"
          >
            <FiDownload size={13} />
            Exportar
          </button>
          <label className="flex items-center gap-1.5 h-8 px-3.5 text-[11px] font-medium text-[#555] border border-[#E0DED8] bg-[#F5F4F1] hover:border-[#bbb] hover:text-[#333] transition-all rounded-sm cursor-pointer">
            <FiUpload size={13} />
            Importar
            <input type="file" accept=".xlsx,.xls,.xlsm" onChange={handleImportSelect} className="hidden" disabled={isLoading} />
          </label>
          <button
            onClick={() => { setSelectedProduct(null); setIsPanelOpen(true); }}
            className="flex items-center gap-1.5 h-8 px-4 text-[11px] font-medium text-white bg-[#111] hover:bg-[#2a2a2a] transition-colors rounded-sm"
          >
            <FiPlus size={14} />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ccc]" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por SKU, nombre o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-[11px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc] rounded-sm"
          />
        </div>

        <FilterSelect value={categoriaFilter} onChange={setCategoriaFilter}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>

        <input
          type="text"
          placeholder="Todas las marcas"
          value={marcaFilter}
          onChange={(e) => setMarcaFilter(e.target.value)}
          className="h-8 px-3 text-[11px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] transition-colors text-[#555] placeholder:text-[#ccc] rounded-sm w-40"
        />

        <FilterSelect value={estadoFilter} onChange={setEstadoFilter}>
          <option value="activo">Todos los activos</option>
          <option value="inactivo">Inactivos</option>
          <option value="todos">Todos los estados</option>
        </FilterSelect>

        {(categoriaFilter || marcaFilter || estadoFilter !== "activo" || searchTerm) && (
          <button
            onClick={() => { setCategoriaFilter(""); setMarcaFilter(""); setEstadoFilter("activo"); setSearchTerm(""); }}
            className="flex items-center gap-1 h-8 px-3 text-[10px] uppercase tracking-[0.06em] text-[#bbb] hover:text-[#666] transition-colors"
          >
            <FiX size={11} />
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-[#E0DED8] overflow-hidden">
        <ProductTable
          refreshKey={tableRefreshKey}
          onEdit={(product) => { setSelectedProduct(product); setIsPanelOpen(true); }}
          onDelete={() => {
            setTableRefreshKey((v) => v + 1);
            addToast("success", "Producto eliminado");
          }}
          onViewHistory={(productId) => { setHistorialProductId(productId); setIsHistorialOpen(true); }}
          searchTerm={searchTerm}
          categoriaFilter={categoriaFilter}
          marcaFilter={marcaFilter}
          estadoFilter={estadoFilter}
        />
      </div>

      {/* Panel deslizable */}
      <QuickEditPanel
        isOpen={isPanelOpen}
        product={selectedProduct}
        isLoading={isLoading}
        onClose={() => { setIsPanelOpen(false); setSelectedProduct(null); }}
        onSave={handleSaveProduct}
      />

      <HistorialModal
        isOpen={isHistorialOpen}
        onClose={() => { setIsHistorialOpen(false); setHistorialProductId(undefined); }}
        productId={historialProductId}
      />
      <ImportPreviewModal
        isOpen={isImportPreviewOpen}
        previewData={importPreviewData}
        isLoading={isLoading}
        onConfirm={handleImportConfirm}
        onClose={() => { setIsImportPreviewOpen(false); setPendingImportFile(null); setImportPreviewData(null); }}
      />

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
