import type { Diccionario } from "./es";

/**
 * Ingles.
 *
 * Tipado contra el diccionario espanol: si falta una clave, no compila.
 *
 * Los telefonos, la direccion y los horarios no se traducen: son datos, no
 * texto. El nombre de las categorias tampoco cuando es tecnico ("WPC").
 */
export const en: Diccionario = {
  idioma: { etiqueta: "Language", cambiar: "Change language" },

  meta: {
    titulo: "Maxipiso | Leaders in Flooring, Timber and Wall Cladding",
    descripcion: "Maxipiso, N°1 in Argentina for the import and distribution of flooring, timber and wall cladding. Porcelain tile, wood, ceramics and accessories for distributors and trade professionals.",
  },

  nav: {
    inicio: "Home",
    empresa: "Company",
    novedades: "News",
    catalogo: "Catalogue",
    contactarAsesor: "Talk to an advisor",
    catalogoMayorista: "Wholesale catalogue",
    verCatalogoCompleto: "See full catalogue",
    consultarPrecios: "Ask for wholesale prices on WhatsApp",
    abrirMenu: "Open menu",
    cerrarMenu: "Close menu",
  },

  categorias: {
    pisos: "Flooring",
    maderas: "Timber",
    decks: "Decking",
    revestimientos: "Wall cladding",
    accesorios: "Accessories",
    flotantes: "Laminate",
    vinilicos: "Vinyl",
    porcelanatos: "Porcelain tile",
    maderaIngenieria: "Solid & engineered wood",
    nativas: "Native",
    exoticas: "Exotic",
    tratadas: "Treated",
    wpc: "WPC",
    maderaNatural: "Natural wood",
    exteriores: "Exterior",
    interiores: "Interior",
    zocalos: "Skirting boards",
    terminaciones: "Trims",
    mantos: "Underlay",
  },

  pie: {
    descripcion: "Leaders in the import and distribution of flooring, timber and wall cladding. N°1 in Argentina.",
    navegacion: "Navigation",
    direccion: "Address",
    telefonos: "Phone",
    horarios: "Opening hours",
    lunesAViernes: "Monday to Friday 8:00 - 17:00",
    sabado: "Saturday 8:00 - 12:00",
    derechos: "All rights reserved.",
  },

  home: {
    heroEtiqueta: "N°1 in Argentina",
    heroTituloA: "Leaders in the",
    heroTituloB: "import and distribution",
    heroTituloC: "of flooring, timber and wall cladding.",
    verCatalogo: "See catalogue",
    contactarAsesor: "Talk to an advisor",

    lineasEtiqueta: "Catalogue",
    lineasTitulo: "Our product lines",
    lineasSubtitulo: "The widest imported range, all in one place",

    statsEtiqueta: "The numbers speak for themselves",

    experienciaEtiqueta: "More than 60 years of experience",

    statsClientes: "clients",
    statsStock: "m² in stock",
    statsAnios: "years",
    statsDeposito: "m² of warehouse",

    novedadesEtiqueta: "Blog & guides",
    novedadesTitulo: "News",
    verTodas: "See all",
    leerMas: "Read more",

    porQueTitulo: "Why choose us?",
    importacionEtiqueta: "Direct import",

    contactoEtiqueta: "Contact",
    contactoTitulo: "How can we help you?",
    emailVentas: "Sales email",
    mensajeEnviado: "Message sent!",
    mensajeEnviadoDetalle: "We'll get back to you shortly.",
    enviarOtro: "Send another message",
    campoNombre: "Name",
    campoEmpresa: "Company",
    campoTelefono: "Phone",
    campoEmail: "Email",
    campoMensaje: "Message",
    enviar: "Send",
    enviando: "Sending…",
    errorEnvio: "Something went wrong. Try us on WhatsApp.",

    ticker: [
      "Direct import", "1,000+ active distributors", "Delivery across the country",
      "60+ years in the trade", "Guaranteed stock", "N°1 in Argentina",
      "Wholesale distribution", "Technical advice", "Imports from 5 continents",
      "The widest range on the market",
    ],
    cadena: {
      importacion:  { titulo: "Direct import",          texto: "We work with the best manufacturers in Europe, Asia and the Americas. No middlemen, source pricing." },
      stock:        { titulo: "Permanent stock",        texto: "Our own warehouse with thousands of m² in stock. Immediate availability for orders of any size." },
      distribucion: { titulo: "Nationwide distribution", texto: "24 provinces covered. A network of active distributors across the country with guaranteed dispatch." },
    },
    importacion: {
      titulo: "From the manufacturer to your business, with no middlemen",
      texto: "We import straight from the best manufacturers in Europe, Asia and the Americas. That lets us offer you the most competitive price on the market with the widest range available.",
      puntos: [
        "Permanent stock of over 1,000 products",
        "Quality control at source",
        "Direct wholesale pricing",
        "Nationwide delivery with our own fleet",
      ],
    },
    beneficios: {
      importacion:   { titulo: "Direct import",      texto: "We import straight from the source to guarantee the best quality and price." },
      cobertura:     { titulo: "Nationwide reach",   texto: "A distributor network across the country. From north to south, we get there." },
      variedad:      { titulo: "Wide range",         texto: "Over 1,000 products in stock — the widest range on the market." },
      asesoramiento: { titulo: "Technical advice",   texto: "More than 60 years of experience at your service on every project." },
    },
  },

  catalogo: {
    titulo: "Catalogue",
    subtitulo: "Browse our full wholesale stock. We deliver across the country.",
    buscar: "Search…",
    categoria: "Category",
    todasLasCategorias: "All categories",
    filtros: "Filters",
    limpiar: "Clear",
    todos: "All",
    ordenarPor: "Sort by",
    productos: "products",
    producto: "product",
    sinResultados: "No results",
    sinResultadosDetalle: "No products found in {categoria} with the selected filters.",
    consultarPorWhatsapp: "Ask on WhatsApp",
    errorTitulo: "We couldn't load the catalogue",
    reintentar: "Try again",
    verDetalle: "View details",
    consultar: "Enquire",
    iniciarSesion: "Log in",
    cerrarSesion: "Log out",
    anterior: "Previous",
    siguiente: "Next",
    orden: {
      relevancia: "Most relevant",
      precioAsc: "Lowest price",
      precioDesc: "Highest price",
      nombreAsc: "Name A-Z",
    },
  },

  producto: {
    detalle: "Product details",
    migas: "Breadcrumb",
    masIva: "+ VAT",
    calcularEnvio: "Calculate shipping",
    similares: "Similar products",
    complementarios: "Goes well with",
    verProducto: "View product",
    verTodos: "See all",
    abrirDocumento: "Open document",
    pedirPorWhatsapp: "Request on WhatsApp",
    instalacion: "Installation",
    fichaTecnica: "Data sheet",
    garantia: "Warranty",
    consultarPrecio: "Ask for price",
  },
};
