"use client";

import { useState } from "react";
import { FiPackage } from "react-icons/fi";

type SafeImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  iconSize?: number;
};

export default function SafeImage({ src, alt, fill, className, iconSize = 44 }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-200 bg-[#F7F4EF]">
        <FiPackage size={iconSize} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${fill ? "absolute inset-0 w-full h-full" : ""} ${className ?? ""}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
