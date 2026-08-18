"use client";

import Image from "next/image";
import { useState } from "react";
import { FiPackage } from "react-icons/fi";

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
 * Imagen de catalogo con placeholder si la URL falla o esta vacia.
 *
 * Usa `next/image`: antes era un `<img>` crudo, asi que el navegador se bajaba
 * el original a tamano completo (hay JPGs de hasta 4 MB en public/productos).
 * Los hosts remotos permitidos estan en `images.remotePatterns` de
 * next.config.ts; una URL de otro host tira error de runtime y cae al
 * placeholder, que es el comportamiento deseado.
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
  };

  if (fill) {
    return <Image {...common} fill />;
  }

  return <Image {...common} width={width ?? 400} height={height ?? 400} />;
}
