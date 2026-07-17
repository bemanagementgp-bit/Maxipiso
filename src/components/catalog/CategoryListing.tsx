"use client";

import { useState, useEffect, useCallback, memo, useMemo, useRef } from "react";
import Link from "next/link";
import { FiPackage, FiSearch, FiX, FiChevronRight, FiChevronDown, FiArrowLeft } from "react-icons/fi";
import SafeImage from "./SafeImage";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CatalogItem = {
  id: string;
  sku: string;
  nombre?: string;
  especie?: string;
  marca?: string;
  linea?: string;
  precioM2?: number;
  precioCaja?: number;
  precio?: number;
  moneda?: string;
  stock?: number;
  imagen?: string;
  imagenes?: string;
  descripcion?: string;
  espesor?: string;
  ancho?: string;
  largo?: string;
  isActive: boolean;
  [key: string]: unknown;
};

export type SubcategoryDef = {
  key: string;
  label: string;
  apiSlug: string;
  filter?: { field: string; value: string };
  children?: SubcategoryDef[];
};

type FilterGroup = {
  label: string;
  values: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeImageUrl(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
  return `/${src}`;
}

function firstImage(item: CatalogItem): string | null {
  if (item.imagenes) {
    const raw = item.imagenes as string;
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr[0]) return normalizeImageUrl(arr[0]);
      } catch { /* ignore */ }
    } else {
      const first = trimmed.split(/[;,]/)[0]?.trim();
      if (first) return normalizeImageUrl(first);
    }
  }
  return null;
}

