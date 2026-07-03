"use client";

import Link from "next/link";
import { BsFillGridFill } from "react-icons/bs";
import { GiWoodPile } from "react-icons/gi";
import { MdDeck, MdLayers } from "react-icons/md";
import { FaTools } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";

const CATEGORIAS = [
  {
    slug: "pisos",
    label: "Pisos",
    descripcion: "Flotantes, vinilicos, porcellanatos y madera e ingenieria.",
    Icon: BsFillGridFill,
    href: "/catalogo/pisos",
    bgColor: "bg-amber-950",
    gradient: "from-amber-900/90 via-amber-800/70 to-stone-900/80",
    tags: ["Flotantes", "Vinilicos", "Porcellanatos", "Madera e Ingenieria"],
    accent: "#DF8635",
  },
  {
    slug: "maderas",
    label: "Maderas",
    descripcion: "Maderas solidas nobles y exoticas para interior y exterior.",
    Icon: GiWoodPile,
    href: "/catalogo/maderas",
    bgColor: "bg-yellow-950",
    gradient: "from-yellow-950/90 via-stone-800/70 to-stone-900/80",
    tags: ["Nativas", "Exoticas", "Tratadas"],
    accent: "#b45309",
  },
  {
    slug: "decks",
    label: "Decks",
    descripcion: "Madera natural y WPC para terrazas y espacios al aire libre.",
    Icon: MdDeck,
    href: "/catalogo/decks",
    bgColor: "bg-emerald-950",
    gradient: "from-emerald-950/90 via-emerald-900/70 to-stone-900/80",
    tags: ["WPC", "Madera Natural", "Exterior"],
    accent: "#059669",
  },
  {
    slug: "revestimientos",
    label: "Revestimientos",
    descripcion: "Exterior e interior — siding, perfiles, placas y mas.",
    Icon: MdLayers,
    href: "/catalogo/revestimientos",
    bgColor: "bg-slate-900",
    gradient: "from-slate-900/90 via-slate-800/70 to-stone-900/80",
    tags: ["Exteriores", "Interiores", "WPC", "EPS"],
    accent: "#475569",
  },
  {
    slug: "accesorios",
    label: "Accesorios",
    descripcion: "Zocalos, terminaciones, mantos y todo lo que necesitas.",
    Icon: FaTools,
    href: "/catalogo/accesorios",
    bgColor: "bg-zinc-900",
    gradient: "from-zinc-900/90 via-zinc-800/70 to-stone-900/80",
    tags: ["Zocalos", "Terminaciones", "Mantos"],
    accent: "#71717a",
  },
] as const;

type Cat = (typeof CATEGORIAS)[number];

function CategoryCard({ cat, index }: { cat: Cat; index: number }) {
  return (
    <Link
      href={cat.href}
      className="group relative overflow-hidden rounded-3xl min-h-[300px] sm:min-h-[360px] flex flex-col justify-end p-7 sm:p-9 cursor-pointer"
    >
      <div className={`absolute inset-0 ${cat.bgColor}`} />
      <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} transition-opacity duration-500 group-hover:opacity-80`} />
      <div className="absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(45deg,_#fff_0px,_#fff_1px,_transparent_1px,_transparent_8px)]" />
      <div className="absolute top-6 right-6 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-300">
        <cat.Icon size={90} color="white" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {cat.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-semibold text-white/60 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              {tag}
            </span>
          ))}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 leading-none tracking-tight">
          {cat.label}
        </h2>
        <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-xs">
          {cat.descripcion}
        </p>
        <div
          className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-300 group-hover:gap-3 group-hover:shadow-lg"
          style={{ backgroundColor: cat.accent, color: "#fff" }}
        >
          Ver catalogo
          <FiArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

export default function CatalogoHubPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <section className="relative overflow-hidden pt-24 pb-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-[#DF8635]/8 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <p className="text-[#DF8635] text-xs font-bold uppercase tracking-[0.25em] mb-4">
            Maxipiso Mayorista
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-none mb-5">
            Catalogo
            <span className="block text-[#DF8635]">de Productos</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto leading-relaxed">
            Selecciona una categoria para explorar nuestro stock mayorista.
            Precios USD &middot; Entrega en todo el pais.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <CategoryCard cat={CATEGORIAS[0]} index={0} />
          </div>
          <div>
            <CategoryCard cat={CATEGORIAS[1]} index={1} />
          </div>
          <div>
            <CategoryCard cat={CATEGORIAS[2]} index={2} />
          </div>
          <div>
            <CategoryCard cat={CATEGORIAS[3]} index={3} />
          </div>
          <div>
            <CategoryCard cat={CATEGORIAS[4]} index={4} />
          </div>
        </div>
      </section>

      <div className="border-t border-white/5 py-8 text-center">
        <p className="text-white/30 text-sm">
          Sos distribuidor?{" "}
          <a href="https://wa.me/5422143888894" target="_blank" rel="noopener noreferrer" className="text-[#DF8635] hover:underline">
            Consultanos precios mayoristas
          </a>
        </p>
      </div>
    </main>
  );
}
