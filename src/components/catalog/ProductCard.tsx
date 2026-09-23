"use client";

/**
 * Tarjeta de producto del catalogo y sus auxiliares.
 *
 * Este archivo se llamaba CategoryListing.tsx y contenia ademas un componente
 * `CategoryListing` (listado por categoria con sidebar de filtros) que no
 * estaba montado en ninguna pagina: /catalogo usa su propio listado y solo
 * consume `ProductCard`, `EmptyState` y el tipo `CatalogItem` de aca.
 */

import { useState, useEffect, useCallback, memo, useMemo, useRef } from "react";
import Link from "next/link";
import { FiPackage, FiSearch, FiX, FiChevronRight, FiChevronDown, FiArrowLeft } from "react-icons/fi";
import SafeImage from "./SafeImage";
import { getFlagUrl, formatOriginLabel } from "@/lib/flags";
import StickerOverlay from "./StickerOverlay";
import type { Sticker } from "@/lib/stickers";
import { useT } from "@/components/providers/IdiomaProvider";
import { interpolar } from "@/lib/i18n";
import { pluralDeTipo, type ResumenGrupo } from "@/lib/variantes";
import { unidadDeFila } from "@/lib/unidad-precio";
import { primeraImagen } from "@/lib/imagenes";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CatalogItem = {
  id: string;
  sku: string;
  nombre?: string;
  especie?: string;
  marca?: string;
  linea?: string;
  precioM2?: number;
  precioCaja?: number;
  precio?: number;
  moneda?: string;
  stock?: number;
  origen?: string;
  imagen?: string;
  imagenes?: string;
  /** Stickers ya resueltos por el servidor. */
  stickersResueltos?: Sticker[];
  /** Las opciones del grupo, resueltas por el servidor. Ver `ResumenGrupo`. */
  grupoVariantes?: ResumenGrupo;
  descripcion?: string;
  espesor?: string;
  ancho?: string;
  largo?: string;
  isActive: boolean;
  [key: string]: unknown;
};

