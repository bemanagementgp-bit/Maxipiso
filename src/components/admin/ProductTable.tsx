// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiEdit2, FiTrash2, FiClock, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiPackage } from "react-icons/fi";
import { isRemoteImageUrl } from "@/lib/google-drive";

const TABLA_CONFIG: Record<string, { dot: string; label: string }> = {
  pisos_flotantes: { dot: "#f59e0b", label: "Pisos Flotantes"  },
  porcellanatos:   { dot: "#8b5cf6", label: "Porcellanatos"    },
  revestimientos:  { dot: "#0ea5e9", label: "Revestimientos"   },
  pisos_vinilicos: { dot: "#f97316", label: "Pisos Vinilicos"  },
  pisos_madera:    { dot: "#84cc16", label: "Pisos Madera"     },
  decks:           { dot: "#10b981", label: "Decks"            },
  maderas:         { dot: "#a16207", label: "Maderas"          },
  accesorios:      { dot: "#6b7280", label: "Accesorios"       },
};

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return (
    <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
      <FiPackage size={14} className="text-gray-300" />
    </div>
  );
  if (isRemoteImageUrl(src)) return (
    <img src={src} alt={alt}
      className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
      referrerPolicy="no-referrer" loading="lazy"
    />
  );
  return (
    <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200 shrink-0">
      <Image src={src} alt={alt} fill className="object-cover" />
    </div>
  );
}

function PriceCell({ p }: { p: any }) {
  const currency = p.moneda ?? "USD";
  if (p.precioM2 != null && p.precioM2 > 0) return (
    <span className="tabular-nums">
      <span className="text-[10px] text-gray-400 mr-0.5">{currency}</span>
      <span className="font-semibold text-gray-900">{Number(p.precioM2).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
      <span className="text-[10px] text-gray-400 ml-0.5">/m2</span>
    </span>
  );
  if (p.precio != null && p.precio > 0) return (
    <span className="tabular-nums">
      <span className="text-[10px] text-gray-400 mr-0.5">{currency}</span>
      <span className="font-semibold text-gray-900">{Number(p.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
    </span>
  );
  return <span className="text-gray-300 text-[11px] italic">Consultar</span>;
}

function StockCell({ stock }: { stock: number | null }) {
  if (stock == null) return <span className="text-gray-300">-</span>;
  const dot = stock === 0 ? "bg-red-400" : stock < 10 ? "bg-yellow-400" : "bg-emerald-400";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className={`tabular-nums font-medium ${stock === 0 ? "text-red-500" : "text-gray-700"}`}>{stock}</span>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      <td className="pl-3 pr-2 py-3 w-[60px]">
        <div className="w-10 h-10 rounded-md bg-gray-100 animate-pulse" />
      </td>
      {[180, 90, 130, 90, 50, 60].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
          {i === 0 && <div className="h-2.5 bg-gray-100 rounded animate-pulse mt-1.5 w-16" />}
        </td>
      ))}
      <td className="px-4 py-3 w-[90px]">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-16 mx-auto" />
      </td>
    </tr>
  );
}

