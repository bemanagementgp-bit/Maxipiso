"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiPlus, FiDownload, FiUpload, FiLogOut,
  FiCheckCircle, FiAlertCircle, FiX,
} from "react-icons/fi";
import { ProductTable } from "../../../components/admin/ProductTable";
import { ProductModal } from "../../../components/admin/ProductModal";
import { HistorialModal } from "../../../components/admin/HistorialModal";
import { ImportPreviewModal } from "../../../components/admin/ImportPreviewModal";
import { PriceChart } from "../../../components/admin/PriceChart";
import { Product } from "../../../types";

// ── Toast ─────────────────────────────────────────────────────────────────────
type Toast = { id: number; type: "success" | "error"; message: string };

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white min-w-[300px] ${
            t.type === "success" ? "bg-[#111]" : "bg-red-600"
          }`}
        >
          {t.type === "success" ? <FiCheckCircle size={15} /> : <FiAlertCircle size={15} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
            <FiX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Stats editoriales ─────────────────────────────────────────────────────────
function EditorialStats({ stats }: {
  stats: { total: number; activos: number; marcas: number; categorias: number };
}) {
  const pct = stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0;

  return (
    <div className="flex border border-[#E0DED8] rounded-lg overflow-hidden bg-white">
      {/* Principal */}
      <div className="flex-[1.3] px-8 py-6 border-r border-[#E0DED8]">
        <div
          className="font-medium text-[#111] leading-none tracking-tight"
          style={{ fontSize: "clamp(36px, 4vw, 52px)", letterSpacing: "-0.03em" }}
        >
          {stats.total > 0 ? stats.total.toLocaleString("es-AR") : "—"}
        </div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-[#aaa] mt-3">
          Productos en catálogo
        </div>
        {stats.total > 0 && (
          <div className="text-[11px] text-[#DF8635] mt-2 font-medium">
            ↑ {pct}% activos
          </div>
        )}
      </div>

      {/* Secundarias */}
      <div className="flex-1 flex flex-col divide-y divide-[#E0DED8]">
        <div className="flex items-center justify-between px-6 py-4 flex-1">
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Activos</span>
          <span className="text-[17px] font-medium text-[#111]">
            {stats.activos > 0 ? stats.activos.toLocaleString("es-AR") : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-6 py-4 flex-1">
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Marcas</span>
          <span className="text-[17px] font-medium text-[#111]">
            {stats.marcas > 0 ? stats.marcas : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-6 py-4 flex-1">
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Categorías</span>
          <span className="text-[17px] font-medium text-[#111]">
            {stats.categorias > 0 ? stats.categorias : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PanelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [historialProductId, setHistorialProductId] = useState<string>();
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, marcas: 0, categorias: 0 });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/productos/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setStats({
            total: d.data.total,
            activos: d.data.total,
            marcas: d.data.marcas?.length ?? 0,
            categorias: d.data.categorias?.length ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [tableRefreshKey]);

  const addToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]">
        <div className="w-5 h-5 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

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
      setIsModalOpen(false);
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

  const categorias = ["Pisos", "Maderas", "Decks", "Revestimientos", "Porcelanato", "Accesorios"];

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* ── Topbar ── */}
      <header className="bg-white border-b border-[#E0DED8] h-13 flex items-center px-6 shrink-0 sticky top-0 z-30" style={{ height: "52px" }}>
        <div className="flex items-center gap-5 flex-1">
          <img src="/logo.svg" alt="Maxipiso" className="h-6" />
          <span className="text-[#E0DED8] text-lg select-none">|</span>
          <nav className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[#111] px-3 py-1.5 border-b-[1.5px] border-[#111]">
              Productos
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[11px] text-[#aaa] hidden sm:block">{session.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-1.5 text-[11px] text-[#888] hover:text-[#111] transition-colors uppercase tracking-[0.06em]"
          >
            <FiLogOut size={13} />
            Salir
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">

        {/* Header de sección + acciones */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-[#111] tracking-tight">Gestión de Productos</h1>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#aaa] mt-1">
              Maxipiso Mayorista — Catálogo
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-medium text-[#555] border border-[#E0DED8] bg-white hover:border-[#bbb] hover:text-[#111] transition-all rounded"
            >
              <FiDownload size={13} />
              Exportar
            </button>
            <label className="flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-medium text-[#555] border border-[#E0DED8] bg-white hover:border-[#bbb] hover:text-[#111] transition-all rounded cursor-pointer">
              <FiUpload size={13} />
              Importar
              <input type="file" accept=".xlsx,.xls,.xlsm" onChange={handleImportSelect} className="hidden" disabled={isLoading} />
            </label>
            <button
              onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] transition-colors rounded"
            >
              <FiPlus size={14} />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Stats editoriales */}
        <EditorialStats stats={stats} />

        {/* Gráfico de precios */}
        <PriceChart />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ccc]" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por SKU, nombre o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[12px] border border-[#E0DED8] bg-white rounded focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc]"
            />
          </div>
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="sm:w-48 px-3 py-2 text-[12px] border border-[#E0DED8] bg-white rounded focus:outline-none focus:border-[#aaa] text-[#555] transition-colors"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-[#E0DED8] rounded overflow-hidden">
          <ProductTable
            refreshKey={tableRefreshKey}
            onEdit={(product) => { setSelectedProduct(product); setIsModalOpen(true); }}
            onDelete={() => {
              setTableRefreshKey((v) => v + 1);
              addToast("success", "Producto eliminado");
            }}
            onViewHistory={(productId) => { setHistorialProductId(productId); setIsHistorialOpen(true); }}
            searchTerm={searchTerm}
            marca={categoriaFilter}
          />
        </div>

      </main>

      {/* Modales */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
        onSave={handleSaveProduct}
        product={selectedProduct}
        isLoading={isLoading}
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
