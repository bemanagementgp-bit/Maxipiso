"use client";

import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { BsFillGridFill } from "react-icons/bs";
import { CategoryListing } from "@/components/catalog/CategoryListing";

const SUBCATEGORIES = [
  {
    key: "pisos-flotantes",
    label: "Flotantes",
    apiSlug: "pisos-flotantes",
    children: [
      { key: "flotantes-wr", label: "Water Resistant", apiSlug: "pisos-flotantes", filter: { field: "categoriaTerciaria", value: "Water Resistant" } },
      { key: "flotantes-wp", label: "Waterproof", apiSlug: "pisos-flotantes", filter: { field: "categoriaTerciaria", value: "Waterproof" } },
      { key: "flotantes-clasico", label: "Clasico", apiSlug: "pisos-flotantes", filter: { field: "categoriaTerciaria", value: "Clasico" } },
    ],
  },
  { key: "pisos-vinilicos", label: "Vinílicos",            apiSlug: "pisos-vinilicos" },
  { key: "porcellanatos",   label: "Porcellanatos",        apiSlug: "porcellanatos" },
  { key: "pisos-madera",    label: "Madera e Ingeniería",  apiSlug: "pisos-madera" },
];

export default function PisosPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <div className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <Link href="/catalogo" className="hover:text-white/70 transition-colors">Catálogo</Link>
            <FiChevronRight size={12} />
            <span className="text-white/70">Pisos</span>
          </nav>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#DF8635]/20 flex items-center justify-center shrink-0">
              <BsFillGridFill size={26} className="text-[#DF8635]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black leading-none mb-3">Pisos</h1>
              <p className="text-white/50 text-base max-w-xl leading-relaxed">
                La mayor variedad de pisos del mercado mayorista. Flotantes, vinílicos,
                porcellanatos y madera de ingeniería.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CategoryListing
          title="Pisos"
          categorySlug="pisos"
          apiSlug="pisos-flotantes"
          subcategories={SUBCATEGORIES}
        />
      </div>
    </div>
  );
}
