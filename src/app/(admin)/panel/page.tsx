"use client";

import { useState } from "react";
import {
  FiPlus, FiDownload, FiUpload,
  FiCheckCircle, FiAlertCircle, FiX,
} from "react-icons/fi";
import Link from "next/link";
import { ProductTable } from "../../../components/admin/ProductTable";
import { QuickEditPanel } from "../../../components/admin/QuickEditPanel";
import { HistorialModal } from "../../../components/admin/HistorialModal";

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

const TABLAS = [
  { value: "pisos_flotantes",  label: "Pisos Flotantes" },
  { value: "porcellanatos",    label: "Porcelanatos" },
  { value: "revestimientos",   label: "Revestimientos" },
  { value: "pisos_vinilicos",  label: "Pisos Vinílicos" },
  { value: "pisos_madera",     label: "Pisos Madera" },
  { value: "decks",           label: "Decks" },
  { value: "maderas",         label: "Maderas" },
  { value: "accesorios",      label: "Accesorios" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductosPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [historialProductId, setHistorialProductId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [tablaFilter, setTablaFilter] = useState("pisos_flotantes");
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
      const method = editProductId ? "PUT" : "POST";
      const url = editProductId ? `/api/productos/${editProductId}` : "/api/productos";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setIsPanelOpen(false);
      setEditProductId(null);
      setTableRefreshKey((v) => v + 1);
      addToast("success", editProductId ? "Producto actualizado" : "Producto creado");

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

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Gestion de productos</h1>
          <p className="text-[11px] text-[#aaa] mt-1">
            Administra y controla todo el catalogo de Maxipiso
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-8 px-3.5 text-[11px] font-medium text-white bg-[#3D3D3D] hover:bg-[#555] transition-colors rounded-sm"
          >
            <FiDownload size={13} />
            Exportar
          </button>
          <Link
            href="/panel/importacion"
            className="flex items-center gap-1.5 h-8 px-3.5 text-[11px] font-medium text-[#333] border border-[#888] bg-white hover:border-[#444] hover:text-[#111] transition-all rounded-sm"
          >
            <FiUpload size={13} />
            Importar
          </Link>
          <button
            onClick={() => { setEditProductId(null); setIsNewProduct(true); setIsPanelOpen(true); }}
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

        <FilterSelect value={tablaFilter} onChange={setTablaFilter}>
          <option value="">Todas las categorias</option>
          {TABLAS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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

        {(tablaFilter || marcaFilter || estadoFilter !== "activo" || searchTerm) && (
          <button
            onClick={() => { setTablaFilter(""); setMarcaFilter(""); setEstadoFilter("activo"); setSearchTerm(""); }}
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
          onEdit={(product) => { setEditProductId(product.id); setIsNewProduct(false); setIsPanelOpen(true); }}
          onDelete={() => {
            setTableRefreshKey((v) => v + 1);
            addToast("success", "Producto eliminado");
          }}
          onViewHistory={(productId) => { setHistorialProductId(productId); setIsHistorialOpen(true); }}
          searchTerm={searchTerm}
          tablaFilter={tablaFilter}
          marcaFilter={marcaFilter}
          estadoFilter={estadoFilter}
        />
      </div>

      {/* Panel deslizable */}
      <QuickEditPanel
        isOpen={isPanelOpen}
        productId={editProductId}
        isNew={isNewProduct}
        isLoading={isLoading}
        onClose={() => { setIsPanelOpen(false); setEditProductId(null); }}
        onSave={handleSaveProduct}
      />

      <HistorialModal
        isOpen={isHistorialOpen}
        onClose={() => { setIsHistorialOpen(false); setHistorialProductId(undefined); }}
        productId={historialProductId}
      />

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}

