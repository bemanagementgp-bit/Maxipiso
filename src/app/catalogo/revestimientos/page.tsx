"use client";

import { useState } from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { MdLayers } from "react-icons/md";
import { CategoryListing } from "@/components/catalog/CategoryListing";

const SUBTABS = [
  {
    key: "exterior",
    label: "Exteriores",
    desc: "Siding, acanalados y perfiles WPC para fachadas y exteriores",
  },
  {
    key: "interior",
    label: "Interiores",
    desc: "Placas EPS, laqueados, acústicos y perfiles de interior",
  },
] as const;

type SubTab = (typeof SUBTABS)[number]["key"];

export default function RevestimientosPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("exterior");
  const current = SUBTABS.find((t) => t.key === activeTab)!;

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

        {/* Tabs exterior / interior */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 py-1">
              {SUBTABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    activeTab === tab.key
                      ? "border-[#DF8635] text-white"
                      : "border-transparent text-white/40 hover:text-white/70"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-gray-500">{current.desc}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CategoryListing
          key={current.key}
          title={`Revestimientos ${current.label}`}
          categorySlug="revestimientos"
          apiSlug="revestimientos"
        />
      </div>
    </div>
  );
}
