"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { products, CATEGORIES, type Category } from "@/data/products";

// ─── Mock prices (swap with ML API data when ready) ──────────────────────────
// Structure mirrors ML item: { id, price, currency, mlUrl }
// When connecting ML: fetch from /api/tienda and merge by matching product name/id
const MOCK_PRICES: Record<string, { price: number; original?: number; mlUrl: string }> = {
  "acacia-white":          { price: 18500, original: 21000, mlUrl: "#" },
  "alamo-natural":         { price: 18500, mlUrl: "#" },
  "avinon-gris":           { price: 19200, mlUrl: "#" },
  "avinon-honey":          { price: 19200, original: 22000, mlUrl: "#" },
  "avinon-smoke":          { price: 19200, mlUrl: "#" },
  "arendal-autum":         { price: 21500, mlUrl: "#" },
  "arendal-summer":        { price: 21500, mlUrl: "#" },
  "atelier-beige":         { price: 22800, original: 25500, mlUrl: "#" },
  "atelier-blanco":        { price: 22800, mlUrl: "#" },
  "atelier-gris":          { price: 22800, mlUrl: "#" },
  "atelier-natural":       { price: 22800, mlUrl: "#" },
  "atelier-taupe":         { price: 22800, mlUrl: "#" },
  "aliso-rustico-ancho":   { price: 24000, mlUrl: "#" },
  "augustus-naturale":     { price: 26500, original: 30000, mlUrl: "#" },
  "compact-evolution":     { price: 27000, mlUrl: "#" },
  "compact-city":          { price: 27000, mlUrl: "#" },
};

const WA_BASE = "https://wa.me/542214400536?text=";

function fmtPrice(n: number) {
  return "$ " + n.toLocaleString("es-AR");
}

type SortOption = "relevancia" | "precio-asc" | "precio-desc";

const categoryLabel: Record<Category, string> = {
  Porcelanato: "Pisos",
  Cerámica: "Revestimientos",
  Madera: "Maderas",
  Placas: "Decks",
  Accesorios: "Accesorios",
};

