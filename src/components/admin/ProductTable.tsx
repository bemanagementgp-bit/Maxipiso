// @ts-nocheck
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiEdit2, FiTrash2, FiClock, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiPackage, FiMenu, FiArrowUpRight } from "react-icons/fi";
import { isRemoteImageUrl } from "@/lib/google-drive";
import { getGridColumns, getCategoryConfig } from "@/lib/category-fields";

const TABLA_CONFIG: Record<string, { dot: string; label: string }> = {
  pisos_flotantes: { dot: "#f59e0b", label: "Pisos Flotantes"  },
  porcellanatos:   { dot: "#8b5cf6", label: "Porcelanatos"    },
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
      <Image src={src} alt={alt} fill sizes="40px" className="object-cover" />
    </div>
  );
}

const GRID_MEASURE: Record<string, { unitField: string; defaultUnit: string }> = {
  espesor: { unitField: "espesorUm", defaultUnit: "mm" },
  ancho: { unitField: "anchoUm", defaultUnit: "mm" },
  largo: { unitField: "largoUm", defaultUnit: "mm" },
  base: { unitField: "baseUm", defaultUnit: "m²" },
  baseTabla: { unitField: "baseTablUm", defaultUnit: "m²" },
};

function formatCellValue(value: unknown, type: string, key?: string, product?: Record<string, unknown>): string {
  if (value == null || value === "") return "-";
  if (type === "number") {
    const n = Number(value);
    if (isNaN(n)) return String(value);
    return n.toLocaleString("es-AR", { minimumFractionDigits: n % 1 === 0 ? 0 : 2 });
  }
  const text = String(value);
  if (key && product && GRID_MEASURE[key]) {
    const m = GRID_MEASURE[key];
    const unit = String(product[m.unitField] ?? "").trim() || m.defaultUnit;
    if (!text.toLowerCase().endsWith(unit.toLowerCase()) && !/[a-zA-Z²]/.test(text)) {
      return `${text} ${unit}`;
    }
  }
  return text;
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

function PriceCell({ p }: { p: any }) {
  const priceValue = p.precioM2 != null && p.precioM2 > 0 ? p.precioM2 : p.precio != null && p.precio > 0 ? p.precio : 0;
  const currency = priceValue > 500 ? "$" : "u$d";
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

function SkeletonRow({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="pl-3 pr-2 py-3 w-[60px]">
        <div className="w-10 h-10 rounded-md bg-gray-100 animate-pulse" />
      </td>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: 60 + Math.random() * 80 }} />
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
  const [dragIdx, setDragIdx]             = useState<number | null>(null);
  const [overIdx, setOverIdx]             = useState<number | null>(null);
  const [dragPageTarget, setDragPageTarget] = useState<"prev" | "next" | null>(null);
  const [saving, setSaving]               = useState(false);
  const [orderDirty, setOrderDirty]       = useState(false);
  const [saveMsg, setSaveMsg]             = useState<string | null>(null);
  const [moveTarget, setMoveTarget]       = useState<{ id: string; nombre: string } | null>(null);
  const [movePos, setMovePos]             = useState("");
  const router = useRouter();
  const PER_PAGE = 10;

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    const row = (e.target as HTMLElement).closest("tr");
    if (row) row.style.opacity = "0.4";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const row = (e.target as HTMLElement).closest("tr");
    if (row) row.style.opacity = "1";
    setDragIdx(null);
    setOverIdx(null);
    setDragPageTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };

  const handlePageDragOver = (e: React.DragEvent, target: "prev" | "next") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragPageTarget(target);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return; }
    const updated = [...productos];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(dropIdx, 0, moved);
    setProductos(updated);
    setDragIdx(null);
    setOverIdx(null);
    setOrderDirty(true);
    setSaveMsg(null);
  };

  const saveOrder = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const pageOffset = (page - 1) * PER_PAGE;
      const items = productos.map((p, i) => ({ id: p.id, sortOrder: pageOffset + i }));
      const res = await fetch("/api/productos/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, tabla: tablaFilter }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setOrderDirty(false);
      setSaveMsg("Orden guardado");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch {
      setSaveMsg("Error al guardar el orden");
    }
    setSaving(false);
  };

  const moveItemToPosition = async (itemId: string, pos: number) => {
    const res = await fetch("/api/productos/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: itemId, sortOrder: pos }],
        tabla: tablaFilter,
      }),
    });
    if (!res.ok) throw new Error("Error al mover producto");
  };

  const handleMoveToPosition = async () => {
    if (!moveTarget || !movePos) return;
    const pos = parseInt(movePos, 10);
    if (isNaN(pos) || pos < 1) return;
    setSaving(true);
    try {
      await moveItemToPosition(moveTarget.id, pos - 1);
      setMoveTarget(null);
      setMovePos("");
      fetchProductos((page - 1) * PER_PAGE);
      setSaveMsg("Producto movido");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch {
      setSaveMsg("Error al mover producto");
    }
    setSaving(false);
  };

  const handlePageDrop = async (e: React.DragEvent, target: "prev" | "next") => {
    e.preventDefault();
    setDragPageTarget(null);
    if (dragIdx === null || !tablaFilter || orderDirty) return;
    const item = productos[dragIdx];
    if (!item) return;
    const targetPage = target === "next" ? page + 1 : page - 1;
    if (targetPage < 1 || targetPage > totalPages) return;
    const targetIndex = target === "next" ? page * PER_PAGE : (page - 2) * PER_PAGE;
    setSaving(true);
    try {
      await moveItemToPosition(item.id, targetIndex);
      setDragIdx(null);
      setOverIdx(null);
      setOrderDirty(false);
      setPage(targetPage);
      fetchProductos((targetPage - 1) * PER_PAGE);
      setSaveMsg("Producto movido a la página " + targetPage);
      setTimeout(() => setSaveMsg(null), 2500);
    } catch {
      setSaveMsg("Error al mover producto");
    }
    setSaving(false);
  };

  const isDedicatedView = !!tablaFilter;
  const catConfig = tablaFilter ? getCategoryConfig(tablaFilter) : null;
  const gridCols = tablaFilter ? getGridColumns(tablaFilter) : [];

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
      setOrderDirty(false);
      setSaveMsg(null);
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

  const goToPage = (p: number) => {
    if (orderDirty) {
      setSaveMsg("Guarda el orden antes de cambiar de página");
      return;
    }
    setPage(p);
    fetchProductos((p - 1) * PER_PAGE);
  };

  if (error) return (
    <div className="flex items-center gap-2 px-6 py-10 text-sm text-red-500">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{error}
    </div>
  );

  const cfg = (tabla: string) => TABLA_CONFIG[tabla] ?? { dot: "#9ca3af", label: tabla ?? "-" };

  // ──── GRILLA DEDICADA POR CATEGORÍA ────────────────────────────
  if (isDedicatedView && gridCols.length > 0) {
    const excludeFromExtra = new Set(["sku", "nombre", "especie", "marca", "stock", "isActive"]);
    const extraCols = gridCols.filter((c) => !excludeFromExtra.has(c.key));

    return (
      <div className="flex flex-col">
        {/* Badge de categoría */}
        {catConfig && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catConfig.dot }} />
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.08em]">{catConfig.label}</span>
              <span className="text-[10px] text-gray-400 ml-1">{total} productos</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveOrder}
                disabled={!orderDirty || saving}
                className="h-8 px-3 text-[11px] font-semibold rounded-sm transition-colors text-white bg-[#111] hover:bg-[#333] disabled:bg-gray-300 disabled:text-gray-500"
              >
                Guardar orden
              </button>
              {orderDirty && !saving && (
                <span className="text-[11px] text-orange-600">Cambios sin guardar</span>
              )}
              {saving && (
                <span className="text-[11px] text-[#DF8635] animate-pulse">Guardando orden...</span>
              )}
              {saveMsg && !saving && (
                <span className="text-[11px] text-gray-600">{saveMsg}</span>
              )}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#111] text-white">
                {isDedicatedView && <th className="w-[30px] px-1 py-3" />}
                <th className="w-[50px] px-3 py-3" />
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Producto</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Marca</th>
                {extraCols.map((col) => (
                  <th key={col.key} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Estado</th>
                <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={4 + extraCols.length} />)
              ) : (
                <>
                  {dragIdx !== null && page > 1 && (
                    <tr
                      onDragOver={(e) => handlePageDragOver(e, "prev")}
                      onDrop={(e) => handlePageDrop(e, "prev")}
                      className={`bg-[#f8fafc] text-center ${dragPageTarget === "prev" ? "border-2 border-dashed border-[#DF8635]" : "border-t border-gray-200"}`}
                    >
                      <td colSpan={4 + extraCols.length + 1} className="px-4 py-4 text-[12px] text-gray-500">
                        Suelta aquí para mover el producto a la página {page - 1}
                      </td>
                    </tr>
                  )}
                  {productos.length === 0 ? (
                    <tr>
                      <td colSpan={4 + extraCols.length + 1} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <FiPackage size={28} className="text-gray-200" />
                          <p className="text-[11px] uppercase tracking-[0.1em] text-gray-300 font-medium">Sin resultados</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    productos.map((p, rowIdx) => {
                  const isHovered = hoveredRow === p.id;
                  const imgSrc = p.imagenes ? (() => { try { const arr = JSON.parse(p.imagenes); return Array.isArray(arr) ? arr[0] : null; } catch { return null; } })() : null;
                  const nombre = p.nombre ?? p.especie ?? p.sku;
                  const isOver = overIdx === rowIdx && dragIdx !== rowIdx;
                  return (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, rowIdx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, rowIdx)}
                      onDrop={(e) => handleDrop(e, rowIdx)}
                      onMouseEnter={() => setHoveredRow(p.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`bg-white hover:bg-gray-50 transition-colors duration-100 ${isOver ? "border-t-2 !border-t-[#DF8635]" : ""}`}
                      style={{
                        borderLeft: `3px solid ${isHovered ? catConfig?.dot ?? "#999" : "transparent"}`,
                        transition: "border-color 150ms, background-color 100ms",
                      }}
                    >
                      <td className="px-1 py-2.5 w-[30px] cursor-grab active:cursor-grabbing">
                        <FiMenu size={14} className="text-gray-300 hover:text-gray-500 mx-auto" />
                      </td>
                      <td className="pl-3 pr-1 py-2.5 w-[50px]">
                        <Thumb src={imgSrc} alt={nombre} />
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">{nombre}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">{p.sku}</p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[11px] text-gray-600">{p.marca ?? "-"}</span>
                      </td>
                      {extraCols.map((col) => (
                        <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                          {col.key === "stock" ? (
                            <StockCell stock={p[col.key]} />
                          ) : col.key.startsWith("precio") ? (
                            <span className="text-[11px] tabular-nums text-gray-700 font-medium">
                              {p[col.key] != null ? Number(p[col.key]).toLocaleString("es-AR", { minimumFractionDigits: 2 }) : "-"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-600">{formatCellValue(p[col.key], col.type, col.key, p)}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-400 border-gray-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                          {p.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={`flex items-center justify-center gap-0.5 transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-25"}`}>

                          <button onClick={() => onViewHistory(p.id)} title="Historial" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><FiClock size={13} /></button>
                          <button onClick={() => onEdit(p)} title="Editar" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><FiEdit2 size={13} /></button>
                          <button
                            onClick={() => {
                              setMoveTarget({ id: p.id, nombre });
                              setMovePos(String((page - 1) * PER_PAGE + rowIdx + 1));
                            }}
                            title="Mover a posición"
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <FiArrowUpRight size={13} />
                          </button>
                          {deleteConfirm === p.id ? (
                            <div className="flex items-center gap-1 ml-1">
                              <button onClick={() => handleDelete(p.id)} className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors">Sí</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1 py-0.5">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(p.id)} title="Eliminar" className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><FiTrash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </>
          )}
            </tbody>
          </table>
        </div>

        {!isLoading && page < totalPages && dragIdx !== null && (
          <div
            onDragOver={(e) => handlePageDragOver(e, "next")}
            onDrop={(e) => handlePageDrop(e, "next")}
            className={`mt-2 rounded-md border border-dashed p-3 text-center text-sm text-gray-500 ${dragPageTarget === "next" ? "border-[#DF8635] bg-orange-50/50" : "border-gray-200 bg-white"}`}
          >
            Suelta aquí para mover el producto a la página {page + 1}
          </div>
        )}

        {!isLoading && totalPages > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} goToPage={goToPage} />
        )}

        {moveTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Mover producto</p>
                  <p className="mt-1 text-xs text-gray-500">{moveTarget.nombre}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoveTarget(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  Cerrar
                </button>
              </div>
              <label className="mt-5 block text-[11px] uppercase tracking-[0.12em] text-gray-500">Nueva posición</label>
              <input
                type="number"
                min={1}
                max={total}
                value={movePos}
                onChange={(e) => setMovePos(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#111] focus:outline-none"
                placeholder={`1 - ${total}`}
              />
              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMoveTarget(null)}
                  className="h-9 px-3 text-[11px] font-semibold rounded-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleMoveToPosition}
                  disabled={saving || !movePos}
                  className="h-9 px-3 text-[11px] font-semibold rounded-sm text-white bg-[#111] hover:bg-[#333] disabled:bg-gray-300 disabled:text-gray-500"
                >
                  Mover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──── GRILLA PRINCIPAL (todas las categorías) ──────────────────
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
                      <Thumb src={p.imagen ?? null} alt={p.nombre ?? ""} />
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

                        <button onClick={() => onViewHistory(p.id)} title="Historial" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><FiClock size={14} /></button>
                        <button onClick={() => onEdit(p)} title="Editar" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><FiEdit2 size={14} /></button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <button onClick={() => handleDelete(p.id)} className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors">Confirmar</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(p.id)} title="Eliminar" className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><FiTrash2 size={14} /></button>
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

      {!isLoading && totalPages > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} goToPage={goToPage} />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, total, perPage, goToPage }: any) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
      <span className="text-[11px] text-gray-400">
        {total > 0
          ? `Mostrando ${(page-1)*perPage+1}-${Math.min(page*perPage,total)} de ${total.toLocaleString()} productos`
          : "Sin productos"}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => goToPage(1)} disabled={page === 1} title="Primera página" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><FiChevronsLeft size={14} /></button>
          <button onClick={() => goToPage(Math.max(1,page-1))} disabled={page===1} title="Página anterior" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><FiChevronLeft size={14} /></button>
          {Array.from({ length: Math.min(5,totalPages) }, (_,i) => {
            const pg = totalPages<=5 ? i+1 : Math.max(1,Math.min(page-2,totalPages-4))+i;
            return (
              <button key={pg} onClick={() => goToPage(pg)} className={`w-7 h-7 text-[11px] font-medium rounded-md transition-colors ${pg===page ? "bg-[#111] text-white" : "text-gray-500 hover:bg-gray-200"}`}>{pg}</button>
            );
          })}
          <button onClick={() => goToPage(Math.min(totalPages,page+1))} disabled={page===totalPages} title="Página siguiente" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><FiChevronRight size={14} /></button>
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} title="Última página" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><FiChevronsRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
