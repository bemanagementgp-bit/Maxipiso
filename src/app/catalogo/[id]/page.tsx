// @ts-nocheck
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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findProductById, buildSpecsFromRow, TABLE_CATEGORIA, TABLE_LABELS } from "@/lib/all-products";
import { getFlagUrl, getCountryLabel } from "@/lib/flags";
import type { CatalogPublicProduct } from "@/lib/catalog-public";
import ProductGallery from "@/components/catalog/ProductGallery";
import ProductCarousel from "@/components/catalog/ProductCarousel";

function parseImagenes(val: string | null | undefined): string[] {
  if (!val) return [];
  const trimmed = val.trim();
  let parts: string[];
  if (trimmed.startsWith("[")) {
    try { parts = JSON.parse(trimmed); } catch { parts = []; }
  } else {
    parts = trimmed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  }
  return parts.map((s) => {
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
    return `/${s}`;
  });
}

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

type PathSegment = {
  text: string;
  href: string;
  className?: string;
};

const TABLE_SLUGS: Record<string, string> = {
  pisoFlotante: "pisos-flotantes",
  porcellanato: "porcellanatos",
  revestimiento: "revestimientos",
  pisoVinilico: "pisos-vinilicos",
  pisoMadera: "pisos-madera",
  deck: "decks",
  madera: "maderas",
  accesorio: "accesorios",
};

const CATEGORY_PAGE_PATHS: Record<string, string> = {
  "pisos-flotantes": "/catalogo",
  "pisos-vinilicos": "/catalogo",
  "pisos-madera": "/catalogo",
  "porcellanatos": "/catalogo",
  "revestimientos": "/catalogo",
  "decks": "/catalogo",
  "maderas": "/catalogo",
  "accesorios": "/catalogo",
};

function buildWA(msg: string) {
  return "https://wa.me/542214388894?text=" + encodeURIComponent(msg);
}

function buildCatalogHref(tableKey: string, filters: Record<string, string>) {
  const slug = TABLE_SLUGS[tableKey] ?? "";
  const params = new URLSearchParams();
  if (slug) params.set("categoria", slug);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(`filtros[${key}]`, value);
  });
  const query = params.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
}

function getProductCatalogPath(tableKey: string, raw: Record<string, unknown>): PathSegment[] {
  const baseCategory = TABLE_CATEGORIA[tableKey] ?? "Producto";
  const categoriaPrincipal = String(raw.categoriaPrincipal ?? "").trim();
  const categoriaSecundaria = String(raw.categoriaSecundaria ?? raw.subcategoria ?? "").trim();
  const tipoProducto = String(raw.tipoProducto ?? raw.tipoDeProducto ?? "").trim();
  const categoriaTerciaria = String(raw.categoriaTerciaria ?? "").trim();
  const uso = String(raw.uso ?? raw.tipoDeUso ?? "").trim();
  const material = String(raw.material ?? "").trim();
  const subtipo2 = String(raw.subtipo2 ?? "").trim();
  const subtipo = String(raw.subtipo ?? "").trim();
  const linea = String(raw.linea ?? "").trim();

  const pathDefs: Array<{ text: string; field?: string; value?: string }> = (() => {
    switch (tableKey) {
      case "pisoFlotante":
        return [
          { text: baseCategory },
          { text: categoriaSecundaria, field: "categoriaSecundaria", value: categoriaSecundaria },
          { text: tipoProducto, field: "tipoDeProducto", value: tipoProducto },
          { text: categoriaTerciaria, field: "categoriaTerciaria", value: categoriaTerciaria },
        ];
      case "pisoVinilico":
        return [
          { text: baseCategory },
          { text: categoriaSecundaria, field: "categoriaSecundaria", value: categoriaSecundaria },
          { text: tipoProducto, field: "tipoDeProducto", value: tipoProducto },
          { text: categoriaTerciaria, field: "categoriaTerciaria", value: categoriaTerciaria },
        ];
      case "porcellanato":
        return [
          { text: baseCategory },
          { text: categoriaSecundaria, field: "categoriaSecundaria", value: categoriaSecundaria },
          { text: tipoProducto, field: "tipoProducto", value: tipoProducto },
        ];
      case "pisoMadera":
        return [
          { text: baseCategory },
          { text: categoriaTerciaria, field: "categoriaTerciaria", value: categoriaTerciaria },
        ];
      case "madera":
        return [
          { text: baseCategory },
          { text: tipoProducto, field: "tipoProducto", value: tipoProducto },
        ];
      case "revestimiento":
        return [
          { text: tipoProducto, field: "tipoProducto", value: tipoProducto },
          { text: uso, field: "uso", value: uso },
        ];
      case "deck":
        return [
          { text: baseCategory },
          { text: tipoProducto, field: "tipoProducto", value: tipoProducto },
          { text: uso, field: "uso", value: uso },
        ];
      default:
        return [{ text: baseCategory }];
    }
  })();

  const normalize = (text: string) => text.trim().toLowerCase().replace(/s$/, "");

  const pathEntries = pathDefs.filter((entry, index, arr) => {
    if (!entry.text) return false;
    const norm = normalize(entry.text);
    return !arr.slice(0, index).some((prev) => prev.field === entry.field && prev.text && normalize(prev.text) === norm);
  });

  return pathEntries.map((entry, index) => {
    const filters: Record<string, string> = {};
    for (let i = 0; i <= index; i++) {
      const current = pathEntries[i];
      if (current.field && current.value) {
        filters[current.field] = current.value;
      }
    }
    return {
      text: entry.text,
      href: buildCatalogHref(tableKey, filters),
      className: "text-[11px] text-[#111111] hover:text-[#111111] transition-colors",
    };
  });
}

