"use client";

import { useState } from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { BsFillGridFill } from "react-icons/bs";
import { CategoryListing } from "@/components/catalog/CategoryListing";

const TABS = [
  {
    key: "pisos-flotantes",
    label: "Flotantes",
    desc: "Laminados HDF y WTR de alto tránsito",
    apiSlug: "pisos-flotantes",
  },
  {
    key: "pisos-vinilicos",
    label: "Vinílicos",
    desc: "Resistentes al agua, capa de uso garantizada",
    apiSlug: "pisos-vinilicos",
  },
  {
    key: "porcellanatos",
    label: "Porcellanatos",
    desc: "Cerámica porcellanizada para interior y exterior",
    apiSlug: "porcellanatos",
  },
  {
    key: "pisos-madera",
    label: "Madera e Ingeniería",
    desc: "Pisos de madera sólida y multicapa ingeniería",
    apiSlug: "pisos-madera",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PisosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pisos-flotantes");

  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Hero */}
      <div className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {/* Breadcrumb */}
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

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex overflow-x-auto gap-1 py-1 scrollbar-hide">
              {TABS.map((tab) => (
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

      {/* Tab description strip */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-gray-500">{current.desc}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CategoryListing
          key={current.key}
          title={current.label}
          categorySlug="pisos"
          apiSlug={current.apiSlug}
        />
      </div>
    </div>
  );
}
