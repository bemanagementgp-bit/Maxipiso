"use client";

import Link from "next/link";
import { FiChevronRight, FiArrowRight } from "react-icons/fi";
import { BsFillGridFill } from "react-icons/bs";
import { GiWoodPile } from "react-icons/gi";
import { MdDeck, MdLayers } from "react-icons/md";
import { FaTools } from "react-icons/fa";

const CATEGORIAS = [
  {
    slug: "pisos",
    label: "Pisos",
    descripcion: "Flotantes, vinílicos, porcellanatos y madera e ingeniería.",
    Icon: BsFillGridFill,
    href: "/catalogo/pisos",
    tags: ["Flotantes", "Vinílicos", "Porcellanatos", "Madera e Ingeniería"],
    accent: "#DF8635",
  },
  {
    slug: "maderas",
    label: "Maderas",
    descripcion: "Maderas sólidas nobles y exóticas para interior y exterior.",
    Icon: GiWoodPile,
    href: "/catalogo/maderas",
    tags: ["Nativas", "Exóticas", "Tratadas"],
    accent: "#b45309",
  },
  {
    slug: "decks",
    label: "Decks",
    descripcion: "Madera natural y WPC para terrazas y espacios al aire libre.",
    Icon: MdDeck,
    href: "/catalogo/decks",
    tags: ["WPC", "Madera Natural", "Exterior"],
    accent: "#059669",
  },
  {
    slug: "revestimientos",
    label: "Revestimientos",
    descripcion: "Exterior e interior — siding, perfiles, placas y más.",
    Icon: MdLayers,
    href: "/catalogo/revestimientos",
    tags: ["Exteriores", "Interiores", "WPC", "EPS"],
    accent: "#475569",
  },
  {
    slug: "accesorios",
    label: "Accesorios",
    descripcion: "Zócalos, terminaciones, mantos y todo lo que necesitás.",
    Icon: FaTools,
    href: "/catalogo/accesorios",
    tags: ["Zócalos", "Terminaciones", "Mantos"],
    accent: "#71717a",
  },
] as const;

export default function CatalogoHubPage() {
  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Hero */}
      <div className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <span className="text-white/70">Catálogo</span>
          </nav>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#DF8635]/20 flex items-center justify-center shrink-0">
              <BsFillGridFill size={26} className="text-[#DF8635]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black leading-none mb-3">Catálogo</h1>
              <p className="text-white/50 text-base max-w-xl leading-relaxed">
                Seleccioná una categoría para explorar nuestro stock mayorista.
                Precios USD &middot; Entrega en todo el país.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categorías */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIAS.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="group bg-white rounded-2xl border border-gray-100 p-7 flex flex-col hover:border-[#DF8635] hover:shadow-md transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${cat.accent}1a` }}
              >
                <cat.Icon size={22} style={{ color: cat.accent }} />
              </div>

              <h2 className="text-xl font-black text-[#111111] mb-1.5">{cat.label}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{cat.descripcion}</p>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {cat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-[#111111] group-hover:text-[#DF8635] transition-colors">
                Ver productos
                <FiArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA mayorista */}
        <div className="border-t border-gray-200 mt-10 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            ¿Sos distribuidor?{" "}
            <a
              href="https://wa.me/5422143888894"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#DF8635] hover:underline"
            >
              Consultanos precios mayoristas
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