function getProductDetailPath(tableKey: string, raw: Record<string, unknown>): PathSegment[] {
  const categoriaSecundaria = String(raw.categoriaSecundaria ?? raw.subcategoria ?? "").trim();
  const tipoProducto = String(raw.tipoProducto ?? raw.tipoDeProducto ?? "").trim();
  const categoriaTerciaria = String(raw.categoriaTerciaria ?? "").trim();
  const uso = String(raw.uso ?? raw.tipoDeUso ?? "").trim();
  const material = String(raw.material ?? "").trim();
  const subtipo2 = String(raw.subtipo2 ?? "").trim();
  const subtipo = String(raw.subtipo ?? "").trim();
  const linea = String(raw.linea ?? "").trim();

  const pathDefs: Array<{ text: string; field?: string; value?: string }> = (() => {
    switch (tableKey) {
      case "pisoFlotante":
        return [
          { text: categoriaSecundaria, field: "categoriaSecundaria", value: categoriaSecundaria },
          { text: tipoProducto, field: "tipoDeProducto", value: tipoProducto },
        ];
      case "pisoVinilico":
        return [
          { text: tipoProducto, field: "tipoDeProducto", value: tipoProducto },
          { text: material, field: "material", value: material },
          { text: categoriaTerciaria, field: "categoriaTerciaria", value: categoriaTerciaria },
        ];
      case "porcellanato":
        return [{ text: tipoProducto, field: "tipoProducto", value: tipoProducto }];
      case "pisoMadera":
        return [
          { text: categoriaTerciaria, field: "categoriaTerciaria", value: categoriaTerciaria },
          { text: subtipo2, field: "subtipo2", value: subtipo2 },
          { text: subtipo, field: "subtipo", value: subtipo },
        ];
      case "madera":
        return [{ text: tipoProducto, field: "tipoProducto", value: tipoProducto }];
      case "revestimiento":
        return [
          { text: tipoProducto, field: "tipoProducto", value: tipoProducto },
          { text: uso, field: "uso", value: uso },
          { text: linea, field: "linea", value: linea },
        ];
      case "deck":
        return [
          { text: tipoProducto, field: "tipoProducto", value: tipoProducto },
          { text: uso, field: "uso", value: uso },
          { text: linea, field: "linea", value: linea },
        ];
      default:
        return [];
    }
  })();

  const normalize = (text: string) => text.trim().toLowerCase().replace(/s$/, "");
  const allLarge = tableKey === "madera";
  const tipoProductoLarge = tableKey === "pisoFlotante";
  const filters: Record<string, string> = {};

  return pathDefs
    .filter((entry, index, arr) => {
      if (!entry.text) return false;
      const norm = normalize(entry.text);
      return !arr.slice(0, index).some((prev) => prev.text && normalize(prev.text) === norm);
    })
    .map((entry, index) => {
      if (entry.field && entry.value) {
        filters[entry.field] = entry.value;
      }
      return {
        text: entry.text,
        href: buildCatalogHref(tableKey, filters),
        className: allLarge
          ? "text-[13px] font-semibold text-[#111111] hover:text-[#DF8635] transition-colors"
          : tipoProductoLarge && index === 1
            ? "text-[12px] font-semibold text-[#111111] hover:text-[#DF8635] transition-colors"
            : "text-[11px] text-[#111111] hover:text-[#DF8635] transition-colors",
      };
    });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session;

  const found = await findProductById(id);
  if (!found || !found.normalized.isActive) notFound();

  const { raw, normalized, tableKey } = found;

  // Build gallery from imagenes JSON array, semicolon/comma list, or single imagen field
  const imagenesArr: string[] = parseImagenes(raw.imagenes as string | null);
  const galeria: string[] = imagenesArr.length > 0
    ? [...imagenesArr, "/constante.png"]
    : ["/constante.png"];

  // Build specs from row fields
  const specs = buildSpecsFromRow(raw, tableKey);

  const product = {
    id:           normalized.id,
    sku:          normalized.sku,
    nombre:       (() => {
                    const cod = String(raw.codigo ?? "").trim();
                    if (cod && !normalized.nombre.toLowerCase().includes(cod.toLowerCase())) {
                      return `${normalized.nombre} ${cod}`.trim();
                    }
                    return normalized.nombre;
                  })(),
    marca:        normalized.marca ?? "",
    descripcion:  (raw.descripcion as string) ?? "",
    precio:       normalized.precio,
    imagen:       normalized.imagen ?? imagenesArr[0] ?? null,
    categoria:    normalized.categoria,
    subcategoria: (raw.categoriaSecundaria ?? raw.subcategoria ?? null) as string | null,
    origen:       (raw.origen as string) ?? "",
    imagenes:     imagenesArr.map((url) => ({ url })),
    galeria,
    specs,
    destacado:    false,
    unidadMedida: (raw.unidadMedida as string) ?? null,
    moneda:       (raw.moneda as string) ?? null,
  };

  const specEntries = specs;
  const consultHref = buildWA(`Hola, quiero consultar precio y disponibilidad de ${product.nombre} (SKU: ${product.sku}). Me pueden asesorar?`);

  const docCards = [
    { title: "Instalación",   href: buildWA(`Hola, quiero la guia de instalacion de ${product.nombre}.`) },
    { title: "Ficha Técnica", href: buildWA(`Hola, quiero la ficha tecnica de ${product.nombre}.`) },
    { title: "Garantía",      href: buildWA(`Hola, quiero info de garantia de ${product.nombre}.`) },
  ];

  // Productos similares (misma tabla/tipo)
  const relatedRaw = await (prisma as any)[tableKey]
    .findMany({ where: { id: { not: id }, isActive: true }, take: 12 })
    .catch(() => []);

  function rowToPublic(row: Record<string, unknown>, tk: string): CatalogPublicProduct {
    const imgs: string[] = parseImagenes(row.imagenes as string | null);
    const galeria = imgs.length > 0 ? imgs : [];
    return {
      id:          row.id as string,
      sku:         row.sku as string,
      nombre:      row.codigo && !String(row.nombre ?? row.sku).includes(String(row.codigo))
        ? `${(row.nombre ?? row.sku) as string} ${row.codigo}`.trim()
        : ((row.nombre ?? row.especie ?? row.sku) as string),
      marca:       (row.marca as string) ?? "",
      descripcion: (row.descripcion as string) ?? "",
      precio:      (row.precioM2 ?? row.precioCaja ?? row.precioTabla ?? row.precio ?? 0) as number,
      imagen:      imgs[0] ?? null,
      categoria:   (row.categoriaPrincipal as string) ?? "",
      subcategoria: (row.categoriaSecundaria as string) ?? null,
      origen:      (row.origen as string) ?? "",
      imagenes:    imgs.map((url) => ({ url })),
      galeria,
      specs:       buildSpecsFromRow(row, tk as any),
      destacado:   false,
    };
  }

  const related = (relatedRaw as Record<string, unknown>[]).map((r) => rowToPublic(r, tableKey));

  const productCatalogPath = getProductCatalogPath(tableKey, raw);
  const productDetailPath = getProductDetailPath(tableKey, raw);
  const badgeLabel = product.subcategoria ?? product.categoria ?? "Producto";

  return (
    <div className="min-h-screen bg-[#FBFAF7]">
      {/* Header negro */}
      <div className="w-full bg-[#111]">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <FiChevronRight size={12} />
            <Link href="/catalogo" className="hover:text-white transition-colors">Catálogo</Link>
            {productCatalogPath.length > 0 && productCatalogPath.map((segment, index) => (
              <span key={`${segment.text}-${index}`} className="inline-flex items-center gap-1">
                <FiChevronRight size={12} />
                <Link href={segment.href} className="hover:text-white transition-colors">
                  {segment.text}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="text-xl font-bold text-white tracking-tight">Detalle de producto</h1>
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
                  className="bg-white border border-gray-200 rounded-none min-h-[96px] px-5 py-4 flex items-center gap-4 hover:border-[#DF8635] hover:shadow-sm transition-all"
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
            {/* Badge + path */}
            {productDetailPath.length > 0 && (
              <div className="rounded-md bg-[#EFE0CB] px-3 py-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {productDetailPath.map((item, index) => (
                  <span key={`${item.text}-${index}`} className="inline-flex items-center gap-1">
                    <Link href={item.href} className={item.className}>
                      {item.text}
                    </Link>
                    {index < productDetailPath.length - 1 && (
                      <span className="mx-1 text-[#8A5A2B]">›</span>
                    )}
                  </span>
                ))}
                </div>
              </div>
            )}

            {/* Nombre */}
            <h1 className="text-[22px] md:text-[26px] font-bold text-[#111111] leading-[1.1] mb-2">
              {product.nombre}
            </h1>

            {product.descripcion && (
              <div className="mb-5">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.descripcion}
                </p>
              </div>
            )}

            {isAuthenticated && product.precio > 0 && (
              <p className="text-[#DF8635] font-bold text-lg mb-1">
                {product.precio > 500 ? "$" : "u$d"}{" "}
                {product.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  {product.unidadMedida ? `/${product.unidadMedida}` : "mayorista"}
                </span>
              </p>
            )}

            <div className="border-t border-gray-200 mt-3" />

            {/* Specs */}
            {specEntries.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                {specEntries.map(({ label, value }) => {
                  const Icon = getSpecIcon(label);
                  const isOrigin = label === "Origen";
                  const flagSrc = isOrigin ? getFlagUrl(value) : null;
                  return (
                    <div key={label} className="flex items-start gap-2.5 py-2.5 border-b border-gray-100">
                      <div className="mt-0.5 shrink-0 text-gray-400">
                        <Icon size={13} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#111111] leading-tight">{label}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-gray-500 leading-tight">{value}</p>
                          {flagSrc && (
                            <img
                              src={flagSrc}
                              alt={value}
                              className="w-5 h-3.5 object-cover rounded-[2px] border border-gray-200 shrink-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* CTA */}
            <div className="mt-4 space-y-3">
              {/* Calculá tu envío */}
              <a
                href={buildWA(`Hola, quiero calcular el envio de ${product.nombre} (SKU: ${product.sku}).`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-none text-[12px] font-medium text-[#111111] hover:border-[#DF8635] transition-colors bg-white"
              >
                <span className="flex items-center gap-2">
                  <FiTruck size={14} className="text-gray-400" />
                  Calculá tu envío
                </span>
                <FiChevronRight size={14} className="text-gray-400" />
              </a>

            </div>
          </aside>
        </div>

        {/* Productos similares */}
        <div className="mt-12">
          <ProductCarousel title="Productos Similares" href="/catalogo" products={related} showPrices={isAuthenticated} />
        </div>
      </div>
    </div>
  );
}




