export type Article = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  category: string;
  sections: { heading: string; body: string[] }[];
};

export const articles: Article[] = [
  {
    slug: "piso-flotante-simil-madera",
    title: "Aprende de Piso Flotante Símil Madera: Guía Completa y Consejos Prácticos",
    date: "17 de diciembre, 2024",
    excerpt: "Descubrí todo sobre el piso flotante símil madera con esta guía completa. Una opción popular por su accesibilidad, facilidad de instalación y diseño variado.",
    image: "https://maxipiso.com.ar/cdn/shop/articles/pHJTPV5Ym4pMNBFhrkipiZM2BHKAmJeyqTgfV77GhyzUw77TA-tmphicwi32e_700x700_crop_center.jpg?v=1734478781",
    category: "Pisos Flotantes",
    sections: [
      {
        heading: "¿Qué es el piso flotante símil madera?",
        body: [
          "El piso flotante símil madera es un material compuesto de resinas que imita la apariencia de la madera natural. Se instala sobre una base aislante sin necesidad de adhesivos, lo que lo hace ideal para renovaciones y de fácil remoción.",
          "Su sistema de instalación click hace que cualquier persona pueda colocarlo sin experiencia previa, ahorrando tiempo y costos de mano de obra.",
        ],
      },
      {
        heading: "Características principales",
        body: [
          "Resistente al desgaste, rayaduras y manchas.",
          "Instalación rápida con sistema click — sin adhesivos ni herramientas especiales.",
          "Mantenimiento mínimo comparado con maderas naturales.",
          "Disponible en múltiples diseños y tonos de madera.",
        ],
      },
      {
        heading: "Beneficios del piso flotante",
        body: [
          "Es más accesible que los pisos de madera natural, ofreciendo una estética similar a un costo significativamente menor. Además, su instalación rápida reduce los tiempos de obra.",
          "Cuenta con aislamiento acústico, gran variedad de diseños y opciones de fabricación ecológica. Algunos modelos son resistentes al agua, lo que los hace aptos para cocinas y baños.",
        ],
      },
      {
        heading: "Instalación paso a paso",
        body: [
          "Herramientas necesarias: sierra circular, palanca de instalación, cinta métrica, mazo de goma.",
          "1. Preparar la superficie: debe estar limpia, seca y nivelada.",
          "2. Colocar la base aislante (manto EVA).",
          "3. Comenzar desde una esquina dejando 8–10 mm de expansión en los bordes.",
          "4. Encajar las tablas con el sistema click.",
          "5. Cortar las piezas del perímetro con sierra.",
          "6. Dejar reposar 24 horas antes del uso normal.",
        ],
      },
      {
        heading: "Mantenimiento y cuidados",
        body: [
          "La limpieza diaria solo requiere una escoba o aspiradora de baja potencia. Los derrames deben limpiarse de inmediato.",
          "El trapeado se hace con un trapo húmedo (no mojado). La limpieza profunda mensual se realiza con productos aprobados por el fabricante, sin cera ni aceite.",
        ],
      },
      {
        heading: "Preguntas frecuentes",
        body: [
          "¿Es apto para todos los ambientes? Sí, excepto zonas de alta humedad sin modelos resistentes al agua.",
          "¿Por qué cruje o se separa? Puede deberse a falta de expansión en los bordes o superficie irregular. Revisar la nivelación y el manto base.",
        ],
      },
    ],
  },
  {
    slug: "piso-vinilico-guia-instalacion",
    title: "Como Instalar Piso Vinilico: Guía Paso a Paso para Principiantes",
    date: "27 de noviembre, 2024",
    excerpt: "Descubrí cómo transformar tu hogar con nuestra guía detallada para instalar piso vinílico. Una solución económica, resistente y de fácil colocación para cualquier ambiente.",
    image: "https://maxipiso.com.ar/cdn/shop/articles/JM6BJ5fKUjygPq87aovbiiHNy7UbKmosjiMVhI8NtiO6io6JA-tmpg9ynp_h5_700x700_crop_center.jpg?v=1732733352",
    category: "Pisos Vinílicos",
    sections: [
      {
        heading: "¿Qué es el piso vinílico?",
        body: [
          "El piso vinílico es un material sintético multicapa que incluye una capa de desgaste, una capa de impresión y una base. Resiste el agua y es de fácil mantenimiento, lo que lo hace ideal para cocinas y baños.",
          "Imita la estética de madera, piedra y cerámica a un costo significativamente menor.",
        ],
      },
      {
        heading: "Tipos de piso vinílico",
        body: [
          "LVT (Luxury Vinyl Tile): mayor durabilidad y resistencia para uso intensivo.",
          "Vinílico en rollo: la opción más económica para grandes superficies.",
          "Autoadhesivo: la instalación más simple, sin herramientas especiales.",
        ],
      },
      {
        heading: "Herramientas y materiales necesarios",
        body: [
          "Herramientas: cúter, regla metálica, nivel, escuadra, rodillo de presión, martillo y palanca.",
          "Materiales: manto base, adhesivos y selladores según el tipo de producto.",
          "Seguridad: anteojos, guantes y barbijo. Ventilación adecuada al trabajar en interiores.",
        ],
      },
      {
        heading: "Preparación del área",
        body: [
          "La superficie debe estar limpia, seca y nivelada. Inspeccionar la presencia de humedad y usar compound nivelador si es necesario.",
          "Medir el ambiente y agregar 10% de desperdicio al cálculo. Dejar que las cajas aclimaten al menos 48 horas a temperatura entre 18–29°C.",
        ],
      },
      {
        heading: "Proceso de instalación",
        body: [
          "Comenzar desde una esquina avanzando hacia la puerta. Dejar espacio de expansión en los bordes.",
          "Usar cúter bien afilado y regla metálica para cortes precisos. Hacer pruebas antes de la colocación definitiva.",
          "Aplicar sellador en las juntas, especialmente en zonas húmedas. Considerar acabado protector para mayor resistencia al rayado.",
        ],
      },
    ],
  },
  {
    slug: "instalacion-decks-wpc",
    title: "Instalación de Decks WPC: Guía Completa para Principiantes",
    date: "11 de noviembre, 2024",
    excerpt: "Si estás considerando un deck WPC para espacios al aire libre, encontrarás una excelente combinación de durabilidad, estética y sustentabilidad ambiental.",
    image: "https://maxipiso.com.ar/cdn/shop/articles/unnamed_700x700_crop_center.jpg?v=1731355623",
    category: "Exteriores WPC",
    sections: [
      {
        heading: "¿Qué es un Deck WPC?",
        body: [
          "Los decks WPC son estructuras construidas con una mezcla de madera y plástico reciclado. Estos materiales compuestos resisten el daño climático y la degradación que afecta a la madera tradicional.",
          "Ofrecen la durabilidad de la madera natural pero con mayor resistencia funcional, disponibles en distintos colores y texturas que imitan maderas exóticas.",
        ],
      },
      {
        heading: "Características del Deck WPC",
        body: [
          "Resistencia a la humedad, insectos y hongos gracias a sus componentes de plástico reciclado.",
          "Superficie antiastillas y antirajaduras — seguro para zonas de tránsito con niños y mascotas.",
          "Mantenimiento mínimo sin necesidad de tratamientos químicos.",
        ],
      },
      {
        heading: "Herramientas necesarias",
        body: [
          "Herramientas: martillo, destornillador, taladro eléctrico, sierras (manual o eléctrica), nivel de burbuja.",
          "Seguridad: anteojos, guantes resistentes, protección auditiva, barbijo antipolvo.",
        ],
      },
      {
        heading: "Preparación del área",
        body: [
          "Medir cuidadosamente el área con cinta métrica y estacas. El terreno debe estar nivelado y libre de obstáculos.",
          "Agregar capas de grava o arena debajo para mejorar el drenaje del agua.",
        ],
      },
      {
        heading: "Proceso de instalación",
        body: [
          "Colocar durmientes de madera tratada o bloques de hormigón como base, asegurando el nivelado previo.",
          "Comenzar desde un extremo, fijando las tablas WPC con tornillos de acero inoxidable y dejando pequeñas juntas de expansión entre cada tabla.",
          "Lijar los bordes filosos y aplicar sellador para protección. Realizar una inspección final.",
        ],
      },
      {
        heading: "Mantenimiento",
        body: [
          "Limpieza mensual con manguera y cepillo de cerdas suaves.",
          "Aplicación anual de protector UV para prevenir la decoloración por el sol.",
          "Retirar nieve con rasquetas de plástico. Reemplazar tablones dañados de forma individual.",
        ],
      },
    ],
  },
  {
    slug: "instalacion-revestimientos-wpc",
    title: "Como Instalar Revestimientos WPC",
    date: "7 de noviembre, 2024",
    excerpt: "Los revestimientos WPC combinan lo mejor de la madera y el plástico: máxima resistencia, bajo mantenimiento y una estética que transforma cualquier fachada.",
    image: "https://maxipiso.com.ar/cdn/shop/articles/unnamed-1_700x700_crop_center.jpg?v=1731018077",
    category: "Revestimientos WPC",
    sections: [
      {
        heading: "¿Qué son los revestimientos WPC?",
        body: [
          "El WPC (Wood Plastic Composite) es un material compuesto utilizado para revestir fachadas, terrazas y espacios exteriores. Su mezcla de fibras de madera y plástico ofrece características únicas que lo distinguen de la madera tradicional.",
          "Ha ganado popularidad por su versatilidad y durabilidad, siendo una opción sustentable para arquitectos y constructores.",
        ],
      },
      {
        heading: "Características y beneficios",
        body: [
          "Resistencia climática: no se agrieta, alabea ni pudre con el tiempo.",
          "Bajo mantenimiento: no requiere tratamientos químicos.",
          "Protección UV: el color se mantiene intacto.",
          "Aislamiento térmico: ayuda a regular la temperatura del ambiente.",
          "Superficie antideslizante: apto para zonas húmedas.",
          "Resistencia al moho: ideal para familias con niños y mascotas.",
        ],
      },
      {
        heading: "Tipos de revestimiento WPC",
        body: [
          "Acanalado: apariencia rústica ideal para estilos campestres.",
          "Liso: diseño contemporáneo para fachadas modernas.",
          "Múltiples colores que imitan maderas naturales y exóticas.",
        ],
      },
      {
        heading: "Herramientas necesarias",
        body: [
          "Sierra de calar o circular para cortar los paneles.",
          "Taladro eléctrico, nivel, cinta métrica.",
          "Protección: anteojos, guantes, barbijo, calzado de punta de acero.",
        ],
      },
      {
        heading: "Preparación del área",
        body: [
          "Medir la superficie con precisión. Un nivel láser garantiza líneas perfectas.",
          "Eliminar residuos y asegurarse de que la superficie esté nivelada.",
          "Instalar con clima seco y templado. Aclimatar los paneles 48 horas antes.",
        ],
      },
      {
        heading: "Proceso de instalación",
        body: [
          "Posicionar el primer panel en la esquina de la pared, asegurándose de que esté nivelado. Fijarlo con tornillos adecuados.",
          "Continuar colocando paneles con pequeñas juntas de expansión. Verificar el alineamiento regularmente.",
          "Aplicar piezas de terminación o molduras en esquinas y bordes para un acabado prolijo y protección contra la humedad.",
        ],
      },
      {
        heading: "Mantenimiento",
        body: [
          "Limpiar regularmente con agua y jabón suave. Evitar productos abrasivos que dañen la superficie.",
          "Reparar rayaduras menores con cepillos suaves y agua. El sistema modular permite el reemplazo fácil de secciones dañadas.",
        ],
      },
    ],
  },
];
