"use client";

import { useState } from "react";
import { FiPackage } from "react-icons/fi";
import SafeImage from "./SafeImage";

type ProductGalleryProps = {
  productName: string;
  categoryLabel?: string | null;
  images: string[];
};

export default function ProductGallery({ productName, categoryLabel, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.filter(Boolean);
  const activeImage = safeImages[activeIndex];
  const hasThumbs = safeImages.length > 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[72px_minmax(0,1fr)] gap-4 items-start">
      {hasThumbs && (
        <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {safeImages.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative w-[68px] h-[68px] md:w-[70px] md:h-[86px] rounded-[4px] overflow-hidden border transition-colors shrink-0 bg-white ${
                activeIndex === index ? "border-[#111111]" : "border-gray-200"
              }`}
            >
              <SafeImage src={src} alt={`${productName} miniatura ${index + 1}`} fill sizes="86px" className="object-cover" iconSize={20} />
            </button>
          ))}
        </div>
      )}

      <div className={`order-1 ${hasThumbs ? "md:order-2" : "md:col-span-2"} relative rounded-[5px] overflow-hidden bg-[#F7F4EF] aspect-square`}>
        {activeImage ? (
          <SafeImage
            src={activeImage}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
            iconSize={72}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <FiPackage size={72} />
          </div>
        )}
      </div>
    </div>
  );
}
