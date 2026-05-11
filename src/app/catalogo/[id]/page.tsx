"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { use } from "react";

const categoryLabel: Record<string, string> = {
  Porcelanato: "Porcelanato",
  Cerámica: "Cerámica",
  Madera: "Madera",
  Placas: "Placas",
  Accesorios: "Accesorios",
};

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = products.find((p) => p.id === id);

  if (!product) notFound();

  const gallery = product.images ?? [product.image];

  return <ProductDetail product={product} gallery={gallery} />;
}

function ProductDetail({
  product,
  gallery,
}: {
  product: ReturnType<typeof products.find> & {};
  gallery: string[];
}) {
  const [active, setActive] = useState(0);

  if (!product) return null;

  const waText = `Hola, quiero información sobre ${product.name}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#DF8635] transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/catalogo" className="hover:text-[#DF8635] transition-colors">Catálogo</Link>
          <span>/</span>
          <span className="text-[#111111] font-medium">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Gallery */}
          <div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50 mb-3">
              <Image
                src={gallery[active]}
                alt={product.name}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <span className="absolute top-4 left-4 bg-[#DF8635] text-white text-xs font-semibold px-3 py-1 rounded-full">
                {categoryLabel[product.category] ?? product.category}
              </span>
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${
                      active === i ? "border-[#DF8635]" : "border-transparent"
                    }`}
                  >
                    <Image src={src} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-4">{product.name}</h1>
            <p className="text-gray-600 leading-relaxed mb-8 text-base">{product.description}</p>

            {/* Specs */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">Especificaciones</h2>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="flex px-4 py-3 text-sm">
                      <span className="w-36 font-medium text-[#111111]">{k}</span>
                      <span className="text-gray-600">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/542214400536?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#DF8635] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#c97220] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Consultar por WhatsApp
              </a>
              <Link
                href="/catalogo"
                className="flex items-center justify-center gap-2 border border-gray-200 text-[#111111] font-semibold py-3 px-6 rounded-xl hover:border-[#DF8635] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Volver al catálogo
              </Link>
            </div>
          </div>
        </div>

        {/* Related products */}
        <RelatedProducts currentId={product.id} category={product.category} />
      </div>
    </div>
  );
}

function RelatedProducts({ currentId, category }: { currentId: string; category: string }) {
  const related = products
    .filter((p) => p.category === category && p.id !== currentId)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <div className="mt-20">
      <h2 className="text-2xl font-bold text-[#111111] mb-6">Más productos de esta línea</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {related.map((p) => (
          <Link
            key={p.id}
            href={`/catalogo/${p.id}`}
            className="group bg-gray-50 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative h-36 bg-gray-100 overflow-hidden">
              <Image
                src={p.image}
                alt={p.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="p-3">
              <p className="font-semibold text-[#111111] text-sm line-clamp-1">{p.name}</p>
              <p className="text-xs text-[#DF8635] mt-0.5">Ver detalle →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