function displayName(item: CatalogItem): string {
  return item.nombre || item.especie || item.sku;
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

function ProductCardBase({
  item,
  categorySlug,
}: {
  item: CatalogItem;
  categorySlug: string;
}) {
  const img = firstImage(item);
  const name = displayName(item);
  const waText = encodeURIComponent(
    `Hola, quiero consultar disponibilidad y precio de: ${name} (SKU: ${item.sku}). ¿Me pueden asesorar?`
  );

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-100 hover:border-[#DF8635]/40 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_360px]"
    >
      <Link
        href={`/catalogo/${item.id}`}
        className="relative aspect-[4/3] bg-gray-50 overflow-hidden block shrink-0"
      >
        <SafeImage
          src={img ?? ""}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-mono px-2 py-0.5 rounded">
          {item.sku}
        </span>
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-1.5">
        {item.marca && (
          <p className="text-[10px] font-bold text-[#DF8635] uppercase tracking-widest">
            {item.marca}{item.linea ? ` · ${item.linea}` : ""}
          </p>
        )}

        <Link
          href={`/catalogo/${item.id}`}
          className="font-bold text-[#111111] text-sm leading-snug hover:text-[#DF8635] transition-colors line-clamp-2"
        >
          {name}
        </Link>

        {(item.espesor || item.ancho || item.largo) && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {item.espesor && (
              <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                Esp. {item.espesor}
              </span>
            )}
            {item.ancho && item.largo && (
              <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                {item.ancho}×{item.largo}
              </span>
            )}
          </div>
        )}

        {item.descripcion && (
          <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed">
            {item.descripcion}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 mt-auto pt-3">
          <Link
            href={`/catalogo/${item.id}`}
            className="text-center border border-gray-200 text-[#111111] text-xs font-semibold py-2.5 rounded-xl hover:border-[#DF8635] transition-colors"
          >
            Ver detalle
          </Link>
          <a
            href={`https://wa.me/5422143888894?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center bg-[#DF8635] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#c97220] transition-colors"
          >
            Consultar
          </a>
        </div>
      </div>
    </article>
  );
}

// Memoizado: al tipear en el buscador o cambiar filtros, sólo se re-renderizan
// las tarjetas cuyo `item` realmente cambió, no toda la grilla.
export const ProductCard = memo(ProductCardBase);

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-5 bg-gray-100 rounded w-1/2 mt-3" />
        <div className="h-9 bg-gray-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-[#DF8635]/10 flex items-center justify-center mb-5">
        <FiPackage size={36} className="text-[#DF8635]" />
      </div>
      <h3 className="text-xl font-bold text-[#111111] mb-2">Sin resultados</h3>
      <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
        No se encontraron productos en <strong>{label}</strong> con los filtros seleccionados.
      </p>
      <a
        href="https://wa.me/5422143888894?text=Hola%2C%20quiero%20consultar%20disponibilidad%20de%20productos"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 bg-[#DF8635] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#c97220] transition-colors"
      >
        Consultar por WhatsApp
      </a>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  title,
  subcategories,
  selectedSubcat,
  expandedParent,
  onSelectSubcat,
  onExpandParent,
  filtros,
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: {
  title: string;
  subcategories: SubcategoryDef[];
  selectedSubcat: SubcategoryDef | null;
  expandedParent: string | null;
  onSelectSubcat: (sub: SubcategoryDef | null) => void;
  onExpandParent: (key: string | null) => void;
  filtros: Record<string, FilterGroup>;
  activeFilters: Record<string, string>;
  onToggleFilter: (key: string, value: string) => void;
  onClearFilters: () => void;
}) {
  const activeCount = Object.keys(activeFilters).length;
  const hasDetailFilters = Object.keys(filtros).length > 0;
  const hasSubcategories = subcategories.length > 0;
  const showFilters = selectedSubcat && hasDetailFilters;

  return (
    <aside className="w-56 shrink-0 hidden md:block">
      <div className="sticky top-24">
        {/* ── Subcategorías: siempre visibles, la activa resaltada ── */}
        {hasSubcategories ? (
          <div>
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">
              Categoría
            </h3>
            <ul className="space-y-1 mb-5">
              {subcategories.map((sub) => {
                const hasChildren = sub.children && sub.children.length > 0;
                const isExpanded = expandedParent === sub.key;
                const isActive = !hasChildren && selectedSubcat?.key === sub.key;
                const isParentOfActive = hasChildren && sub.children!.some((c) => c.key === selectedSubcat?.key);

                return (
                  <li key={sub.key}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          if (isExpanded) {
                            onExpandParent(null);
                            if (isParentOfActive) { onSelectSubcat(null); onClearFilters(); }
                          } else {
                            onExpandParent(sub.key);
                            onSelectSubcat(null);
                            onClearFilters();
                          }
                        } else {
                          onSelectSubcat(isActive ? null : sub);
                          if (isActive) onClearFilters();
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-none text-sm transition-colors flex items-center justify-between group ${
                        isActive || isParentOfActive
                          ? "bg-[#DF8635]/10 text-[#DF8635] font-semibold"
                          : "text-gray-600 hover:bg-[#DF8635]/10 hover:text-[#DF8635]"
                      }`}
                    >
                      <span>{sub.label}</span>
                      {hasChildren ? (
                        <FiChevronDown size={13} className={`transition-transform ${isExpanded ? "rotate-180" : ""} ${isParentOfActive ? "text-[#DF8635]" : "text-gray-300 group-hover:text-[#DF8635]"}`} />
                      ) : (
                        <FiChevronRight size={13} className={`transition-colors ${isActive ? "text-[#DF8635]" : "text-gray-300 group-hover:text-[#DF8635]"}`} />
                      )}
                    </button>
                    {/* Children */}
                    {hasChildren && isExpanded && (
                      <ul className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-2">
                        {sub.children!.map((child) => {
                          const isChildActive = selectedSubcat?.key === child.key;
                          return (
                            <li key={child.key}>
                              <button
                                onClick={() => { onSelectSubcat(isChildActive ? null : child); if (isChildActive) onClearFilters(); }}
                                className={`w-full text-left px-2 py-2 rounded-none text-[13px] transition-colors ${
                                  isChildActive
                                    ? "text-[#DF8635] font-semibold"
                                    : "text-gray-500 hover:text-[#DF8635]"
                                }`}
                              >
                                {child.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            {showFilters && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest">Filtrar por</h3>
                  {activeCount > 0 && (
                    <button
                      onClick={onClearFilters}
                      className="text-[10px] text-[#DF8635] font-semibold hover:underline"
                    >
                      Limpiar ({activeCount})
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {Object.entries(filtros).map(([key, group]) => (
                    <div key={key}>
                      <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-1 block">
                        {group.label}
                      </label>
                      <div className="relative">
                        <select
                          value={activeFilters[key] ?? ""}
                          onChange={(e) => onToggleFilter(key, e.target.value)}
                          className={`w-full pl-3 pr-8 py-2 border text-[12px] focus:outline-none focus:border-[#DF8635] appearance-none transition-colors ${
                            activeFilters[key]
                              ? "border-[#DF8635] bg-[#DF8635]/5 text-[#DF8635] font-semibold"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          <option value="">Todos</option>
                          {group.values.map((val) => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                        <FiChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeFilters[key] ? "text-[#DF8635]" : "text-gray-400"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Sin subcategorías definidas: filtros directos ── */
          hasDetailFilters && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest">Filtros</h3>
                {activeCount > 0 && (
                  <button
                    onClick={onClearFilters}
                    className="text-[10px] text-[#DF8635] font-semibold hover:underline"
                  >
                    Limpiar ({activeCount})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {Object.entries(filtros).map(([key, group]) => (
                  <div key={key}>
                    <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-1 block">
                      {group.label}
                    </label>
                    <div className="relative">
                    <select
                      value={activeFilters[key] ?? ""}
                      onChange={(e) => onToggleFilter(key, e.target.value)}
                      className={`w-full pl-3 pr-8 py-2 border rounded-none text-[12px] focus:outline-none focus:border-[#DF8635] appearance-none transition-colors ${
                        activeFilters[key]
                          ? "border-[#DF8635] bg-[#DF8635]/5 text-[#DF8635] font-semibold"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <option value="">Todos</option>
                      {group.values.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                    <FiChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeFilters[key] ? "text-[#DF8635]" : "text-gray-400"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
}

// ─── Breadcrumb de navegación ────────────────────────────────────────────────

function FilterBreadcrumb({
  title,
  selectedSubcat,
  activeFilters,
  filtros,
  onClearSubcat,
  onRemoveFilter,
}: {
  title: string;
  selectedSubcat: SubcategoryDef | null;
  activeFilters: Record<string, string>;
  filtros: Record<string, FilterGroup>;
  onClearSubcat: () => void;
  onRemoveFilter: (key: string) => void;
}) {
  const hasAnything = selectedSubcat || Object.keys(activeFilters).length > 0;
  if (!hasAnything) return null;

  return (
    <div className="mb-4">
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <span className="text-gray-500 font-medium">{title}</span>
        {selectedSubcat && (
          <>
            <FiChevronRight size={11} />
            <button
              onClick={onClearSubcat}
              className="text-[#DF8635] font-semibold hover:underline flex items-center gap-1"
            >
              {selectedSubcat.label}
              <FiX size={10} />
            </button>
          </>
        )}
        {Object.entries(activeFilters).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1.5">
            <FiChevronRight size={11} />
            <button
              onClick={() => onRemoveFilter(key)}
              className="inline-flex items-center gap-1 bg-[#DF8635]/10 text-[#DF8635] text-[11px] font-semibold px-2 py-0.5 rounded-none hover:bg-[#DF8635]/20 transition-colors"
            >
              {filtros[key]?.label}: {val}
              <FiX size={10} />
            </button>
          </span>
        ))}
      </nav>
    </div>
  );
}

// ─── Mobile filters ──────────────────────────────────────────────────────────

function MobileFilterBar({
  subcategories,
  selectedSubcat,
  expandedParent,
  onSelectSubcat,
  onExpandParent,
  filtros,
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: {
  subcategories: SubcategoryDef[];
  selectedSubcat: SubcategoryDef | null;
  expandedParent: string | null;
  onSelectSubcat: (sub: SubcategoryDef | null) => void;
  onExpandParent: (key: string | null) => void;
  filtros: Record<string, FilterGroup>;
  activeFilters: Record<string, string>;
  onToggleFilter: (key: string, value: string) => void;
  onClearFilters: () => void;
}) {
  const hasSubcats = subcategories.length > 0;
  const hasFilters = Object.keys(filtros).length > 0;
  const expandedParentDef = subcategories.find((s) => s.key === expandedParent);
  const expandedChildren = expandedParentDef?.children;

  // Flatten all options for the main dropdown: items without children as-is, items with children as parent entry
  const flatOptions = subcategories.map((s) => ({ key: s.key, label: s.label, hasChildren: !!(s.children?.length) }));

  const selectedMainKey = expandedParent ?? (selectedSubcat ? subcategories.find((s) => !s.children && s.key === selectedSubcat.key)?.key ?? "" : "");

  return (
    <div className="md:hidden space-y-2 mb-4">
      {hasSubcats && (
        <div className="relative">
          <select
            value={selectedMainKey}
            onChange={(e) => {
              const key = e.target.value;
              const found = subcategories.find((s) => s.key === key);
              if (!found) { onExpandParent(null); onSelectSubcat(null); onClearFilters(); return; }
              if (found.children?.length) {
                onExpandParent(found.key);
                onSelectSubcat(null);
                onClearFilters();
              } else {
                onExpandParent(null);
                onSelectSubcat(found);
                onClearFilters();
              }
            }}
            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#DF8635] appearance-none bg-white"
          >
            <option value="">Categoría</option>
            {flatOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <FiChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      )}

      {/* Child dropdown when parent with children is expanded */}
      {expandedChildren && (
        <div className="relative">
          <select
            value={selectedSubcat?.key ?? ""}
            onChange={(e) => {
              const child = expandedChildren.find((c) => c.key === e.target.value) ?? null;
              onSelectSubcat(child);
              onClearFilters();
            }}
            className={`w-full pl-3 pr-8 py-2.5 border text-sm focus:outline-none focus:border-[#DF8635] appearance-none transition-colors ${
              selectedSubcat
                ? "border-[#DF8635] bg-[#DF8635]/5 text-[#DF8635] font-semibold"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <option value="">Tipo</option>
            {expandedChildren.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <FiChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${selectedSubcat ? "text-[#DF8635]" : "text-gray-400"}`} />
        </div>
      )}

      {(selectedSubcat || (!hasSubcats && !expandedParent)) && hasFilters && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Object.entries(filtros).map(([key, group]) => (
            <div key={key} className="relative shrink-0">
              <select
                value={activeFilters[key] ?? ""}
                onChange={(e) => onToggleFilter(key, e.target.value)}
                className={`pl-2 pr-7 py-2 border text-xs focus:outline-none focus:border-[#DF8635] appearance-none transition-colors ${
                  activeFilters[key]
                    ? "border-[#DF8635] bg-[#DF8635]/5 text-[#DF8635] font-semibold"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <option value="">{group.label}</option>
                {group.values.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <FiChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${activeFilters[key] ? "text-[#DF8635]" : "text-gray-400"}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CategoryListing ─────────────────────────────────────────────────────────

interface CategoryListingProps {
  title: string;
  subtitle?: string;
  categorySlug: string;
  apiSlug: string;
  subcategories?: SubcategoryDef[];
  marcas?: string[];
  extraFilters?: React.ReactNode;
}

export function CategoryListing({
  title,
  subtitle,
  categorySlug,
  apiSlug,
  subcategories = [],
  marcas = [],
}: CategoryListingProps) {
  const [productos, setProductos]       = useState<CatalogItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedSubcat, setSelectedSubcat] = useState<SubcategoryDef | null>(null);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  const [filtros, setFiltros]           = useState<Record<string, FilterGroup>>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const expandedParentDef = subcategories.find((s) => s.key === expandedParent);
  const effectiveApiSlug = selectedSubcat
    ? selectedSubcat.apiSlug
    : expandedParentDef
      ? expandedParentDef.apiSlug
      : apiSlug;
  const hasSubcategories = subcategories.length > 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleToggleFilter = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (next[key] === value || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleRemoveFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleClearFilters = () => setActiveFilters({});

  const handleSelectSubcat = (sub: SubcategoryDef | null) => {
    setSelectedSubcat(sub);
    setActiveFilters({});
    setFiltros({});
  };

  const handleExpandParent = (key: string | null) => {
    setExpandedParent(key);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ take: "60" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedSubcat?.filter) {
        params.set(`filtros[${selectedSubcat.filter.field}]`, selectedSubcat.filter.value);
      }
      for (const [key, val] of Object.entries(activeFilters)) {
        params.set(`filtros[${key}]`, val);
      }

      const res = await fetch(`/api/catalogo/${effectiveApiSlug}?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data;
      setProductos(data?.productos ?? []);
      setTotal(data?.total ?? 0);
      if (data?.filtros) setFiltros(data.filtros);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setProductos([]);
      setTotal(0);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, [effectiveApiSlug, debouncedSearch, activeFilters, selectedSubcat, expandedParent]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const productGrid = useMemo(
    () => productos.map((item) => (
      <ProductCard key={item.id} item={item} categorySlug={categorySlug} />
    )),
    [productos, categorySlug]
  );

  return (
    <div className="flex gap-6">
      {/* Sidebar — desktop */}
      <Sidebar
        title={title}
        subcategories={subcategories}
        selectedSubcat={selectedSubcat}
        expandedParent={expandedParent}
        onSelectSubcat={handleSelectSubcat}
        onExpandParent={handleExpandParent}
        filtros={filtros}
        activeFilters={activeFilters}
        onToggleFilter={handleToggleFilter}
        onClearFilters={handleClearFilters}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile filters */}
        <MobileFilterBar
          subcategories={subcategories}
          selectedSubcat={selectedSubcat}
          expandedParent={expandedParent}
          onSelectSubcat={handleSelectSubcat}
          onExpandParent={handleExpandParent}
          filtros={filtros}
          activeFilters={activeFilters}
          onToggleFilter={handleToggleFilter}
          onClearFilters={handleClearFilters}
        />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
          <div>
            {!loading && (
              <p className="text-xs text-gray-400">{total} producto{total !== 1 ? "s" : ""}</p>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-none text-sm focus:outline-none focus:border-[#DF8635] transition-colors"
            />
          </div>
        </div>

        {/* Breadcrumb */}
        <FilterBreadcrumb
          title={title}
          selectedSubcat={selectedSubcat}
          activeFilters={activeFilters}
          filtros={filtros}
          onClearSubcat={() => handleSelectSubcat(null)}
          onRemoveFilter={handleRemoveFilter}
        />

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : productos.length === 0 ? (
            <EmptyState label={selectedSubcat?.label ?? title} />
          ) : (
            productGrid
          )}
        </div>
      </div>
    </div>
  );
}
