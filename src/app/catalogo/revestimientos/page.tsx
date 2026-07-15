"use client";

import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { MdLayers } from "react-icons/md";
import { CategoryListing } from "@/components/catalog/CategoryListing";

const SUBCATEGORIES = [
  { key: "exterior", label: "Exteriores", apiSlug: "revestimientos", filter: { field: "categoriaPrincipal", value: "Revestimientos y Exteriores" } },
  { key: "interior", label: "Interiores", apiSlug: "revestimientos", filter: { field: "categoriaPrincipal", value: "Revestimientos y Perfil de Interior" } },
];

export default function RevestimientosPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <div className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <Link href="/catalogo" className="hover:text-white/70 transition-colors">Catálogo</Link>
            <FiChevronRight size={12} />
            <span className="text-white/70">Revestimientos</span>
          </nav>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0">
              <MdLayers size={26} className="text-slate-300" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black leading-none mb-3">Revestimientos</h1>
              <p className="text-white/50 text-base max-w-xl leading-relaxed">
                Soluciones para exterior e interior — siding, perfiles WPC, placas EPS,
                laqueados y acústicos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CategoryListing
          title="Revestimientos"
          categorySlug="revestimientos"
          apiSlug="revestimientos"
          subcategories={SUBCATEGORIES}
        />
      </div>
    </div>
  );
}
