"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiSearch, FiChevronRight, FiPackage } from "react-icons/fi";
import { GiWoodPile } from "react-icons/gi";
import { MdDeck, MdLayers } from "react-icons/md";
import { FaTools } from "react-icons/fa";
import { BsFillGridFill } from "react-icons/bs";
import type { IconType } from "react-icons";

// --- Estructura del cat�logo ---------------------------------------------------

type SubGroup = { label: string; value: string; children?: string[] };

type CatalogCategory = {
  value: string;
  label: string;
  Icon: IconType;
  subs: SubGroup[];
};

const CATALOG: CatalogCategory[] = [
  {
    value: "Pisos",
    label: "Pisos",
    Icon: BsFillGridFill,
    subs: [
      { label: "Laminados HDF",     value: "Laminados HDF" },
      { label: "Laminados WTR",     value: "Laminados WTR" },
      { label: "O.R.C.A Vinil Pro", value: "O.R.C.A Vinil Pro" },
      { label: "Vin�lico",          value: "Vin�lico" },
      { label: "Porcelanato",       value: "Porcelanato" },
      { label: "Madera",            value: "Madera" },
      { label: "Ingenier�a",        value: "Ingenier�a" },
    ],
  },
  {
    value: "Maderas",
    label: "Maderas",
    Icon: GiWoodPile,
    subs: [],
  },
  {
    value: "Decks",
    label: "Decks",
    Icon: MdDeck,
    subs: [
      { label: "Madera", value: "Madera" },
      { label: "WPC",    value: "WPC" },
    ],
  },
  {
    value: "Revestimientos",
    label: "Revestimientos",
    Icon: MdLayers,
    subs: [
      {
        label: "Exterior",
        value: "__group_exterior",
        children: [
          "Exterior - Acanalado Vertical",
          "Exterior - Siding",
          "Exterior - Perfiles WPC",
        ],
      },
      {
        label: "Interior",
        value: "__group_interior",
        children: [
          "Interior - EPS",
          "Interior - Laqueados",
          "Interior - Ac�stico",
          "Interior - Placas",
        ],
      },
      { label: "Madera", value: "Madera" },
    ],
  },
  {
    value: "Accesorios",
    label: "Accesorios",
    Icon: FaTools,
    subs: [
      {
        label: "ACC PISOS",
        value: "__group_acc_pisos",
        children: [
          "ACC PISOS - Z�calos Flotante",
          "ACC PISOS - Z�calos Vin�lico",
          "ACC PISOS - Z�calos Madera",
          "ACC PISOS - Terminaciones de Aluminio",
          "ACC PISOS - Mantos",
        ],
      },
      { label: "ACC DECK",   value: "ACC DECK" },
      { label: "ACC REVEST", value: "ACC REVEST" },
    ],
  },
  {
    value: "Otros",
    label: "Otros",
    Icon: FiPackage,
    subs: [
      { label: "Adhesivos", value: "Adhesivos" },
      { label: "Lacas",     value: "Lacas" },
      { label: "Selladores", value: "Selladores" },
    ],
  },
];

// --- Types ---------------------------------------------------------------------

type ProductoAPI = {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  categoria?: string;
  subcategoria?: string;
  destacado?: boolean;
};

// --- Componentes ---------------------------------------------------------------