export function ProductTable({
  onEdit, onDelete, onViewHistory,
  searchTerm = "", tablaFilter = "", marcaFilter = "",
  estadoFilter = "activo", refreshKey = 0,
}: any) {
  const [productos, setProductos]         = useState<any[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState("");
  const [page, setPage]                   = useState(1);
  const [total, setTotal]                 = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow]       = useState<string | null>(null);
  const router = useRouter();
  const PER_PAGE = 10;

  const fetchProductos = async (skip = 0) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(skip), take: String(PER_PAGE), estado: estadoFilter });
      if (searchTerm)  params.set("search", searchTerm);
      if (tablaFilter) params.set("tabla", tablaFilter);
      if (marcaFilter) params.set("marca", marcaFilter);
      const res = await fetch(`/api/productos?${params}`);
      if (!res.ok) {
        if (res.status === 401) { router.push("/auth/login"); return; }
        throw new Error("Error al cargar productos");
      }
      const { data } = await res.json();
      setProductos(data.productos ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { setPage(1); fetchProductos(0); }, [searchTerm, tablaFilter, marcaFilter, estadoFilter, refreshKey]);

  const handleDelete = async (productId: string) => {
    try {
      const res = await fetch(`/api/productos/${productId}`, { method: "DELETE" });
      if (res.ok) { fetchProductos((page - 1) * PER_PAGE); onDelete(productId); }
    } catch {}
    setDeleteConfirm(null);
  };

  const goToPage = (p: number) => { setPage(p); fetchProductos((p - 1) * PER_PAGE); };

  if (error) return (
    <div className="flex items-center gap-2 px-6 py-10 text-sm text-red-500">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{error}
    </div>
  );

  const cfg = (tabla: string) => TABLA_CONFIG[tabla] ?? { dot: "#9ca3af", label: tabla ?? "-" };

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#111] text-white">
              <th className="w-[60px] px-5 py-3.5" />
              <th className="px-4 py-3.5 text-left   text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Producto</th>
              <th className="px-4 py-3.5 text-left   text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Marca</th>
              <th className="px-4 py-3.5 text-left   text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Categoria</th>
              <th className="px-4 py-3.5 text-right  text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Precio</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Stock</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Estado</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FiPackage size={28} className="text-gray-200" />
                    <p className="text-[11px] uppercase tracking-[0.1em] text-gray-300 font-medium">Sin resultados</p>
                  </div>
                </td>
              </tr>
            ) : (
              productos.map((p) => {
                const { dot, label } = cfg(p._tabla);
                const isHovered = hoveredRow === p.id;
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className="bg-white hover:bg-gray-50 transition-colors duration-100"
                    style={{
                      borderLeft: `3px solid ${isHovered ? dot : "transparent"}`,
                      transition: "border-color 150ms, background-color 100ms",
                    }}
                  >
                    <td className="pl-3 pr-2 py-3 w-[60px]">
                      <Thumb src={p.imagen} alt={p.nombre ?? ""} />
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{p.nombre ?? "-"}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5 tracking-wide">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[12px] text-gray-600">
                        {p.marca ?? <span className="text-gray-300">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                        <span className="text-[12px] text-gray-700 font-medium">{p._tablaLabel ?? label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceCell p={p} />
                    </td>
                    <td className="px-4 py-3 text-center text-[12px]">
                      <StockCell stock={p.stock} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                        p.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                        {p.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center justify-center gap-0.5 transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-25"}`}>
                        <button
                          onClick={() => onViewHistory(p.id)} title="Historial"
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FiClock size={14} />
                        </button>
                        <button
                          onClick={() => onEdit(p)} title="Editar"
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors"
                            >Confirmar</button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)} title="Eliminar"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
          <span className="text-[11px] text-gray-400">
            {total > 0
              ? `Mostrando ${(page-1)*PER_PAGE+1}-${Math.min(page*PER_PAGE,total)} de ${total.toLocaleString()} productos`
              : "Sin productos"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Primera página */}
              <button
                onClick={() => goToPage(1)} disabled={page === 1}
                title="Primera página"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronsLeft size={14} />
              </button>
              {/* Anterior */}
              <button
                onClick={() => goToPage(Math.max(1,page-1))} disabled={page===1}
                title="Página anterior"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5,totalPages) }, (_,i) => {
                const pg = totalPages<=5 ? i+1 : Math.max(1,Math.min(page-2,totalPages-4))+i;
                return (
                  <button
                    key={pg} onClick={() => goToPage(pg)}
                    className={`w-7 h-7 text-[11px] font-medium rounded-md transition-colors ${pg===page ? "bg-[#111] text-white" : "text-gray-500 hover:bg-gray-200"}`}
                  >{pg}</button>
                );
              })}
              {/* Siguiente */}
              <button
                onClick={() => goToPage(Math.min(totalPages,page+1))} disabled={page===totalPages}
                title="Página siguiente"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={14} />
              </button>
              {/* Última página */}
              <button
                onClick={() => goToPage(totalPages)} disabled={page === totalPages}
                title="Última página"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
