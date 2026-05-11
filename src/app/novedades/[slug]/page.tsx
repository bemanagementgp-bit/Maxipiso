import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/novedades";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const others = articles.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero image */}
      <div className="relative h-72 md:h-[420px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
            <span className="inline-block bg-[#DF8635] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {article.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
              {article.title}
            </h1>
            <p className="text-white/50 text-sm">{article.date}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Excerpt */}
        <p className="text-gray-500 text-lg leading-relaxed mb-10 border-l-4 border-[#DF8635] pl-5">
          {article.excerpt}
        </p>

        {/* Sections */}
        <div className="space-y-10">
          {article.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-xl font-bold text-[#111111] mb-4 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#DF8635] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {section.heading}
              </h2>
              <ul className="space-y-2 pl-9">
                {section.body.map((para, j) => (
                  <li key={j} className="text-gray-600 leading-relaxed text-[15px]">
                    {para}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 bg-[#111111] rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">¿Querés más información?</h3>
          <p className="text-gray-400 mb-6">Consultá con nuestros asesores sobre este y otros productos Maxipiso.</p>
          <a
            href="https://wa.me/542214400536"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#DF8635] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#c97220] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Consultar por WhatsApp
          </a>
        </div>

        {/* Other articles */}
        {others.length > 0 && (
          <div className="mt-16">
            <h3 className="text-xl font-bold text-[#111111] mb-6">Más novedades</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {others.map((a) => (
                <Link key={a.slug} href={`/novedades/${a.slug}`} className="group">
                  <div className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="h-32 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.image}
                        alt={a.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400 mb-1">{a.date}</p>
                      <p className="font-semibold text-[#111111] text-sm leading-snug group-hover:text-[#DF8635] transition-colors line-clamp-2">
                        {a.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="mt-10">
          <Link
            href="/novedades"
            className="text-[#DF8635] font-semibold text-sm flex items-center gap-2 hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Volver a Novedades
          </Link>
        </div>
      </div>
    </div>
  );
}
