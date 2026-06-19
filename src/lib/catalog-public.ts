type ProductImage = { url: string };

export type CatalogDbProduct = {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  descripcion: string | null;
  precio: number;
  imagen: string | null;
  categoria: string | null;
  subcategoria: string | null;
  imagenes?: ProductImage[];
};

export type CatalogPublicProduct = CatalogDbProduct & {
  descripcion: string;
  galeria: string[];
  specs: Record<string, string>;
  destacado: boolean;
};

export const FEATURED_PRODUCT_SKUS: string[] = [];

const PRODUCT_METADATA: Record<
  string,
  {
    descripcion?: string;
    specs?: Record<string, string>;
    imagen?: string;
  }
> = {
  "25063": {
    descripcion:
      "Piso vinílico click SPC de uso residencial, en oferta. Formato de tabla ancha con gran estabilidad y excelente resistencia al agua.",
    specs: {
      Tipo: "Piso vinílico click SPC",
      Uso: "Residencial",
      Origen: "China",
      Espesor: "5 mm (4+1 mm)",
      "Capa de uso": "0,3 mm",
      Bisel: "Sí",
      Ancho: "230 mm",
      Largo: "1540 mm",
      "Cobertura por caja": "3.54 m2",
      Estado: "Oferta / discontinuo",
    },
  },
  "23554": {
    descripcion:
      "Piso flotante Water Resistant Kronotex, línea Adak, pensado para alto tránsito comercial interior con terminación AC5.",
    specs: {
      Tipo: "Piso flotante Water Resistant",
      Línea: "Adak",
      Marca: "Kronotex",
      Origen: "Alemania",
      Uso: "Comercial intenso",
      Espesor: "12 mm",
      Resistencia: "AC5",
      Bisel: "Sí",
      Ancho: "191 mm",
      Largo: "1380 mm",
      "Cobertura por caja": "1.32 m2",
      Estado: "Oferta",
    },
  },
  "22571": {
    descripcion:
      "Porcelanato mate rectificado simil madera Acacia White, apto exterior, ideal para espacios contemporáneos con look natural.",
    specs: {
      Tipo: "Porcelanato mate rectificado",
      Colección: "Acacia White",
      Marca: "Itagres",
      Origen: "Brasil",
      Terminación: "Simil madera",
      Uso: "Apto exterior",
      Espesor: "10 mm",
      Ancho: "160 mm",
      Largo: "1000 mm",
      "Cobertura por caja": "1.13 m2",
    },
  },
  "22323": {
    descripcion:
      "Piso de ingeniería prefinished entablonado en Tauari Tostado, con capa noble de madera natural y terminación semimate.",
    specs: {
      Tipo: "Piso de ingeniería prefinished",
      Madera: "Tauari Tostado",
      Terminación: "Semi mate",
      Marca: "Max Core",
      Origen: "Paraguay",
      Espesor: "12.4 mm",
      "Capa noble": "3 mm",
      Ancho: "131 mm",
      Largo: "Variado",
      "Cobertura por caja": "2.82 m2",
    },
  },
  "25383": {
    descripcion:
      "Revestimiento exterior WPC Max Core, terminación Smoke Grey, diseño alistonado de 5 varillas para fachadas y cerramientos modernos.",
    specs: {
      Tipo: "Revestimiento exterior WPC",
      Diseño: "Alistonado 5 varillas",
      Color: "Smoke Grey",
      Marca: "Max Core",
      Espesor: "25 mm",
      Ancho: "218.5 mm",
      Largo: "2900 mm",
      Cobertura: "0.64 m2",
    },
  },
  "22550": {
    descripcion:
      "Deck WPC Max Core, color Fresno Nórdico, ideal para exteriores de bajo mantenimiento y estética cálida.",
    specs: {
      Tipo: "Deck WPC",
      Línea: "Noble",
      Color: "Fresno Nórdico",
      Marca: "Max Core",
      Espesor: "25 mm",
      Ancho: "140 mm",
      Largo: "2900 mm",
      Cobertura: "0.41 m2",
    },
  },
  "23289": {
    descripcion:
      "Madera canteada Tajibo AD importada de Bolivia, disponible en distintos espesores y largos para trabajos estructurales y terminaciones de madera natural.",
    specs: {
      Tipo: "Madera canteada",
      Especie: "Tajibo AD",
      Origen: "Bolivia",
      Espesores: '1" | 1.5" | 2" | 3"',
      Largo: "2.10 m o más",
      Terminación: "Natural",
      Unidad: "p2",
    },
  },
  "3680": {
    descripcion:
      "Terminación de aluminio desnivel para pisos flotantes, disponible en varios largos y colores para resolver encuentros con terminación prolija.",
    specs: {
      Tipo: "Terminación de aluminio",
      Aplicación: "Accesorios para flotantes",
      Modelo: "Desnivel",
      Espesor: "10 mm",
      Largos: "0.90 m | 2.70 m",
      Colores: "Plata | Oro | Bronce | Champagne | Blanco | Negro",
    },
  },
};

export function isFeaturedSku(sku: string) {
  return FEATURED_PRODUCT_SKUS.includes(sku);
}

export function sortCatalogProducts<T extends { sku: string; categoria?: string | null; subcategoria?: string | null; nombre: string }>(
  products: T[],
) {
  return [...products].sort((left, right) => {
    const leftRank = FEATURED_PRODUCT_SKUS.indexOf(left.sku);
    const rightRank = FEATURED_PRODUCT_SKUS.indexOf(right.sku);

    if (leftRank !== rightRank) {
      if (leftRank === -1) return 1;
      if (rightRank === -1) return -1;
      return leftRank - rightRank;
    }

    const categoryCompare = (left.categoria ?? "").localeCompare(right.categoria ?? "", "es");
    if (categoryCompare !== 0) return categoryCompare;

    const subcategoryCompare = (left.subcategoria ?? "").localeCompare(right.subcategoria ?? "", "es");
    if (subcategoryCompare !== 0) return subcategoryCompare;

    return left.nombre.localeCompare(right.nombre, "es");
  });
}

export function enrichCatalogProduct(product: CatalogDbProduct): CatalogPublicProduct {
  const metadata = PRODUCT_METADATA[product.sku];
  const galeria = Array.from(
    new Set(
      [
        product.imagen,
        ...(product.imagenes?.map((image) => image.url) ?? []),
        metadata?.imagen,
      ].filter(Boolean) as string[],
    ),
  );

  return {
    ...product,
    descripcion: metadata?.descripcion ?? product.descripcion ?? "",
    galeria,
    specs: metadata?.specs ?? {},
    destacado: isFeaturedSku(product.sku),
  };
}
