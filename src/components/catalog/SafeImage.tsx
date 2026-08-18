"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useState } from "react";
import { FiPackage } from "react-icons/fi";
import { cloudinaryTransform, isCloudinaryUrl } from "@/lib/cloudinary";

type SafeImageProps = {
  src: string;
  alt: string;
  /** Ocupa el contenedor. El padre TIENE que ser `position: relative`. */
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  iconSize?: number;
  /** Ancho/alto explicitos cuando no se usa `fill`. */
  width?: number;
  height?: number;
};

/**
 * Loader para imagenes de Cloudinary.
 *
 * next/image llama a esto una vez por entrada del srcset con el ancho que
 * corresponde, asi que Cloudinary entrega cada tamano ya convertido a WebP/AVIF
 * (`f_auto`) y con la calidad ajustada (`q_auto`). El resultado es responsive de
 * verdad y no pasa por el optimizador de Vercel, que se cobra aparte.
 */
function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  return cloudinaryTransform(src, width, quality);
}

/**
 * Imagen de catalogo con placeholder si la URL falla o esta vacia.
 *
 * Usa `next/image`: antes era un `<img>` crudo, asi que el navegador se bajaba
 * el original a tamano completo (hay JPGs de hasta 4 MB en public/productos).
 * Los hosts remotos permitidos estan en `lib/image-hosts.ts`, que alimenta tanto
 * `images.remotePatterns` como el CSP; una URL de otro host cae al placeholder,
 * que es el comportamiento deseado.
 */
export default function SafeImage({
  src,
  alt,
  fill,
  priority,
  sizes,
  className,
  iconSize = 44,
  width,
  height,
}: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-200 bg-[#F7F4EF]">
        <FiPackage size={iconSize} />
      </div>
    );
  }

  const common = {
    src,
    alt,
    className,
    onError: () => setError(true),
    priority,
    // Sin `priority`, next/image ya hace lazy loading.
    sizes: sizes ?? (fill ? "100vw" : undefined),
    // Solo las de Cloudinary llevan loader propio; el resto sigue el camino
    // normal de Next (optimizacion de las locales de public/).
    ...(isCloudinaryUrl(src) ? { loader: cloudinaryLoader } : {}),
  };

  if (fill) {
    return <Image {...common} fill />;
  }

  return <Image {...common} width={width ?? 400} height={height ?? 400} />;
}
