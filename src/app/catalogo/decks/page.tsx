"use client";

import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { MdDeck } from "react-icons/md";
import { CategoryListing } from "@/components/catalog/CategoryListing";

export default function DecksPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <div className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <Link href="/catalogo" className="hover:text-white/70 transition-colors">Catálogo</Link>
            <FiChevronRight size={12} />
            <span className="text-white/70">Decks</span>
          </nav>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 flex items-center justify-center shrink-0">
              <MdDeck size={26} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black leading-none mb-3">Decks</h1>
              <p className="text-white/50 text-base max-w-xl leading-relaxed">
                Decks en madera natural y WPC para terrazas, balcones y espacios exteriores.
                Resistencia UV garantizada.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CategoryListing
          title="Decks"
          categorySlug="decks"
          apiSlug="decks"
        />
      </div>
    </div>
  );
}
