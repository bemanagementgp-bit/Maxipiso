"use client";

import Link from "next/link";
import Image from "next/image";
import { useT } from "@/components/providers/IdiomaProvider";

export default function Footer() {
  const t = useT();
  return (
    <footer className="bg-[#111111] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <Image
              src="/logo.svg"
              alt="Maxipiso"
              width={140}
              height={38}
              style={{ height: "auto" }}
              className="brightness-0 invert mb-4"
            />
            <p className="text-gray-300 text-sm leading-relaxed">
              {t.pie.descripcion}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              {t.pie.navegacion}
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/" className="hover:text-[#DF8635] transition-colors">{t.nav.inicio}</Link></li>
              <li><Link href="/empresa" className="hover:text-[#DF8635] transition-colors">{t.nav.empresa}</Link></li>
              <li><Link href="/novedades" className="hover:text-[#DF8635] transition-colors">{t.nav.novedades}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t.pie.direccion}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Calle La Portada N°4261.<br />Berisso, Provincia de Buenos Aires.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t.pie.telefonos}</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              {["0810-999-9066", "0221-4615783", "0221-4617759", "0221-4640422"].map((tel) => (
                <li key={tel}><a href={`tel:${tel.replace(/-/g, "")}`} className="hover:text-[#DF8635] transition-colors">{tel}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{t.pie.horarios}</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>{t.pie.lunesAViernes}</li>
              <li>{t.pie.sabado}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-10 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Maxipiso Mayorista. {t.pie.derechos}
        </div>
      </div>
    </footer>
  );
}
