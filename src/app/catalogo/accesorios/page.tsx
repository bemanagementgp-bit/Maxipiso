"use client";

import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { FaTools } from "react-icons/fa";
import { CategoryListing } from "@/components/catalog/CategoryListing";

export default function AccesoriosPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <div className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <Link href="/catalogo" className="hover:text-white/70 transition-colors">Catálogo</Link>
            <FiChevronRight size={12} />
            <span className="text-white/70">Accesorios</span>
          </nav>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0">
              <FaTools size={24} className="text-zinc-300" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black leading-none mb-3">Accesorios</h1>
              <p className="text-white/50 text-base max-w-xl leading-relaxed">
                Zócalos, terminaciones de aluminio, mantos y todo lo que necesitás
                para completar la instalación perfecta.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CategoryListing
          title="Accesorios"
          categorySlug="accesorios"
          apiSlug="accesorios"
        />
      </div>
    </div>
  );
}
