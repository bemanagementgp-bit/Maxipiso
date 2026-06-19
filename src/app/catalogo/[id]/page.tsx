import { notFound } from "next/navigation";
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
  FiInfo,
  FiDroplet,
  FiMaximize2,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import type { CatalogPublicProduct } from "@/lib/catalog-public";
import ProductGallery from "@/components/catalog/ProductGallery";
import ProductCarousel from "@/components/catalog/ProductCarousel";

// Mapa de labels de spec → icono
const SPEC_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "Origen":                FiMapPin,
  "Espesores Disponibles": FiLayers,
  "Medidas":               FiMaximize2,
  "Secado":                FiDroplet,
  "Tipo de Piso":          FiBox,
  "Tipo":                  FiBox,
  "Descripción":           FiFileText,
  "Descripcion":           FiFileText,
  "Capa de Uso":           FiHome,
  "Rendimiento":           FiPackage,
  "Uso":                   FiHome,
  "Resistencia":           FiGrid,
  "Espesor":               FiLayers,
  "Ancho":                 FiMaximize2,
  "Largo":                 FiMaximize2,
  "Bisel":                 FiInfo,
  "Rectificado":           FiInfo,
  "Colección":             FiInfo,
  "Coleccion":             FiInfo,
  "Línea":                 FiInfo,
  "Linea":                 FiInfo,
  "Marca":                 FiTag,
};

function getSpecIcon(label: string) {
  return SPEC_ICON_MAP[label] ?? FiInfo;
}

function formatPrice(precio: number, moneda?: string | null, unidad?: string | null) {
  if (!precio || precio <= 0) return "Consultar";
  const sym = moneda === "ARS" ? "$" : "U$S";
  const formatted = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(precio);
  return `${sym} ${formatted}${unidad ? ` / ${unidad}` : ""}`;
}