function formatPrice(price: number) {
  if (price <= 0) return "Consultar precio";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

function ProductCard({ p }: { p: ProductoAPI }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 hover:border-[#DF8635] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      <Link href={`/catalogo/${p.id}`} className="relative aspect-square bg-gray-50 overflow-hidden block">
        {p.imagen ? (
          <Image
            src={p.imagen}
            alt={p.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <FiPackage size={48} />
          </div>
        )}
        {p.subcategoria && (
          <span className="absolute top-3 left-3 bg-[#111111]/80 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
            {p.subcategoria}
          </span>
        )}
        {p.destacado && (
          <span className="absolute top-3 right-3 bg-[#DF8635] text-white text-[10px] font-semibold px-2 py-1 rounded-full">
            Destacado
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10px] font-semibold text-[#DF8635] uppercase tracking-widest mb-1">{p.marca}</p>
        <Link href={`/catalogo/${p.id}`} className="font-bold text-[#111111] text-sm leading-tight mb-1 hover:text-[#DF8635] transition-colors">
          {p.nombre}
        </Link>
        {p.descripcion && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-3">{p.descripcion}</p>
        )}
        <p className="text-sm font-bold text-[#111111] mb-3 mt-auto">{formatPrice(p.precio)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/catalogo/${p.id}`}
            className="text-center border border-gray-200 text-[#111111] text-xs font-semibold py-2.5 rounded-xl hover:border-[#DF8635] transition-colors"
          >
            Ver detalle
          </Link>
          <a
            href={`https://wa.me/5422143888894?text=${encodeURIComponent(`Hola, quiero consultar precio y disponibilidad de: ${p.nombre} (SKU: ${p.sku}). �Me pueden asesorar?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center bg-[#DF8635] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#c97220] transition-colors"
          >
            Consultar
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-[#DF8635]/10 flex items-center justify-center mb-5">
        <FiPackage size={36} className="text-[#DF8635]" />
      </div>
      <h3 className="text-xl font-bold text-[#111111] mb-2">Pr�ximamente</h3>
      <p className="text-gray-400 text-sm max-w-xs">
        Los productos de <strong>{label}</strong> estar�n disponibles muy pronto.
        Consultanos por WhatsApp para m�s informaci�n.
      </p>
      <a
        href="https://wa.me/5422143888894?text=Hola%2C%20quiero%20consultar%20disponibilidad%20de%20productos"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 bg-[#DF8635] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#c97220] transition-colors"
      >
        Consultar por WhatsApp
      </a>
    </div>
  );
}

// --- Skeleton ------------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse">
          <div className="aspect-square bg-gray-100 rounded-t-2xl" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-8 bg-gray-100 rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Page ----------------------------------------------------------------------

export default function CatalogoPage() {
  const [activeCat, setActiveCat]         = useState<string | null>(null);
  const [activeSub, setActiveSub]         = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [productos, setProductos]         = useState<ProductoAPI[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ take: activeCat || debouncedSearch ? "100" : "200" });
      if (activeCat)        params.set("categoria", activeCat);
      if (activeSub)        params.set("subcategoria", activeSub);
      if (debouncedSearch)  params.set("search", debouncedSearch);

      const res = await fetch(`/api/catalogo?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setProductos(json.data.productos ?? []);
      setTotal(json.data.total ?? 0);
    } catch {
      setProductos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeCat, activeSub, debouncedSearch]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const currentCat = CATALOG.find(c => c.value === activeCat);

  const handleSelectCat = (val: string) => {
    if (val === activeCat) {
      setActiveCat(null);
      setActiveSub(null);
      setExpandedGroup(null);
    } else {
      setActiveCat(val);
      setActiveSub(null);
      setExpandedGroup(null);
    }
  };

  const handleSelectSub = (sub: SubGroup) => {
    if (sub.value.startsWith("__group_")) {
      setExpandedGroup(expandedGroup === sub.value ? null : sub.value);
      setActiveSub(null);
      return;
    }
    setActiveSub(activeSub === sub.value ? null : sub.value);
    setExpandedGroup(null);
  };

  const handleSelectChild = (child: string) => {
    setActiveSub(activeSub === child ? null : child);
  };

  const breadcrumbLabel = [
    currentCat?.label,
    activeSub ? activeSub.replace(/^.*? - /, "") : null,
  ].filter(Boolean).join(" � ");

  return (
    <div className="min-h-screen bg-[#F9F8F6]">

      {/* -- Header -- */}
      <div className="bg-[#111111] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-2 block">
            Importaci�n directa
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Cat�logo</h1>
          <p className="text-gray-400 text-lg">
            La mayor variedad de pisos y revestimientos del mercado mayorista.
          </p>
        </div>
      </div>

      {/* -- Categor�as principales (pills sticky) -- */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            <button
              onClick={() => { setActiveCat(null); setActiveSub(null); setExpandedGroup(null); setSearch(""); }}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                !activeCat && !debouncedSearch
                  ? "bg-[#111111] text-white"
                  : "text-gray-500 hover:text-[#111111] hover:bg-gray-100"
              }`}
            >
              Todos
            </button>
            {CATALOG.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleSelectCat(cat.value)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeCat === cat.value
                    ? "bg-[#DF8635] text-white"
                    : "text-gray-500 hover:text-[#111111] hover:bg-gray-100"
                }`}
              >
                <span>{cat.Icon && <cat.Icon size={16} />}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* -- Sidebar subcategor�as -- */}
          {currentCat && currentCat.subs.length > 0 && (
            <aside className="lg:w-56 shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-32">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-2">
                  {currentCat.label}
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      onClick={() => { setActiveSub(null); setExpandedGroup(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !activeSub ? "bg-[#DF8635]/10 text-[#DF8635]" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Todos
                    </button>
                  </li>
                  {currentCat.subs.map((sub) => (
                    <li key={sub.value}>
                      <button
                        onClick={() => handleSelectSub(sub)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                          activeSub === sub.value
                            ? "bg-[#DF8635]/10 text-[#DF8635]"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {sub.label}
                        {sub.children && (
                          <FiChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${expandedGroup === sub.value ? "rotate-90" : ""}`}
                          />
                        )}
                      </button>
                      {sub.children && expandedGroup === sub.value && (
                        <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-[#DF8635]/20 pl-3">
                          {sub.children.map((child) => (
                            <li key={child}>
                              <button
                                onClick={() => handleSelectChild(child)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  activeSub === child
                                    ? "text-[#DF8635] font-semibold"
                                    : "text-gray-500 hover:text-[#111111]"
                                }`}
                              >
                                {child.replace(/^[^-]+ - /, "")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          {/* -- Contenido principal -- */}
          <div className="flex-1 min-w-0">

            {/* Barra superior */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                {breadcrumbLabel ? (
                  <p className="text-sm font-semibold text-[#111111]">{breadcrumbLabel}</p>
                ) : (
                  <p className="text-sm font-semibold text-[#111111]">
                    {debouncedSearch ? `Resultados para "${debouncedSearch}"` : "Todos los productos"}
                  </p>
                )}
                {!loading && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {total} producto{total !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="relative w-full sm:w-72">
                <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]"
                />
              </div>
            </div>

            {/* Grid de productos */}
            {loading ? <SkeletonGrid /> : productos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {productos.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1">
                <EmptyState label={activeSub?.replace(/^[^-]+ - /, "") ?? currentCat?.label ?? "esta b�squeda"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
