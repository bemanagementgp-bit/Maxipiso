import Link from "next/link";
import { articles } from "@/data/novedades";

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

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {articles.map((article) => (
            <Link key={article.slug} href={`/novedades/${article.slug}`} className="group">
              <article className="rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all h-full flex flex-col">
                <div className="relative h-56 overflow-hidden bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-4 left-4 bg-[#DF8635] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {article.category}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-gray-400 text-xs mb-2">{article.date}</p>
                  <h2 className="font-bold text-[#111111] text-lg leading-snug group-hover:text-[#DF8635] transition-colors mb-3">
                    {article.title}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">
                    {article.excerpt}
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
