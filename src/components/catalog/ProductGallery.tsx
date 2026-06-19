"use client";

import { useState } from "react";
import Image from "next/image";
import { FiPackage } from "react-icons/fi";

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
              <Image src={src} alt={`${productName} miniatura ${index + 1}`} fill className="object-cover" sizes="72px" />
            </button>
          ))}
        </div>
      )}

      <div className={`order-1 ${hasThumbs ? "md:order-2" : "md:col-span-2"} relative rounded-[5px] overflow-hidden bg-[#F7F4EF] aspect-[4/4.7] md:aspect-auto md:h-[690px]`}>
        {activeImage ? (
          <Image
            src={activeImage}
            alt={productName}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 60vw"
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