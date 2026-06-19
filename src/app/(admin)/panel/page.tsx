"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiLogOut, FiPlus, FiDownload, FiUpload } from "react-icons/fi";
import { ProductTable } from "../../../components/admin/ProductTable";
import { ProductModal } from "../../../components/admin/ProductModal";
import { HistorialModal } from "../../../components/admin/HistorialModal";
import { Product } from "../../../types";

export default function PanelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [historialProductId, setHistorialProductId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleSaveProduct = async (formData: any) => {
    setIsLoading(true);
    setError("");

    try {
      const method = selectedProduct ? "PUT" : "POST";
      const url = selectedProduct
        ? `/api/productos/${selectedProduct.id}`
        : "/api/productos";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Error al guardar producto");
      }

      await res.json();
      setIsModalOpen(false);
      setSelectedProduct(null);
      setError("");
      setTableRefreshKey((value) => value + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/productos/export");
      if (!res.ok) throw new Error("Error al exportar");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "productos.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error al exportar: " + err.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/productos/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al importar");

      const data = await res.json();
      alert(
        `Importación completada:\n${data.data.createdCount} creados\n${data.data.updatedCount} actualizados\n${data.data.skippedCount ?? 0} omitidos${data.data.errors?.length ? `\n\nPrimeros errores:\n- ${data.data.errors.slice(0, 3).join("\n- ")}` : ""}`
      );

      // Reset file input and refresh
      e.target.value = "";
      setTableRefreshKey((value) => value + 1);
    } catch (err: any) {
      alert("Error al importar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Panel de Administración - MaxiPiso
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Bienvenido, {session.user?.email}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <FiLogOut size={20} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Buscar por SKU, nombre o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Filtrar por marca..."
              value={marcaFilter}
              onChange={(e) => setMarcaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedProduct(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <FiPlus size={20} />
              Nuevo Producto
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <FiDownload size={20} />
              Exportar Excel
            </button>
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer">
              <FiUpload size={20} />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={handleImport}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <ProductTable
            refreshKey={tableRefreshKey}
            onEdit={(product) => {
              setSelectedProduct(product);
              setIsModalOpen(true);
            }}
            onDelete={() => {
              setTableRefreshKey((value) => value + 1);
            }}
            onViewHistory={(productId) => {
              setHistorialProductId(productId);
              setIsHistorialOpen(true);
            }}
            searchTerm={searchTerm}
            marca={marcaFilter}
          />
        </div>
      </main>

      {/* Modals */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleSaveProduct}
        product={selectedProduct}
        isLoading={isLoading}
      />

      <HistorialModal
        isOpen={isHistorialOpen}
        onClose={() => {
          setIsHistorialOpen(false);
          setHistorialProductId(undefined);
        }}
        productId={historialProductId}
      />
    </div>
  );
}
