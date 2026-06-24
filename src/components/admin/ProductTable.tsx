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
  marca?: string;
  refreshKey?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Pisos:          "bg-amber-50 text-amber-700",
  Maderas:        "bg-orange-50 text-orange-700",
  Decks:          "bg-green-50 text-green-700",
  Revestimientos: "bg-blue-50 text-blue-700",
  Porcelanato:    "bg-purple-50 text-purple-700",
  Accesorios:     "bg-gray-100 text-gray-600",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 2 ? "80%" : i === 7 ? "60px" : "60%" }} />
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

  const goToPage = (p: number) => {
    setPage(p);
    fetchProductos((p - 1) * PER_PAGE);
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 text-red-600 text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#111111] text-white">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/60">SKU</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Producto</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Marca</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Categoría</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Imagen</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Precio</th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                      <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2Z"/>
                    </svg>
                    <span className="text-sm font-medium">No hay productos</span>
                    <span className="text-xs">Intentá con otro filtro o creá un nuevo producto</span>
                  </div>
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-[#DF8635]/[0.03] transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {p.sku}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-[#111] leading-snug">{p.nombre}</span>
                    {!p.isActive && (
                      <span className="ml-2 text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">Inactivo</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{p.marca}</td>
                  <td className="px-5 py-3.5">
                    {p.categoria ? (
                      <div className="space-y-0.5">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[p.categoria] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.categoria}
                        </span>
                        {p.subcategoria && (
                          <p className="text-gray-400 text-xs truncate max-w-[130px]">{p.subcategoria}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.imagen ? (
                      isRemoteImageUrl(p.imagen) ? (
                        <img src={p.imagen} alt={p.nombre} className="w-10 h-10 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                          <Image src={p.imagen} alt={p.nombre} fill className="object-cover" />
                        </div>
                      )
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-300">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-[#111]">
                    ${p.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onViewHistory(p.id)}
                        title="Ver historial"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      >
                        <FiClock size={13} />
                        <span className="hidden xl:inline">Historial</span>
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        title="Editar"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#DF8635] hover:bg-[#DF8635]/10 transition-colors"
                      >
                        <FiEdit2 size={13} />
                        <span className="hidden xl:inline">Editar</span>
                      </button>

                      {deleteConfirm === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          title="Eliminar"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <FiTrash2 size={13} />
                          <span className="hidden xl:inline">Eliminar</span>
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

      {/* Footer de tabla: total + paginación */}
      {!isLoading && productos.length > 0 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} de <strong className="text-gray-600">{total}</strong> productos
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-[#111] text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
