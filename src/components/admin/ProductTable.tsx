"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiEdit2, FiTrash2, FiClock, FiChevronLeft, FiChevronRight, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { Product } from "@/types";
import { isRemoteImageUrl } from "@/lib/google-drive";

interface ProductTableProps {
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onViewHistory: (productId: string) => void;
  searchTerm?: string;
  marca?: string;
  refreshKey?: number;
}

const CATEGORY_STYLES: Record<string, string> = {
  Pisos:          "bg-amber-50 text-amber-800",
  Maderas:        "bg-orange-50 text-orange-800",
  Decks:          "bg-emerald-50 text-emerald-800",
  Revestimientos: "bg-sky-50 text-sky-800",
  Porcelanato:    "bg-violet-50 text-violet-800",
  Accesorios:     "bg-stone-100 text-stone-600",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-[#F0EEE8]">
      {[0.5, 1.6, 0.8, 0.7, 0.4, 0.5, 0.6, 0.7].map((w, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-3 bg-[#F0EEE8] rounded animate-pulse" style={{ width: `${w * 60}px`, maxWidth: "100%" }} />
        </td>
      ))}
    </tr>
  );
}

export function ProductTable({
  onEdit, onDelete, onViewHistory,
  searchTerm = "", marca = "", refreshKey = 0,
}: ProductTableProps) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const router = useRouter();

  const PER_PAGE = 10;

  const fetchProductos = async (skip = 0) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(PER_PAGE),
        ...(searchTerm && { search: searchTerm }),
        ...(marca && { marca }),
      });
      const res = await fetch(`/api/productos?${params}`);
      if (!res.ok) {
        if (res.status === 401) { router.push("/auth/login"); return; }
        throw new Error("Error al cargar productos");
      }
      const data = await res.json();
      setProductos(data.data.productos);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchProductos(0);
  }, [searchTerm, marca, refreshKey]);

  const handleDelete = async (productId: string) => {
    try {
      const res = await fetch(`/api/productos/${productId}`, { method: "DELETE" });
      if (res.ok) {
        fetchProductos((page - 1) * PER_PAGE);
        onDelete(productId);
      }
    } catch {}
    setDeleteConfirm(null);
  };

  const handleToggle = async (productId: string) => {
    setTogglingId(productId);
    try {
      const res = await fetch(`/api/productos/${productId}/toggle`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        setProductos((prev) =>
          prev.map((p) => p.id === productId ? { ...p, isActive: data.data.isActive } : p)
        );
      }
    } catch {}
    setTogglingId(null);
  };

  const goToPage = (p: number) => {
    setPage(p);
    fetchProductos((p - 1) * PER_PAGE);
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 px-6 py-8 text-[12px] text-red-500">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#E0DED8] bg-[#FAFAF8]">
              <th className="px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">SKU</th>
              <th className="px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Producto</th>
              <th className="px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Marca</th>
              <th className="px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Categoría</th>
              <th className="px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Imagen</th>
              <th className="px-5 py-3 text-right text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Precio</th>
              <th className="px-5 py-3 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Estado</th>
              <th className="px-5 py-3 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-[#ccc]">
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                      <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2Z"/>
                    </svg>
                    <span className="text-[11px] text-[#bbb]">No se encontraron productos</span>
                  </div>
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="border-b border-[#F0EEE8] hover:bg-[#FAFAF8] transition-colors">

                  <td className="px-5 py-3.5">
                    <span className="font-mono text-[10px] text-[#999] tracking-wide">{p.sku}</span>
                  </td>

                  <td className="px-5 py-3.5 max-w-[220px]">
                    <span className="text-[#111] font-medium truncate block">{p.nombre}</span>
                  </td>

                  <td className="px-5 py-3.5 text-[#777]">{p.marca}</td>

                  <td className="px-5 py-3.5">
                    {p.categoria ? (
                      <span className={`inline-block text-[9px] font-medium uppercase tracking-[0.06em] px-2 py-0.5 rounded-sm ${CATEGORY_STYLES[p.categoria] ?? "bg-stone-100 text-stone-600"}`}>
                        {p.categoria}
                      </span>
                    ) : (
                      <span className="text-[#ddd]">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    {p.imagen ? (
                      isRemoteImageUrl(p.imagen) ? (
                        <img src={p.imagen} alt={p.nombre} className="w-9 h-9 rounded object-cover border border-[#E0DED8]" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="relative w-9 h-9 rounded overflow-hidden border border-[#E0DED8]">
                          <Image src={p.imagen} alt={p.nombre} fill className="object-cover" />
                        </div>
                      )
                    ) : (
                      <div className="w-9 h-9 rounded bg-[#F0EEE8] flex items-center justify-center">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-[#ccc]">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                        </svg>
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right font-medium text-[#111]">
                    ${p.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>

                  {/* Toggle estado */}
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(p.id)}
                      disabled={togglingId === p.id}
                      className={`inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.06em] px-2 py-1 rounded-sm transition-all ${
                        p.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-[#F0EEE8] text-[#bbb] hover:bg-[#E8E5DE]"
                      } ${togglingId === p.id ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {togglingId === p.id ? (
                        <div className="w-2.5 h-2.5 border border-current/30 border-t-current rounded-full animate-spin" />
                      ) : p.isActive ? (
                        <FiToggleRight size={11} />
                      ) : (
                        <FiToggleLeft size={11} />
                      )}
                      {p.isActive ? "Activo" : "Inactivo"}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => onViewHistory(p.id)}
                        title="Historial"
                        className="p-1.5 text-[#ccc] hover:text-[#777] hover:bg-[#F0EEE8] rounded transition-colors"
                      >
                        <FiClock size={13} />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        title="Editar"
                        className="p-1.5 text-[#ccc] hover:text-[#DF8635] hover:bg-[#FFF5E8] rounded transition-colors"
                      >
                        <FiEdit2 size={13} />
                      </button>

                      {deleteConfirm === p.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-[9px] font-medium uppercase tracking-[0.05em] text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-sm transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-[9px] font-medium uppercase tracking-[0.05em] text-[#aaa] hover:text-[#555] px-1.5 py-1 rounded-sm transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          title="Eliminar"
                          className="p-1.5 text-[#ccc] hover:text-red-400 hover:bg-red-50 rounded transition-colors"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla */}
      {!isLoading && productos.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E0DED8]">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#aaa]">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} de {total} productos
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 text-[#ccc] hover:text-[#777] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-7 h-7 text-[11px] rounded transition-colors ${
                      p === page
                        ? "bg-[#111] text-white"
                        : "text-[#999] hover:bg-[#F0EEE8]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-[#ccc] hover:text-[#777] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
