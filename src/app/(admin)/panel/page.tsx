"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiPlus, FiDownload, FiUpload, FiLogOut, FiPackage,
  FiTag, FiLayers, FiCheckCircle, FiAlertCircle, FiX,
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
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white min-w-[280px] ${
            t.type === "success" ? "bg-[#111]" : "bg-red-600"
          }`}
        >
          {t.type === "success" ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100">
            <FiX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = "orange" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: "orange" | "gray";
}) {
  return (
    <div className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        color === "orange" ? "bg-[#DF8635]/10 text-[#DF8635]" : "bg-gray-100 text-gray-500"
      }`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xl font-bold text-[#111]">{value}</div>
        <div className="text-xs text-gray-400 font-medium">{label}</div>
        {sub && <div className="text-xs text-gray-300 mt-0.5">{sub}</div>}
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

  // Cargar stats
  useEffect(() => {
    fetch("/api/productos?skip=0&take=1")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data) setStats((prev) => ({ ...prev, total: d.data.total }));
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
      <div className="flex items-center justify-center min-h-screen bg-[#F4F4F2]">
        <div className="w-6 h-6 border-2 border-[#DF8635]/30 border-t-[#DF8635] rounded-full animate-spin" />
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
      if (!res.ok) throw new Error("Error al guardar");
      setIsModalOpen(false);
      setSelectedProduct(null);
      setTableRefreshKey((v) => v + 1);
      addToast("success", selectedProduct ? "Producto actualizado correctamente" : "Producto creado correctamente");
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
      if (!res.ok) throw new Error("Error al analizar el archivo");
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
      addToast("success", `${data.data.createdCount} creados, ${data.data.updatedCount} actualizados`);
    } catch {
      addToast("error", "Error al importar el archivo");
    } finally {
      setIsLoading(false);
    }
  };

  const categorias = ["Pisos", "Maderas", "Decks", "Revestimientos", "Porcelanato", "Accesorios"];

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col">

      {/* ── Topbar ── */}
      <header className="bg-[#111111] h-14 flex items-center px-6 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3 flex-1">
          <img src="/logo.svg" alt="Maxipiso" className="h-7 brightness-0 invert" />
          <span className="text-white/20 text-lg font-light select-none">|</span>
          <span className="text-white/60 text-sm">Panel de Administración</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs hidden sm:block">{session.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
          >
            <FiLogOut size={15} />
            Salir
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Encabezado de sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111]">Gestión de Productos</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Administrá el catálogo completo de Maxipiso
            </p>
          </div>

          {/* Acciones principales */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-all shadow-sm"
            >
              <FiDownload size={15} />
              Exportar
            </button>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-all shadow-sm cursor-pointer">
              <FiUpload size={15} />
              Importar
              <input type="file" accept=".xlsx,.xls,.xlsm" onChange={handleImportSelect} className="hidden" disabled={isLoading} />
            </label>
            <button
              onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DF8635] hover:bg-[#c97220] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <FiPlus size={16} />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={FiPackage} label="Total productos" value={stats.total || "—"} color="orange" />
          <KpiCard icon={FiCheckCircle} label="Productos activos" value={stats.activos || "—"} color="gray" />
          <KpiCard icon={FiTag} label="Marcas" value={stats.marcas || "—"} color="gray" />
          <KpiCard icon={FiLayers} label="Categorías" value={categorias.length} color="gray" />
        </div>

        {/* Gráfico de precios */}
        <PriceChart />

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por SKU, nombre o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#DF8635] focus:ring-2 focus:ring-[#DF8635]/10 transition-all"
              />
            </div>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="sm:w-52 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#DF8635] focus:ring-2 focus:ring-[#DF8635]/10 bg-white text-gray-600 transition-all"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
