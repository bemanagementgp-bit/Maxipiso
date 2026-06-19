// One-time patch: replaces catalogo/[id]/page.tsx with static-data version
const fs = require("fs");
const path = require("path");

const dest = path.join(__dirname, "../src/app/catalogo/[id]/page.tsx");

const content = `import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FiBox,
  FiChevronRight,
  FiFileText,
  FiGrid,
  FiHome,
  FiLayers,
  FiMapPin,
  FiPackage,
  FiTag,
  FiTruck,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { products, type Product } from "@/data/products";
import type { CatalogPublicProduct } from "@/lib/catalog-public";
import ProductGallery from "@/components/catalog/ProductGallery";
import ProductCarousel from "@/components/catalog/ProductCarousel";

function toPublic(p: Product): CatalogPublicProduct {
  return {
    id: p.id,
    sku: p.id,
    nombre: p.name,
    marca: "",
    descripcion: p.description,
    precio: 0,
    imagen: p.image,
    categoria: p.category,
    subcategoria: null,
    imagenes: [],
    galeria: p.images && p.images.length > 0 ? p.images : [p.image],
    specs: (p.specs as Record<string, string>) ?? {},
    destacado: false,
  };
}

function buildWA(msg: string) {
  return "https://wa.me/542214400536?text=" + encodeURIComponent(msg);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const raw = products.find((p) => p.id === id);
  if (!raw) notFound();

  const product = toPublic(raw);

  const specEntries = Object.entries(product.specs ?? {}).slice(0, 7);
  const specIcons = [FiBox, FiFileText, FiGrid, FiHome, FiMapPin, FiLayers, FiPackage];

  const consultHref = buildWA(
    "Hola, quiero consultar precio y disponibilidad de " + product.nombre + ". Me pueden asesorar?"
  );

  const docCards = [
    { title: "Instalacion",   subtitle: "Solicitar PDF", href: buildWA("Hola, quiero la guia de instalacion de " + product.nombre + ".") },
    { title: "Ficha tecnica", subtitle: "Solicitar PDF", href: buildWA("Hola, quiero la ficha tecnica de " + product.nombre + ".") },
    { title: "Garantia",      subtitle: "Solicitar PDF", href: buildWA("Hola, quiero info de garantia de " + product.nombre + ".") },
  ];

  const related = products
    .filter((p) => p.id !== id && p.category === raw.category)
    .slice(0, 12)
    .map(toPublic);

  const associated = products
    .filter((p) => p.id !== id && p.category !== raw.category)
    .slice(0, 12)
    .map(toPublic);

  return (
    <div className="min-h-screen bg-[#FBFAF7]">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link href="/" className="hover:text-[#111111] transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <Link href="/catalogo" className="hover:text-[#111111] transition-colors">Catalogo</Link>
            <FiChevronRight size={12} />
            <span className="text-[#111111] font-medium truncate max-w-[200px]">{product.nombre}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-8 items-start xl:[--detail-height:690px]">
          <div className="min-w-0">
            <ProductGallery
              productName={product.nombre}
              categoryLabel={product.subcategoria ?? product.categoria}
              images={product.galeria}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              {docCards.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-200 rounded-[4px] min-h-[108px] px-7 py-5 flex items-center gap-5 hover:border-[#DF8635] hover:shadow-sm transition-all"
                >
                  <div className="w-[62px] h-[70px] rounded-tl-xl rounded-tr-xl rounded-bl-xl bg-[#CDA77B] text-white flex flex-col items-center justify-center shrink-0">
                    <FiFileText size={26} />
                    <span className="text-xs font-bold mt-1">PDF</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#111111] text-xs uppercase tracking-wide">{card.title}</p>
                    <p className="text-xs text-gray-500">{card.subtitle}</p>
                  </div>
                  <FiChevronRight size={22} className="text-[#111111] shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <aside className="xl:h-[var(--detail-height)]">
            <div className="bg-transparent pt-1 xl:h-full xl:flex xl:flex-col">
              <p className="inline-flex rounded-md bg-[#EFE0CB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A5A2B] mb-3">
                {product.subcategoria ?? product.categoria ?? "Producto"}
              </p>
              <h1 className="text-[32px] md:text-[38px] font-bold text-[#111111] leading-none mb-2">
                {product.nombre}
              </h1>
              <p className="text-base text-gray-500 mb-5 line-clamp-2">
                {product.descripcion || "Consultanos para recibir ficha tecnica y disponibilidad actualizada."}
              </p>
              <div className="border-t border-b border-gray-200 divide-y divide-gray-200 xl:flex-1 xl:overflow-hidden">
                {specEntries.map(([label, value], index) => {
                  const Icon = specIcons[index] ?? FiPackage;
                  return (
                    <div key={label} className="grid grid-cols-[24px_1fr] gap-3 py-3 xl:py-3.5 min-w-0">
                      <Icon size={17} className="text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-[12px] font-bold text-[#111111] leading-tight">{label}</p>
                        <p className="text-[12px] text-gray-600 leading-tight mt-0.5 break-words">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="py-3.5 border-b border-gray-200 space-y-3">
                <div className="grid grid-cols-[24px_1fr] gap-3">
                  <FiTag size={17} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-bold text-[#111111] leading-tight">Precio x m2</p>
                    <p className="text-[12px] text-gray-600 leading-tight mt-0.5">Consultar precio</p>
                  </div>
                </div>
                <div className="grid grid-cols-[24px_1fr] gap-3">
                  <FiTruck size={17} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-bold text-[#111111] leading-tight">Envios a todo el pais</p>
                    <p className="text-[12px] text-gray-600 leading-tight mt-0.5">Consulta disponibilidad y plazos</p>
                  </div>
                </div>
              </div>
              <div className="pt-3 space-y-3">
                <a
                  href={consultHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-5 py-3 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-[#2a2a2a] transition-colors"
                >
                  <FaWhatsapp size={14} />
                  Consultar precio
                </a>
                <div className="rounded-md bg-[#F1ECE5] px-4 py-3 flex gap-3">
                  <div className="mt-0.5 text-[#8A5A2B] shrink-0"><FiTag size={15} /></div>
                  <div>
                    <p className="font-bold text-[#111111] text-xs">Precio mayorista</p>
                    <p className="text-xs mt-1 text-gray-600">Contactanos para obtener tu precio segun volumen.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="w-full">
          <ProductCarousel title="Productos similares" href="/catalogo" products={related} />
          <ProductCarousel title="Tambien te puede interesar" href="/catalogo" products={associated} />
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(dest, content, "utf8");
console.log("OK — written", content.split("\n").length, "lines to", dest);