function buildWA(msg: string) {
  return "https://wa.me/5422143888894?text=" + encodeURIComponent(msg);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const raw = await prisma.product.findUnique({
    where: { id },
    include: { imagenes: true },
  });
  if (!raw) notFound();

  const galeria: string[] = raw.imagenes.length > 0
    ? raw.imagenes.map((img) => img.url)
    : raw.imagen
    ? [raw.imagen]
    : [];

  // Parsear specs del JSON guardado en BD
  let specs: Record<string, string> = {};
  try {
    if (raw.specs) specs = JSON.parse(raw.specs as string);
  } catch { specs = {}; }

  const product: CatalogPublicProduct & { unidadMedida?: string | null; moneda?: string | null } = {
    id: raw.id,
    sku: raw.sku,
    nombre: raw.nombre,
    marca: raw.marca,
    descripcion: raw.descripcion ?? "",
    precio: raw.precio,
    imagen: raw.imagen,
    categoria: raw.categoria,
    subcategoria: raw.subcategoria,
    imagenes: raw.imagenes,
    galeria,
    specs,
    destacado: raw.destacado ?? false,
    unidadMedida: raw.unidadMedida,
    moneda: raw.moneda,
  };

  const specEntries = Object.entries(specs);
  const consultHref = buildWA(`Hola, quiero consultar precio y disponibilidad de ${product.nombre} (SKU: ${product.sku}). Me pueden asesorar?`);

  const docCards = [
    { title: "Instalación",   href: buildWA(`Hola, quiero la guia de instalacion de ${product.nombre}.`) },
    { title: "Ficha Técnica", href: buildWA(`Hola, quiero la ficha tecnica de ${product.nombre}.`) },
    { title: "Garantía",      href: buildWA(`Hola, quiero info de garantia de ${product.nombre}.`) },
  ];

  // Productos similares (misma categoría)
  const relatedRaw = raw.categoria
    ? await prisma.product.findMany({
        where: { categoria: raw.categoria, id: { not: id }, isActive: true },
        include: { imagenes: true },
        take: 12,
      })
    : [];

  // Productos asociados (distinta categoría, destacados primero)
  const associatedRaw = await prisma.product.findMany({
    where: { categoria: { not: raw.categoria ?? undefined }, id: { not: id }, isActive: true },
    include: { imagenes: true },
    orderBy: { destacado: "desc" },
    take: 12,
  });

  function toPublic(p: typeof relatedRaw[0]): CatalogPublicProduct {
    const imgs = p.imagenes.length > 0 ? p.imagenes.map((i) => i.url) : p.imagen ? [p.imagen] : [];
    let pSpecs: Record<string, string> = {};
    try { if (p.specs) pSpecs = JSON.parse(p.specs as string); } catch { pSpecs = {}; }
    return {
      id: p.id, sku: p.sku, nombre: p.nombre, marca: p.marca,
      descripcion: p.descripcion ?? "", precio: p.precio, imagen: p.imagen,
      categoria: p.categoria, subcategoria: p.subcategoria,
      imagenes: p.imagenes, galeria: imgs, specs: pSpecs, destacado: p.destacado,
    };
  }

  const related = relatedRaw.map(toPublic);
  const associated = associatedRaw.map(toPublic);

  const badgeLabel = product.subcategoria ?? product.categoria ?? "Producto";
  const precioLabel = formatPrice(product.precio, product.moneda, product.unidadMedida);

  return (
    <div className="min-h-screen bg-[#FBFAF7]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link href="/" className="hover:text-[#111111] transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <a href="https://maxipiso.com.ar/collections/" target="_blank" rel="noopener noreferrer" className="hover:text-[#111111] transition-colors">Catálogo</a>
            {product.categoria && (
              <>
                <FiChevronRight size={12} />
                <Link href={`/catalogo?cat=${product.categoria}`} className="hover:text-[#111111] transition-colors">
                  {product.categoria}
                </Link>
              </>
            )}
            <FiChevronRight size={12} />
            <span className="text-[#111111] font-medium truncate max-w-[200px]">{product.nombre}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Grid principal */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-10 items-start">

          {/* ── Columna izquierda: Galería + PDFs ── */}
          <div className="min-w-0">
            <ProductGallery
              productName={product.nombre}
              categoryLabel={badgeLabel}
              images={product.galeria}
            />

            {/* PDF Cards — solo para categoría Pisos */}
            {product.categoria === "Pisos" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {docCards.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-200 rounded-lg min-h-[96px] px-5 py-4 flex items-center gap-4 hover:border-[#DF8635] hover:shadow-sm transition-all"
                >
                  <div className="w-[52px] h-[60px] rounded-tl-xl rounded-tr-xl rounded-bl-xl bg-[#CDA77B] text-white flex flex-col items-center justify-center shrink-0">
                    <FiFileText size={22} />
                    <span className="text-[10px] font-bold mt-0.5">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#111111] text-xs uppercase tracking-wide leading-tight">{card.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Descargar PDF</p>
                  </div>
                  <FiChevronRight size={18} className="text-gray-400 shrink-0" />
                </a>
              ))}
            </div>
            )}
          </div>

          {/* ── Columna derecha: Detalle ── */}
          <aside className="xl:sticky xl:top-24">
            {/* Badge */}
            <span className="inline-flex items-center rounded-md bg-[#EFE0CB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A5A2B] mb-4">
              {badgeLabel}
            </span>

            {/* Nombre */}
            <h1 className="text-[34px] md:text-[40px] font-bold text-[#111111] leading-[1.05] mb-1">
              {product.nombre}
            </h1>

            {/* Subtítulo */}
            {product.marca && product.marca !== "Maxipiso" && (
              <p className="text-base text-gray-400 mb-1">{product.marca}</p>
            )}
            {product.subcategoria && (
              <p className="text-sm text-gray-400 mb-4">{product.subcategoria}</p>
            )}

            <div className="border-t border-gray-200 mt-3" />

            {/* Specs */}
            {specEntries.length > 0 && (
              <div className="divide-y divide-gray-100 mb-0">
                {specEntries.map(([label, value]) => {
                  const Icon = getSpecIcon(label);
                  return (
                    <div key={label} className="flex items-start gap-3 py-3">
                      <div className="mt-0.5 shrink-0 text-gray-400">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#111111] leading-tight">{label}</p>
                        <p className="text-[12px] text-gray-500 leading-tight mt-0.5">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Precio */}
            <div className="border-t border-gray-200 divide-y divide-gray-100">
              <div className="flex items-start gap-3 py-3">
                <div className="mt-0.5 shrink-0 text-gray-400"><FiTag size={16} /></div>
                <div>
                  <p className="text-[11px] font-bold text-[#111111] leading-tight">
                    Precio {product.unidadMedida ? `x ${product.unidadMedida}` : ""}
                  </p>
                  <p className="text-[12px] text-gray-500 leading-tight mt-0.5">{precioLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <div className="mt-0.5 shrink-0 text-gray-400"><FiTruck size={16} /></div>
                <div>
                  <p className="text-[11px] font-bold text-[#111111] leading-tight">Envíos a todo el país</p>
                  <p className="text-[12px] text-gray-500 leading-tight mt-0.5">Consultá disponibilidad y plazos</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-4 space-y-3">
              <a
                href={consultHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-5 py-3.5 text-[13px] font-bold uppercase tracking-widest text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <FaWhatsapp size={16} />
                Consultar precio
              </a>

              {/* Calculá tu envío */}
              <a
                href={buildWA(`Hola, quiero calcular el envio de ${product.nombre} (SKU: ${product.sku}).`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg text-[12px] font-medium text-[#111111] hover:border-[#DF8635] transition-colors bg-white"
              >
                <span className="flex items-center gap-2">
                  <FiTruck size={14} className="text-gray-400" />
                  Calculá tu envío
                </span>
                <FiChevronRight size={14} className="text-gray-400" />
              </a>

              {/* Promo box */}
              <div className="rounded-lg bg-[#F1ECE5] px-4 py-3 flex items-start gap-3">
                <FiTag size={15} className="text-[#8A5A2B] mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-[#111111] text-xs">Espacio para promociones</p>
                  <p className="text-xs text-gray-500 mt-0.5">Descuentos, cuotas y más.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Carruseles */}
        <div className="mt-12 space-y-2">
          <ProductCarousel title="Productos Similares"         href="https://maxipiso.com.ar/collections/" products={related} />
          <ProductCarousel title="Productos Asociados"         href="https://maxipiso.com.ar/collections/" products={associated} />
        </div>
      </div>
    </div>
  );
}



