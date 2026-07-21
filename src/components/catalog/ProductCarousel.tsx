"use client";

import { useRef } from "react";
import Link from "next/link";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import SafeImage from "./SafeImage";
import type { CatalogPublicProduct } from "@/lib/catalog-public";

type ProductCarouselProps = {
  title: string;
  href?: string;
  products: CatalogPublicProduct[];
};

export default function ProductCarousel({ title, href, products }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scrollByAmount = (direction: number) => {
    trackRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  };

  return (
    <section className="mt-9">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <span className="block w-10 h-1 rounded-full bg-[#DF8635] mb-3" />
          <h2 className="text-xl md:text-2xl font-bold text-[#111111] leading-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DF8635] hover:text-[#c97220] transition-colors"
            >
              Ver todos
              <FiArrowRight size={13} />
            </Link>
          )}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByAmount(-1)}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white text-[#111111] inline-flex items-center justify-center hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-colors"
              aria-label={`Ver anteriores de ${title}`}
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(1)}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white text-[#111111] inline-flex items-center justify-center hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-colors"
              aria-label={`Ver siguientes de ${title}`}
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/catalogo/${product.id}`}
            className="group snap-start shrink-0 w-[240px] bg-white rounded-none border border-gray-100 overflow-hidden hover:border-[#DF8635]/40 hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            {/* Imagen */}
            <div className="relative aspect-[4/3] bg-[#F7F4EF] overflow-hidden">
              <SafeImage
                src={product.galeria[0] ?? ""}
                alt={product.nombre}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                iconSize={28}
              />
              {product.sku && (
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-mono px-2 py-0.5 rounded">
                  {product.sku}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col flex-1 gap-1">
              {product.marca && product.marca !== "Maxipiso" && (
                <p className="text-[10px] font-bold text-[#DF8635] uppercase tracking-widest">
                  {product.marca}
                </p>
              )}
              <p className="font-bold text-[#111111] text-sm leading-snug line-clamp-2 group-hover:text-[#DF8635] transition-colors">
                {product.nombre}
              </p>
              <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#111111]">
                Ver producto
                <FiArrowRight
                  size={12}
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#DF8635]"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
