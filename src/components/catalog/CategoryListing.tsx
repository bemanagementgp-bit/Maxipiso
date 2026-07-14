"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiPackage, FiSearch, FiFilter } from "react-icons/fi";
import SafeImage from "./SafeImage";

// ─── Types genéricos para listado ────────────────────────────────────────────

export type CatalogItem = {
  id: string;
  sku: string;
  nombre?: string;
  especie?: string; // pisos_madera usa especie como nombre
  marca?: string;
  linea?: string;
  precioM2?: number;
  precioCaja?: number;
  precio?: number; // maderas
  moneda?: string;
  stock?: number;
  imagen?: string;
  imagenes?: string; // JSON array
  descripcion?: string;
  espesor?: string;
  ancho?: string;
  largo?: string;
  isActive: boolean;
  [key: string]: unknown;
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

function displayPrice(item: CatalogItem): string {
  const moneda = item.moneda ?? "USD";
  const p = item.precioM2 ?? item.precio ?? item.precioCaja;
  if (!p || p <= 0) return "Consultar precio";
  return `${moneda} ${p.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function priceLabel(item: CatalogItem): string {
  if (item.precioM2 && item.precioM2 > 0) return "/ m²";
  if (item.precioCaja && item.precioCaja > 0) return "/ caja";
  if (item.precio && item.precio > 0) return "";
  return "";
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

export function ProductCard({
  item,
  categorySlug,
}: {
  item: CatalogItem;
  categorySlug: string;
}) {
  const img = firstImage(item);
  const name = displayName(item);
  const price = displayPrice(item);
  const label = priceLabel(item);
  const waText = encodeURIComponent(
    `Hola, quiero consultar disponibilidad y precio de: ${name} (SKU: ${item.sku}). ¿Me pueden asesorar?`
  );

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 hover:border-[#DF8635]/40 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
      {/* Imagen */}
      <Link
        href={`/catalogo/${item.id}`}
        className="relative aspect-[4/3] bg-gray-50 overflow-hidden block shrink-0"
      >
        <SafeImage
          src={img ?? ""}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* SKU badge */}
        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-mono px-2 py-0.5 rounded">
          {item.sku}
        </span>
      </Link>

      {/* Info */}
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

        {/* Specs rápidas */}
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

        {/* Precio */}
        <div className="flex items-baseline gap-1 mt-auto pt-2">
          <span className="text-base font-black text-[#111111]">{price}</span>
          {label && <span className="text-xs text-gray-400">{label}</span>}
        </div>

        {/* Stock badge */}
        {item.stock !== undefined && item.stock !== null && (
          <p className={`text-[10px] font-semibold ${(item.stock as number) > 0 ? "text-emerald-600" : "text-red-400"}`}>
            {(item.stock as number) > 0 ? `Stock: ${item.stock} u.` : "Sin stock"}
          </p>
        )}

        {/* Botones */}
        <div className="grid grid-cols-2 gap-2 mt-2">
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-[#DF8635]/10 flex items-center justify-center mb-5">
        <FiPackage size={36} className="text-[#DF8635]" />
      </div>
      <h3 className="text-xl font-bold text-[#111111] mb-2">Próximamente</h3>
      <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
        Los productos de <strong>{label}</strong> estarán disponibles muy pronto.
        Consultanos por WhatsApp.
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

// ─── CategoryListing (componente reutilizable por página) ─────────────────────

interface CategoryListingProps {
  title: string;
  subtitle?: string;
  categorySlug: string;
  apiSlug: string;       // slug que se envía al API
  marcas?: string[];
  extraFilters?: React.ReactNode;
}

export function CategoryListing({
  title,
  subtitle,
  categorySlug,
  apiSlug,
  marcas = [],
}: CategoryListingProps) {
  const [productos, setProductos] = useState<CatalogItem[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ take: "60" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (marcaFilter)     params.set("marca", marcaFilter);

      const res = await fetch(`/api/catalogo/${apiSlug}?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setProductos(json.data?.productos ?? []);
      setTotal(json.data?.total ?? 0);
    } catch {
      setProductos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiSlug, debouncedSearch, marcaFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex-1 min-w-0">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
        <div>
          {!loading && (
            <p className="text-xs text-gray-400">{total} producto{total !== 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Buscador */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#DF8635] transition-colors"
            />
          </div>
          {/* Filtro por marca */}
          {marcas.length > 0 && (
            <div className="relative">
              <FiFilter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={marcaFilter}
                onChange={(e) => setMarcaFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#DF8635] appearance-none bg-white"
              >
                <option value="">Todas las marcas</option>
                {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : productos.length === 0 ? (
          <EmptyState label={title} />
        ) : (
          productos.map((item) => (
            <ProductCard key={item.id} item={item} categorySlug={categorySlug} />
          ))
        )}
      </div>
    </div>
  );
}
