"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { products, CATEGORIES, type Category } from "@/data/products";

const CDN = "https://cdn.shopify.com/s/files/1/0656/7251/1711";

const categoryHero: Record<string, { img: string; label: string }> = {
  Porcelanato: {
    img: `${CDN}/products/Arendal-Autum-amb.jpg`,
    label: "Pisos",
  },
  Cerámica: {
    img: "/revestimientos.webp",
    label: "Revestimientos",
  },
  Madera: {
    img: "/maderas.jpg",
    label: "Maderas",
  },
  Placas: {
    img: "/decks.webp",
    label: "Decks",
  },
  Accesorios: {
    img: `${CDN}/products/Disenosintitulo-2022-11-03T174711.831.png`,
    label: "Accesorios",
  },
};

export default function CatalogoPage() {
  const [activeCategory, setActiveCategory] = useState<Category | "Todos">("Todos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "Todos" || p.category === activeCategory;
      const matchSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  const scrollToProducts = (cat: Category | "Todos") => {
    setActiveCategory(cat);
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-[#111111] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Catálogo</h1>
          <p className="text-gray-300 text-lg">
            Importación directa · La mayor variedad del mercado mayorista
          </p>
        </div>
      </div>

      {/* Category cards — estilo SBG */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const { img, label } = categoryHero[cat];
              return (
                <button
                  key={cat}
                  onClick={() => scrollToProducts(cat)}
                  className="relative group overflow-hidden rounded-2xl aspect-[3/4] w-full text-left"
                >
                  {/* Imagen de fondo */}
                  <img
                    src={img}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/90" />
                  {/* Texto */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-white font-bold text-lg leading-tight">{label}</p>
                    <p className="text-white/60 text-xs mt-1 flex items-center gap-1 group-hover:text-[#DF8635] transition-colors">
                      Ver productos
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Productos */}
      <div id="productos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635] bg-white"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory("Todos")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === "Todos"
                  ? "bg-[#DF8635] text-white"
                  : "bg-white text-[#111111] border border-gray-200 hover:border-[#DF8635]"
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-[#DF8635] text-white"
                    : "bg-white text-[#111111] border border-gray-200 hover:border-[#DF8635]"
                }`}
              >
                {categoryHero[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-500 text-sm mb-6">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all group"
              >
                <Link href={`/catalogo/${product.id}`} className="block">
                  <div className="relative h-52 bg-gray-100 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <span className="absolute top-3 left-3 bg-[#DF8635] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {categoryHero[product.category]?.label ?? product.category}
                    </span>
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/catalogo/${product.id}`}>
                    <h3 className="font-semibold text-[#111111] mb-1 leading-tight hover:text-[#DF8635] transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2 mt-1">
                    {product.description}
                  </p>
                  {product.specs && Object.keys(product.specs).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {Object.entries(product.specs).slice(0, 3).map(([k, v]) => (
                        <span
                          key={k}
                          className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/catalogo/${product.id}`}
                    className="w-full flex items-center justify-center gap-2 border border-[#DF8635] text-[#DF8635] text-sm font-semibold py-2 rounded-xl hover:bg-[#DF8635] hover:text-white transition-colors"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
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
  );
}
