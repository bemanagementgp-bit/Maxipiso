"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { FiChevronRight, FiSearch, FiX, FiArrowLeft, FiChevronDown } from "react-icons/fi";
import { BsFillGridFill } from "react-icons/bs";
import { ProductCard, EmptyState } from "@/components/catalog/CategoryListing";
import type { CatalogItem } from "@/components/catalog/CategoryListing";

type FilterGroup = { label: string; values: string[] };
type CategoriaOption = { key: string; label: string };

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-9 bg-gray-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState("");

  const [filtros, setFiltros] = useState<Record<string, FilterGroup>>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const abortRef = useRef<AbortController | null>(null);

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

  const handleSelectCategoria = (val: string) => {
    setSelectedCategoria(val);
    setActiveFilters({});
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Cancela cualquier petición previa en vuelo (evita renders con datos viejos)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ take: "60" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategoria) params.set("categoria", selectedCategoria);
      for (const [key, val] of Object.entries(activeFilters)) {
        params.set(`filtros[${key}]`, val);
      }

      const res = await fetch(`/api/catalogo/todos?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data;
      setProductos(data?.productos ?? []);
      setTotal(data?.total ?? 0);
      if (data?.filtros) setFiltros(data.filtros);
      if (data?.categorias) setCategorias(data.categorias);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // petición cancelada: ignorar
      setProductos([]);
      setTotal(0);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, [debouncedSearch, selectedCategoria, activeFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const activeCount = Object.keys(activeFilters).length;
  const hasFilters = Object.keys(filtros).length > 0;
  const selectedCatLabel = categorias.find((c) => c.key === selectedCategoria)?.label;

  // Memoiza la grilla: sólo se reconstruye cuando cambia la lista de productos,
  // no al tipear en el buscador ni al abrir/cerrar filtros.
  const productGrid = useMemo(
    () => productos.map((item) => (
      <ProductCard key={item.id} item={item} categorySlug="catalogo" />
    )),
    [productos]
  );

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Banner */}
      <div className="w-full relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banner_catalogo.png"
          alt="Catálogo Maxipiso"
          width={6667}
          height={1417}
          fetchPriority="high"
          decoding="async"
          className="w-full aspect-[6667/1417] max-h-[320px] min-h-[110px] object-cover"
        />
        {/* Sombra interior inferior */}
        <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>

      {/* Título */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <h1 className="text-3xl md:text-4xl font-black text-[#111111] leading-none mb-2">Catálogo</h1>
        <p className="text-gray-500 text-sm max-w-xl leading-relaxed">
          Explorá todo nuestro stock mayorista. Entrega en todo el país.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="w-56 shrink-0 hidden md:block">
            <div className="sticky top-24">
              {/* Categoría */}
              {!selectedCategoria ? (
                <div>
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">
                    Categoría
                  </h3>
                  <ul className="space-y-1 mb-6">
                    {categorias.map((cat) => (
                      <li key={cat.key}>
                        <button
                          onClick={() => handleSelectCategoria(cat.key)}
                          className="w-full text-left px-3 py-2.5 text-sm text-gray-600 rounded-xl hover:bg-[#DF8635]/10 hover:text-[#DF8635] transition-colors flex items-center justify-between group"
                        >
                          <span>{cat.label}</span>
                          <FiChevronRight size={13} className="text-gray-300 group-hover:text-[#DF8635] transition-colors" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => { handleSelectCategoria(""); handleClearFilters(); }}
                    className="flex items-center gap-1.5 text-[11px] text-[#DF8635] font-semibold mb-4 hover:underline"
                  >
                    <FiArrowLeft size={12} />
                    Todas las categorías
                  </button>

                  <div className="bg-[#DF8635]/10 rounded-xl px-3 py-2.5 mb-5">
                    <p className="text-[10px] text-[#DF8635] font-bold uppercase tracking-widest mb-0.5">Categoría</p>
                    <p className="text-sm font-bold text-[#111111]">{selectedCatLabel}</p>
                  </div>
                </div>
              )}

              {/* Filtros */}
              {hasFilters && (() => {
                const gateKey = selectedCategoria === "pisos-flotantes" ? "categoriaTerciaria" : null;
                const gateSelected = gateKey ? !!activeFilters[gateKey] : true;
                const gateFilter = gateKey ? filtros[gateKey] : null;
                const restFilters = Object.entries(filtros).filter(([key]) => key !== gateKey);

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest">Filtros</h3>
                      {activeCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="text-[10px] text-[#DF8635] font-semibold hover:underline"
                        >
                          Limpiar ({activeCount})
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Gate filter (Tipo for pisos-flotantes) */}
                      {gateFilter && (
                        <div>
                          <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-1.5 block">
                            {gateFilter.label}
                          </label>
                          <div className="flex flex-col gap-1.5">
                            {gateFilter.values.map((val) => {
                              const active = activeFilters[gateKey!] === val;
                              return (
                                <button
                                  key={val}
                                  onClick={() => handleToggleFilter(gateKey!, val)}
                                  className={`w-full text-left px-3 py-2 rounded-xl border text-[12px] font-semibold transition-colors ${
                                    active
                                      ? "border-[#DF8635] bg-[#DF8635]/10 text-[#DF8635]"
                                      : "border-gray-200 bg-white text-gray-700 hover:border-[#DF8635]/50"
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rest of filters — only shown after gate is selected (or if no gate) */}
                      {gateSelected && restFilters.map(([key, group]) => (
                        <div key={key}>
                          <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-1 block">
                            {group.label}
                          </label>
                          <div className="relative">
                            <select
                              value={activeFilters[key] ?? ""}
                              onChange={(e) => handleToggleFilter(key, e.target.value)}
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
                );
              })()}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Mobile filters */}
            <div className="md:hidden space-y-2 mb-4">
              <div className="relative">
                <select
                  value={selectedCategoria}
                  onChange={(e) => { handleSelectCategoria(e.target.value); handleClearFilters(); }}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#DF8635] appearance-none bg-white"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <FiChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {hasFilters && (() => {
                const gateKey = selectedCategoria === "pisos-flotantes" ? "categoriaTerciaria" : null;
                const gateSelected = gateKey ? !!activeFilters[gateKey] : true;
                const gateFilter = gateKey ? filtros[gateKey] : null;
                const restFilters = Object.entries(filtros).filter(([k]) => k !== gateKey);

                return (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gateFilter && gateFilter.values.map((val) => {
                      const active = activeFilters[gateKey!] === val;
                      return (
                        <button
                          key={val}
                          onClick={() => handleToggleFilter(gateKey!, val)}
                          className={`shrink-0 px-3 py-2 rounded-full border text-xs font-semibold transition-colors ${
                            active
                              ? "border-[#DF8635] bg-[#DF8635]/10 text-[#DF8635]"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                    {gateSelected && restFilters.map(([key, group]) => (
                      <div key={key} className="relative shrink-0">
                        <select
                          value={activeFilters[key] ?? ""}
                          onChange={(e) => handleToggleFilter(key, e.target.value)}
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
                );
              })()}
            </div>

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
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#DF8635] transition-colors"
                />
              </div>
            </div>

            {/* Breadcrumb */}
            {(selectedCategoria || activeCount > 0) && (
              <div className="mb-4">
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
                  <span className="text-gray-500 font-medium">Catálogo</span>
                  {selectedCategoria && (
                    <>
                      <FiChevronRight size={11} />
                      <button
                        onClick={() => { handleSelectCategoria(""); handleClearFilters(); }}
                        className="text-[#DF8635] font-semibold hover:underline flex items-center gap-1"
                      >
                        {selectedCatLabel}
                        <FiX size={10} />
                      </button>
                    </>
                  )}
                  {Object.entries(activeFilters).map(([key, val]) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <FiChevronRight size={11} />
                      <button
                        onClick={() => handleRemoveFilter(key)}
                        className="inline-flex items-center gap-1 bg-[#DF8635]/10 text-[#DF8635] text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-[#DF8635]/20 transition-colors"
                      >
                        {filtros[key]?.label}: {val}
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}
                </nav>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              ) : productos.length === 0 ? (
                <EmptyState label={selectedCatLabel ?? "Catálogo"} />
              ) : (
                productGrid
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