type FilterGroup = {
  label: string;
  values: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeImageUrl(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
  return `/${src}`;
}

function firstImage(item: CatalogItem): string | null {
  return primeraImagen(item.imagenes);
}

function displayName(item: CatalogItem): string {
  const base = item.nombre || item.especie || item.sku;
  if (item.codigo && !base.includes(String(item.codigo))) {
    return `${base} ${item.codigo}`.trim();
  }
  return base;
}

/**
 * Las opciones del grupo, en la card.
 *
 * El catalogo dibuja una card por grupo, asi que sin esto un piso que viene en
 * ocho colores se ve igual que uno que viene en uno solo, y la unica forma de
 * enterarse es entrar. La card es donde esa informacion sirve, porque es donde
 * se decide si entrar.
 *
 * **Sin tipo que nombrar se cuentan versiones.** Cuando las opciones no
 * distinguen nada —los niveladores cargados todos como "Color: Plata"— igual
 * hay mas de un producto ahi adentro, y la ficha los lista bajo "Otras
 * versiones". Callarse seria peor: es justo el caso en que el catalogo parecia
 * tener un producto donde habia seis.
 *
 * **Miniaturas solo si distinguen algo.** Si las variantes comparten la foto
 * —pasa cuando el grupo son medidas del mismo piso, o cuando todavia no se
 * cargaron las fotos de cada color— cinco cuadraditos iguales no dicen nada:
 * se pone el texto, "6 colores", que si dice.
 *
 * Cada miniatura es un link directo a esa variante: se elige el color desde la
 * grilla, sin pasar por la ficha.
 */
function OpcionesDelGrupo({ resumen }: { resumen: ResumenGrupo }) {
  const fotosDistintas = new Set(resumen.muestras.map((m) => m.imagen ?? "")).size > 1;
  const resto = resumen.total - resumen.muestras.length;

  if (!fotosDistintas) {
    return (
      <p className="text-[11px] text-gray-500">
        {/* Sin tipo, el grupo existe pero ninguna opción lo distingue: se
            cuentan versiones, que es lo único cierto que se puede decir. */}
        Disponible en {resumen.tipo ? pluralDeTipo(resumen.tipo, resumen.total) : `${resumen.total} versiones`}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {resumen.muestras.map((m) => (
        <Link
          key={m.id}
          href={`/catalogo/${m.id}`}
          title={`${resumen.tipo}: ${m.valor}`}
          className="relative block w-6 h-6 rounded-md overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#DF8635] transition-colors shrink-0"
        >
          {m.imagen && <SafeImage src={m.imagen} alt={m.valor} fill sizes="24px" className="object-cover" />}
        </Link>
      ))}
      {resto > 0 && <span className="text-[11px] text-gray-500">+{resto}</span>}
    </div>
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

function ProductCardBase({
  item,
  categorySlug,
}: {
  item: CatalogItem;
  categorySlug: string;
}) {
  const t = useT();
  const img = firstImage(item);
  const name = displayName(item);
  const waText = encodeURIComponent(
    `Hola, quiero consultar disponibilidad y precio de: ${name} (SKU: ${item.sku}). ¿Me pueden asesorar?`
  );

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-100 hover:border-[#DF8635]/40 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_360px]"
    >
      <Link
        href={`/catalogo/${item.id}`}
        className="relative aspect-square bg-gray-50 overflow-hidden block shrink-0"
      >
        <SafeImage
          src={img ?? ""}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-contain group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute bottom-2 left-2 z-10 bg-black/60 text-white text-[9px] font-mono px-2 py-0.5 rounded">
          {item.sku}
        </span>
        <StickerOverlay stickers={item.stickersResueltos ?? []} abajoIzq="bottom-9" />
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-1.5">
        {(typeof item._tablaLabel === "string" || typeof item.categoriaTerciaria === "string") && (
          <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">
            {item._tablaLabel as string}
            {item.categoriaTerciaria ? ` — ${item.categoriaTerciaria as string}` : ""}
          </p>
        )}

        <Link
          href={`/catalogo/${item.id}`}
          className="font-bold text-[#111111] text-sm leading-snug hover:text-[#DF8635] transition-colors line-clamp-2"
        >
          {name}
        </Link>

        {item.grupoVariantes && <OpcionesDelGrupo resumen={item.grupoVariantes} />}

        {(item.precioM2 || item.precioCaja || item.precio) && (
          <p className="text-[#DF8635] font-bold text-sm">
            {((item.precioM2 ?? item.precioCaja ?? item.precio) ?? 0) > 500 ? "$" : "u$d"}{" "}
            {(item.precioM2 ?? item.precioCaja ?? item.precio)?.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            {/* Antes salia "/m²" o "/caja" y nada mas: un accesorio, que cobra
                `precio` a secas, mostraba el numero pelado y no habia forma de
                saber si era por metro, por rollo o por unidad. */}
            {unidadDeFila(item) ? ` /${unidadDeFila(item)}` : ""}
          </p>
        )}

        {/* El país con su bandera queda sólo en Maderas, donde la procedencia es
            parte de lo que se compra. En el resto lo reemplazan los stickers,
            que se eligen por producto y dicen más que el origen solo. */}
        {item.origen && item._tabla === "maderas" && (() => {
          const flagSrc = getFlagUrl(item.origen);
          const label = formatOriginLabel(item.origen);
          return (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span>{label}</span>
              {flagSrc && (
                <img src={flagSrc} alt={label ?? ""} className="w-4 h-3 object-cover rounded-[1px]" />
              )}
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-2 mt-auto pt-3">
          <Link
            href={`/catalogo/${item.id}`}
            className="text-center border border-gray-200 text-[#111111] text-xs font-semibold py-2.5 rounded-xl hover:border-[#DF8635] transition-colors"
          >
            {t.catalogo.verDetalle}
          </Link>
          <a
            href={`https://wa.me/542214388894?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center bg-[#DF8635] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#c97220] transition-colors"
          >
            {t.catalogo.consultar}
          </a>
        </div>
      </div>
    </article>
  );
}

// Memoizado: al tipear en el buscador o cambiar filtros, sólo se re-renderizan
// las tarjetas cuyo `item` realmente cambió, no toda la grilla.
export const ProductCard = memo(ProductCardBase);

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-5 bg-gray-100 rounded w-1/2 mt-3" />
        <div className="h-9 bg-gray-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({ label }: { label: string }) {
  const t = useT();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-[#DF8635]/10 flex items-center justify-center mb-5">
        <FiPackage size={36} className="text-[#DF8635]" />
      </div>
      <h3 className="text-xl font-bold text-[#111111] mb-2">{t.catalogo.sinResultados}</h3>
      <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
        {interpolar(t.catalogo.sinResultadosDetalle, { categoria: label })}
      </p>
      <a
        href="https://wa.me/542214388894?text=Hola%2C%20quiero%20consultar%20disponibilidad%20de%20productos"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 bg-[#DF8635] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#c97220] transition-colors"
      >
        {t.catalogo.consultarPorWhatsapp}
      </a>
    </div>
  );
}
