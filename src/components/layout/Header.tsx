"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiChevronDown } from "react-icons/fi";
import { BsFillGridFill } from "react-icons/bs";
import { GiWoodPile } from "react-icons/gi";
import { MdDeck, MdLayers } from "react-icons/md";
import { FaTools } from "react-icons/fa";

// ─── Catálogo mega-menu data ─────────────────────────────────────────────────

const CATALOG_ITEMS = [
  {
    label: "Pisos",
    href: "/catalogo/pisos",
    Icon: BsFillGridFill,
    color: "#DF8635",
    subs: ["Flotantes", "Vinílicos", "Porcellanatos", "Madera e Ingeniería"],
    subHrefs: [ 
      "/catalogo/pisos#flotantes",
      "/catalogo/pisos#vinilicos",
      "/catalogo/pisos#porcellanatos",
      "/catalogo/pisos#madera",
    ],
  },
  {
    label: "Maderas",
    href: "/catalogo/maderas",
    Icon: GiWoodPile,
    color: "#b45309",
    subs: ["Nativas", "Exóticas", "Tratadas"],
    subHrefs: ["/catalogo/maderas", "/catalogo/maderas", "/catalogo/maderas"],
  },
  {
    label: "Decks",
    href: "/catalogo/decks",
    Icon: MdDeck,
    color: "#059669",
    subs: ["WPC", "Madera Natural"],
    subHrefs: ["/catalogo/decks", "/catalogo/decks"],
  },
  {
    label: "Revestimientos",
    href: "/catalogo/revestimientos",
    Icon: MdLayers,
    color: "#475569",
    subs: ["Exteriores", "Interiores"],
    subHrefs: ["/catalogo/revestimientos", "/catalogo/revestimientos"],
  },
  {
    label: "Accesorios",
    href: "/catalogo/accesorios",
    Icon: FaTools,
    color: "#71717a",
    subs: ["Zócalos", "Terminaciones", "Mantos"],
    subHrefs: [
      "/catalogo/accesorios",
      "/catalogo/accesorios",
      "/catalogo/accesorios",
    ],
  },
] as const;

const STATIC_LINKS = [
  { href: "/empresa", label: "Empresa" },
  { href: "/novedades", label: "Novedades" },
];

// ─── MegaMenu ────────────────────────────────────────────────────────────────

function MegaMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[780px] max-w-[96vw] bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 mt-2">
      {/* Arrow */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45" />

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 px-1">
        Catálogo Mayorista
      </p>

      <div className="grid grid-cols-5 gap-3">
        {CATALOG_ITEMS.map((item) => (
          <div key={item.label} className="flex flex-col gap-1.5">
            {/* Cabecera de columna */}
            <Link
              href={item.href}
              onClick={onClose}
              className="group flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${item.color}18` }}
              >
                <item.Icon size={15} style={{ color: item.color }} />
              </div>
              <span className="text-sm font-bold text-[#111111] group-hover:text-[#DF8635] transition-colors leading-tight">
                {item.label}
              </span>
            </Link>

            {/* Subcategorías */}
            <div className="flex flex-col gap-0.5 pl-2">
              {item.subs.map((sub, i) => (
                <Link
                  key={sub}
                  href={item.subHrefs[i] as string}
                  onClick={onClose}
                  className="text-xs text-gray-400 hover:text-[#111111] py-0.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {sub}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer strip */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
        <Link
          href="/catalogo"
          onClick={onClose}
          className="text-xs text-[#DF8635] font-semibold hover:underline"
        >
          Ver catálogo completo →
        </Link>
        <a
          href="https://wa.me/5422143888894"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-[#111111] transition-colors"
        >
          Consultar precios mayoristas por WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

export default function Header() {
  const [menuOpen, setMenuOpen]     = useState(false);

  /* Cerrar mega-menu al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setCatalogOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  */
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Maxipiso Mayorista"
              width={150}
              height={40}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">

            {STATIC_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#111111] hover:text-[#DF8635] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          <a
            href="/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#111111] hover:text-[#DF8635] transition-colors"
          >
            Catálogo
          </a>

            <a
              href="https://wa.me/5422143888894?text=Hola%2C%20quiero%20información%20sobre%20productos%20Maxipiso"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#DF8635] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#c97220] transition-colors"
            >
              Contactar Asesor
            </a>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[#111111]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-3">


            <a
              href="https://wa.me/5422143888894?text=Hola%2C%20quiero%20información%20sobre%20productos%20Maxipiso"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 bg-[#DF8635] text-white font-semibold px-5 py-2.5 rounded-full text-center hover:bg-[#c97220] transition-colors"
            >
              Contactar Asesor
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

