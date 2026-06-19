"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight, FiPackage } from "react-icons/fi";
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
    trackRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  return (
    <section className="mt-9">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
        {href && (
          <Link href={href} className="text-xs font-medium text-gray-500 hover:text-[#111111] transition-colors">
            Ver todos →
          </Link>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          className="hidden md:inline-flex absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-gray-200 bg-white text-[#111111] items-center justify-center shadow-sm hover:border-[#DF8635] transition-colors"
          aria-label={`Ver anteriores de ${title}`}
        >
          <FiChevronLeft size={18} />
        </button>

        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        >
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/catalogo/${product.id}`}
              className="snap-start shrink-0 w-[210px] bg-white rounded-[4px] border border-gray-200 overflow-hidden hover:shadow-md hover:border-[#DF8635] transition-all"
            >
              <div className="relative h-[150px] bg-[#F7F4EF] overflow-hidden">
                {product.galeria[0] ? (
                  <Image
                    src={product.galeria[0]}
                    alt={product.nombre}
                    fill
                    className="object-cover"
                    sizes="210px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <FiPackage size={28} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-[#111111] text-xs line-clamp-1">{product.nombre}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-1">{product.descripcion}</p>
                <p className="text-xs text-[#111111] mt-3 font-medium">Ver producto →</p>
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          className="hidden md:inline-flex absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-gray-200 bg-white text-[#111111] items-center justify-center shadow-sm hover:border-[#DF8635] transition-colors"
          aria-label={`Ver siguientes de ${title}`}
        >
          <FiChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}