export default function TiendaPage() {
  const [activeCategory, setActiveCategory] = useState<Category | "Todos">("Todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("relevancia");

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchCat = activeCategory === "Todos" || p.category === activeCategory;
      const matchSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    if (sort === "precio-asc") {
      list = [...list].sort((a, b) => {
        const pa = MOCK_PRICES[a.id]?.price ?? 0;
        const pb = MOCK_PRICES[b.id]?.price ?? 0;
        return pa - pb;
      });
    } else if (sort === "precio-desc") {
      list = [...list].sort((a, b) => {
        const pa = MOCK_PRICES[a.id]?.price ?? 0;
        const pb = MOCK_PRICES[b.id]?.price ?? 0;
        return pb - pa;
      });
    }

    return list;
  }, [activeCategory, search, sort]);

  function waLink(productName: string) {
    const text = `Hola! Quiero consultar precio y disponibilidad de: ${productName}. ¿Pueden asesorarme?`;
    return WA_BASE + encodeURIComponent(text);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-[#111111] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[#DF8635] text-xs font-semibold uppercase tracking-widest mb-2">
                Tienda online
              </p>
              <h1 className="text-4xl font-bold mb-2">Comprá en línea</h1>
              <p className="text-gray-400 text-sm">
                Pagá con tarjeta · Envíos a todo el país · Precio mayorista
              </p>
            </div>
            {/* ML badge */}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="relative self-start sm:self-auto group"
            >
              <div className="inline-flex items-center gap-2 bg-[#FFE600] text-[#333333] text-xs font-bold px-5 py-2.5 rounded-xl group-hover:brightness-95 transition">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#3483FA"/>
                  <path d="M7 12l3.5 3.5L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Tienda oficial
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635] bg-white"
          >
            <option value="relevancia">Más relevantes</option>
            <option value="precio-asc">Menor precio</option>
            <option value="precio-desc">Mayor precio</option>
          </select>
        </div>

        <div className="flex gap-6">
          {/* Sidebar categories */}
          <aside className="hidden md:block w-52 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Categorías
              </p>
              <ul className="space-y-1">
                {(["Todos", ...CATEGORIES] as (Category | "Todos")[]).map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-colors ${
                        activeCategory === cat
                          ? "bg-[#DF8635]/10 text-[#DF8635] font-semibold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat === "Todos" ? "Todos" : categoryLabel[cat]}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  ¿Necesitás ayuda?
                </p>
                <a
                  href={waLink("un producto")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[#25D366] font-semibold hover:underline"
                >
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Consultá por WhatsApp
                </a>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile category pills */}
            <div className="flex gap-2 flex-wrap mb-4 md:hidden">
              {(["Todos", ...CATEGORIES] as (Category | "Todos")[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-[#DF8635] text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  {cat === "Todos" ? "Todos" : categoryLabel[cat]}
                </button>
              ))}
            </div>

            <p className="text-gray-500 text-sm mb-4">
              {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
            </p>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((product) => {
                  const pricing = MOCK_PRICES[product.id];
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all group flex flex-col"
                    >
                      {/* Image */}
                      <Link href={`/catalogo/${product.id}`} className="block">
                        <div className="relative h-52 bg-gray-100 overflow-hidden">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          />
                          {pricing?.original && (
                            <span className="absolute top-3 left-3 bg-[#DF8635] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              OFERTA
                            </span>
                          )}
                          <span className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                            {categoryLabel[product.category] ?? product.category}
                          </span>
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="p-4 flex flex-col flex-1">
                        <Link href={`/catalogo/${product.id}`}>
                          <h3 className="font-semibold text-[#111111] text-sm leading-snug hover:text-[#DF8635] transition-colors line-clamp-2 mb-1">
                            {product.name}
                          </h3>
                        </Link>

                        {product.specs?.Medidas && (
                          <p className="text-gray-400 text-xs mb-2">{product.specs.Medidas}</p>
                        )}

                        {/* Price */}
                        <div className="mt-auto pt-3">
                          {pricing ? (
                            <>
                              {pricing.original && (
                                <p className="text-gray-400 text-xs line-through leading-none mb-0.5">
                                  {fmtPrice(pricing.original)}
                                </p>
                              )}
                              <p className="text-2xl font-bold text-[#111111] leading-none">
                                {fmtPrice(pricing.price)}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">precio por m²</p>
                            </>
                          ) : (
                            <p className="text-sm font-semibold text-gray-500 italic">
                              Consultá precio
                            </p>
                          )}

                          {/* Actions */}
                          <div className="mt-3">
                            {pricing?.mlUrl && pricing.mlUrl !== "#" ? (
                              <a
                                href={pricing.mlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center bg-[#FFE600] py-2.5 rounded-xl hover:brightness-95 transition-all"
                              >
                                <Image src="/mercado-libre-logo-2.png" alt="MercadoLibre" width={80} height={22} className="h-5 w-auto" />
                              </a>
                            ) : (
                              <a
                                href={waLink(product.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center bg-[#FFE600] py-2.5 rounded-xl hover:brightness-95 transition-all"
                              >
                                <Image src="/mercado-libre-logo-2.png" alt="MercadoLibre" width={80} height={22} className="h-5 w-auto" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">No se encontraron productos.</p>
                <button
                  onClick={() => { setSearch(""); setActiveCategory("Todos"); }}
                  className="mt-4 text-[#DF8635] underline text-sm"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ML connect banner */}
        <div className="mt-10 bg-[#FFE600] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#3483FA] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-[#111111] text-sm">¿Tenés tienda en MercadoLibre?</p>
            <p className="text-[#333333] text-xs mt-0.5">
              Conectá tu cuenta y esta sección se sincroniza automáticamente con tus publicaciones, precios y stock en tiempo real.
            </p>
          </div>
          <Link
            href="/contacto"
            className="bg-[#3483FA] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#2968c8] transition-colors whitespace-nowrap"
          >
            Conectar ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
