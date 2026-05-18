import Link from "next/link";
import { articles } from "@/data/novedades";

const landings = [
  {
    slug: "ofertas-mayoristas",
    title: "Ofertas imperdibles — hasta 30% OFF",
    excerpt: "Descuentos exclusivos en pisos y revestimientos. Packs por cantidad, envío inmediato y stock actualizado.",
    image: "/maderas.jpg",
    category: "Ofertas",
    date: "Actualizado permanentemente",
  },
  {
    slug: "trabaja-con-maxipiso",
    title: "¿Por qué trabajar con Maxipiso?",
    excerpt: "Stock garantizado, precios de mayorista, logística propia y más de 1.000 productos. Todo lo que necesita tu negocio en un solo proveedor.",
    image: "/equipo.jpg",
    category: "Para comercios",
    date: "Para revendedores y distribuidores",
  },
  {
    slug: "proyectos-y-obras",
    title: "Soluciones para grandes proyectos",
    excerpt: "Abastecemos obras de cualquier escala. Stock permanente, precios por volumen, logística coordinada y asesoramiento técnico especializado.",
    image: "/obras-construccion.jpg",
    category: "Obras & Proyectos",
    date: "Para constructoras y arquitectos",
  },
];

const allCards = [...landings, ...articles];

export default function NovedadesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#111111] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-widest">Blog</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-3">Novedades</h1>
          <p className="text-gray-400 text-lg">Guías, consejos y tendencias del mundo de los pisos y revestimientos.</p>
        </div>
      </div>

      {/* Grid unificado */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {allCards.map((card) => (
            <Link key={card.slug} href={`/novedades/${card.slug}`} className="group">
              <article className="rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all h-full flex flex-col">
                <div className="relative h-56 overflow-hidden bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-4 left-4 bg-[#DF8635] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {card.category}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-gray-400 text-xs mb-2">{card.date}</p>
                  <h2 className="font-bold text-[#111111] text-lg leading-snug group-hover:text-[#DF8635] transition-colors mb-3">
                    {card.title}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">
                    {card.excerpt}
                  </p>
                  <div className="mt-5 flex items-center gap-1 text-[#DF8635] text-sm font-semibold">
                    Leer más
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
