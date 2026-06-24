"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiEdit2, FiTrash2, FiClock, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Product } from "@/types";
import { isRemoteImageUrl } from "@/lib/google-drive";

interface ProductTableProps {
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onViewHistory: (productId: string) => void;
  searchTerm?: string;
  categoriaFilter?: string;
  marcaFilter?: string;
  estadoFilter?: string;
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
      {[50, 160, 80, 90, 60, 70, 44, 64].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3 bg-[#F0EEE8] rounded animate-pulse" style={{ width: `${w}px`, maxWidth: "100%" }} />
        </td>
      ))}
    </tr>
  );
}

export function ProductTable({
  onEdit, onDelete, onViewHistory,
  searchTerm = "", categoriaFilter = "", marcaFilter = "",
  estadoFilter = "activo", refreshKey = 0,
}: ProductTableProps) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const router = useRouter();

  const PER_PAGE = 10;

  const fetchProductos = async (skip = 0) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(PER_PAGE),
        estado: estadoFilter,
        ...(searchTerm && { search: searchTerm }),
        ...(categoriaFilter && { categoria: categoriaFilter }),
        ...(marcaFilter && { marca: marcaFilter }),
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
  }, [searchTerm, categoriaFilter, marcaFilter, estadoFilter, refreshKey]);

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
              <th className="px-4 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">SKU</th>
              <th className="px-4 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Producto</th>
              <th className="px-4 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Marca</th>
              <th className="px-4 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Categoría</th>
              <th className="px-4 py-3 text-right text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Precio</th>
              <th className="px-4 py-3 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Estado</th>
              <th className="px-4 py-3 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Imagen</th>
              <th className="px-4 py-3 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#aaa]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[#ccc]">Sin resultados</p>
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="border-b border-[#F0EEE8] hover:bg-[#FAFAF8] transition-colors">

                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[10px] text-[#999] tracking-wide">{p.sku}</span>
                  </td>

                  <td className="px-4 py-3.5 max-w-[200px]">
                    <span className="text-[#111] font-medium truncate block leading-snug">{p.nombre}</span>
                    {p.subcategoria && (
                      <span className="text-[10px] text-[#bbb] truncate block mt-0.5">{p.subcategoria}</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-[#777]">{p.marca}</td>

                  <td className="px-4 py-3.5">
                    {p.categoria ? (
                      <span className={`inline-block text-[9px] font-medium uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm ${CATEGORY_STYLES[p.categoria] ?? "bg-stone-100 text-stone-600"}`}>
                        {p.categoria}
                      </span>
                    ) : (
                      <span className="text-[#ddd]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right font-medium text-[#111] tabular-nums">
                    ${p.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-block text-[9px] font-medium uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm ${
                      p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-[#F0EEE8] text-[#bbb]"
                    }`}>
                      {p.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    {p.imagen ? (
                      isRemoteImageUrl(p.imagen) ? (
                        <img src={p.imagen} alt={p.nombre} className="w-9 h-9 rounded-sm object-cover border border-[#E0DED8] mx-auto" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="relative w-9 h-9 rounded-sm overflow-hidden border border-[#E0DED8] mx-auto">
                          <Image src={p.imagen} alt={p.nombre} fill className="object-cover" />
                        </div>
                      )
                    ) : (
                      <div className="w-9 h-9 rounded-sm bg-[#F0EEE8] flex items-center justify-center mx-auto">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-[#ccc]">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                        </svg>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => onViewHistory(p.id)}
                        title="Historial"
                        className="p-1.5 text-[#ccc] hover:text-[#777] hover:bg-[#F0EEE8] rounded-sm transition-colors"
                      >
                        <FiClock size={13} />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        title="Editar"
                        className="p-1.5 text-[#bbb] hover:text-[#111] hover:bg-[#F0EEE8] rounded-sm transition-colors"
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
                            className="text-[9px] font-medium uppercase tracking-[0.05em] text-[#aaa] hover:text-[#555] px-1.5 py-1 rounded-sm"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          title="Eliminar"
                          className="p-1.5 text-[#ccc] hover:text-red-400 hover:bg-red-50 rounded-sm transition-colors"
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

      {/* Pie */}
      {!isLoading && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E0DED8]">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#aaa]">
            {productos.length > 0
              ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)} de ${total} productos`
              : `0 productos`}
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
                    className={`w-7 h-7 text-[11px] rounded-sm transition-colors ${
                      p === page ? "bg-[#111] text-white" : "text-[#999] hover:bg-[#F0EEE8]"
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
