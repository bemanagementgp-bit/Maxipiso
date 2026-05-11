"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/empresa", label: "Empresa" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/tienda", label: "Tienda" },
  { href: "/novedades", label: "Novedades" },
  { href: "/distribuidores", label: "Distribuidores" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#111111] hover:text-[#DF8635] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://wa.me/542214400536?text=Hola%2C%20quiero%20información%20sobre%20productos%20Maxipiso"
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
          <nav className="flex flex-col gap-4 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#111111] font-medium hover:text-[#DF8635] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://wa.me/542214400536?text=Hola%2C%20quiero%20información%20sobre%20productos%20Maxipiso"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#DF8635] text-white font-semibold px-5 py-2 rounded-full text-center hover:bg-[#c97220] transition-colors"
            >
              Contactar Asesor
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
