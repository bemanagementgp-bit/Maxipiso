/**
 * Diccionario base: espanol.
 *
 * **Es la fuente de verdad.** Los otros idiomas se tipan contra este, asi que
 * agregar una clave aca rompe la compilacion de los otros cinco hasta que se
 * traduzca. Es a proposito: un texto sin traducir tiene que aparecer al
 * compilar y no en produccion.
 *
 * Se accede como objeto (`t.nav.inicio`) y no con rutas en string
 * (`t("nav.inicio")`): una clave mal escrita es un error de tipos, no un
 * `undefined` que se cuela hasta la pantalla.
 *
 * Lo que NO esta aca: los nombres y descripciones de productos, que viven en la
 * base y quedan en espanol.
 */
export const es = {
  idioma: {
    etiqueta: "Idioma",
    cambiar: "Cambiar idioma",
  },

  meta: {
    titulo: "Maxipiso | Líderes en Pisos, Maderas y Revestimientos",
    descripcion: "Maxipiso, el N°1 en Argentina en importación y distribución de pisos, maderas y revestimientos. Porcelanato, madera, cerámica y accesorios para distribuidores y profesionales.",
  },

  nav: {
    inicio: "Inicio",
    empresa: "Empresa",
    novedades: "Novedades",
    catalogo: "Catálogo",
    contactarAsesor: "Contactar Asesor",
    catalogoMayorista: "Catálogo Mayorista",
    verCatalogoCompleto: "Ver catálogo completo",
    consultarPrecios: "Consultar precios mayoristas por WhatsApp",
    abrirMenu: "Abrir menú",
    cerrarMenu: "Cerrar menú",
  },

  categorias: {
    pisos: "Pisos",
    maderas: "Maderas",
    decks: "Decks",
    revestimientos: "Revestimientos",
    accesorios: "Accesorios",
    flotantes: "Flotantes",
    vinilicos: "Vinílicos",
    porcelanatos: "Porcelanatos",
    maderaIngenieria: "Madera e Ingeniería",
    nativas: "Nativas",
    exoticas: "Exóticas",
    tratadas: "Tratadas",
    wpc: "WPC",
    maderaNatural: "Madera Natural",
    exteriores: "Exteriores",
    interiores: "Interiores",
    zocalos: "Zócalos",
    terminaciones: "Terminaciones",
    mantos: "Mantos",
  },

  pie: {
    descripcion: "Líderes en importación y distribución de pisos, maderas y revestimientos. El N°1 en Argentina.",
    navegacion: "Navegación",
    direccion: "Dirección",
    telefonos: "Teléfonos",
    horarios: "Horarios",
    lunesAViernes: "Lunes a viernes 8:00 - 17:00",
    sabado: "Sábado 8:00 - 12:00",
    derechos: "Todos los derechos reservados.",
  },

  home: {
    heroEtiqueta: "N°1 en Argentina",
    heroTituloA: "Líderes en",
    heroTituloB: "importación y distribución",
    heroTituloC: "de pisos, maderas y revestimientos.",
    verCatalogo: "Ver catálogo",
    contactarAsesor: "Contactar Asesor",

    lineasEtiqueta: "Catálogo",
    lineasTitulo: "Nuestras líneas de productos",
    lineasSubtitulo: "La mayor variedad en importación, en un solo lugar",

    statsEtiqueta: "Los números hablan solos",

    experienciaEtiqueta: "Más de 60 años de experiencia",

    statsClientes: "clientes",
    statsStock: "m² de stock",
    statsAnios: "años",
    statsDeposito: "m² de depósito",

    novedadesEtiqueta: "Blog & Guías",
    novedadesSubtitulo: "Guías, consejos y tendencias del mundo de los pisos y revestimientos.",
    novedadesTitulo: "Novedades",
    verTodas: "Ver todas",
    leerMas: "Leer más",

    porQueTitulo: "¿Por qué elegirnos?",
    importacionEtiqueta: "Importación directa",

    contactoEtiqueta: "Contacto",
    contactoTitulo: "¿En qué te podemos ayudar?",
    emailVentas: "Email de ventas",
    mensajeEnviado: "¡Mensaje enviado!",
    mensajeEnviadoDetalle: "Te contactaremos a la brevedad.",
    enviarOtro: "Enviar otro mensaje",
    campoNombre: "Nombre",
    campoEmpresa: "Empresa",
    campoTelefono: "Teléfono",
    campoEmail: "Email",
    campoMensaje: "Mensaje",
    enviar: "Enviar",
    enviando: "Enviando…",
    errorEnvio: "Hubo un error al enviar. Intentá por WhatsApp.",

    ticker: [
      "Importación directa", "+1000 distribuidores activos", "Entregas a todo el país",
      "+60 años de trayectoria", "Stock garantizado", "El N°1 en Argentina",
      "Distribución mayorista", "Asesoramiento técnico", "5 continentes de importación",
      "La mayor variedad del mercado",
    ],
    cadena: {
      importacion:  { titulo: "Importación directa",    texto: "Trabajamos con los mejores fabricantes de Europa, Asia y América. Sin intermediarios, precio de origen." },
      stock:        { titulo: "Stock permanente",       texto: "Depósito propio con miles de m² en stock. Disponibilidad inmediata para pedidos de cualquier volumen." },
      distribucion: { titulo: "Distribución nacional",  texto: "24 provincias cubiertas. Red de distribuidores activos en todo el país con despacho garantizado." },
    },
    importacion: {
      titulo: "Del fabricante a tu negocio, sin intermediarios",
      texto: "Importamos directamente desde los mejores fabricantes de Europa, Asia y América. Eso nos permite ofrecerte el precio más competitivo del mercado con la mayor variedad disponible.",
      puntos: [
        "Stock permanente de más de 1.000 productos",
        "Control de calidad en origen",
        "Precios de mayorista directo",
        "Envíos a todo el país con flota propia",
      ],
    },
    beneficios: {
      importacion: { titulo: "Importación directa", texto: "Importamos directamente de origen para garantizar la mejor calidad y precio." },
      cobertura:   { titulo: "Cobertura nacional",  texto: "Red de distribuidores en todo el país. Del norte al sur, llegamos donde estés." },
      variedad:    { titulo: "Amplia variedad",     texto: "+1000 productos en stock, la mayor variedad del mercado." },
      asesoramiento: { titulo: "Asesoramiento técnico", texto: "Más de 60 años de experiencia a tu disposición para cada proyecto." },
    },
  },

  empresa: {
    historiaEtiqueta: "Nuestra historia",
    historiaTituloA: "Más de 30 años siendo",
    historiaTituloB: " el N°1 en Argentina.",
    historiaTexto: "Maxipiso nació con una visión clara: acercar los mejores pisos y revestimientos del mundo a distribuidores y profesionales argentinos, con el mejor precio y el mayor stock del país.",

    equipoEtiqueta: "Las personas detrás de Maxipiso",
    equipoTitulo: "Un equipo que mueve al país",
    equipoTexto: "Más de 30 años de historia se sostienen gracias a las personas. Logística, equipo y el día a día de Maxipiso. Seguinos en Instagram y enterate de todo lo que pasa en el N°1 de Argentina.",
    seguinosInstagram: "Seguinos en Instagram",

    flotaEtiqueta: "Logística propia",
    flotaTituloA: "Flota propia.",
    flotaTituloB: "Llegamos a donde estés.",
    flotaTexto: "Contamos con nuestra propia flota de camiones para garantizar entregas a todo el país. Sin terceros, sin demoras. Desde La Plata hasta la Patagonia, el stock llega donde lo necesitás.",
    flotaPuntos: [
      "Entregas en las 24 provincias",
      "Flota propia",
      "Despacho inmediato desde stock",
      "Seguimiento de tu pedido",
    ],

    valoresEtiqueta: "Lo que nos define",
    valoresTitulo: "Nuestros valores",
    valores: {
      liderazgo:   { titulo: "Liderazgo",                 texto: "Somos el N°1 en Argentina en importación y distribución de pisos y revestimientos. Ese liderazgo se construye día a día con trabajo y compromiso." },
      calidad:     { titulo: "Calidad de importación",    texto: "Importamos directamente desde los mejores orígenes del mundo. Cada producto pasa por un proceso de selección riguroso antes de llegar a nuestra red." },
      compromiso:  { titulo: "Compromiso con el cliente", texto: "Distribuidores y profesionales confían en Maxipiso porque cumplimos: stock garantizado, precios estables y atención personalizada." },
      innovacion:  { titulo: "Innovación constante",      texto: "Incorporamos permanentemente nuevas líneas, tendencias y materiales del mercado internacional para mantenernos siempre un paso adelante." },
    },

    hitos: [
      "Fundación de Maxipiso en La Plata, Buenos Aires. Primeros pasos en la comercialización de pisos cerámicos nacionales.",
      "Apertura del primer depósito propio en La Plata. Consolidación como referente regional en el rubro.",
      "Expansión comercial hacia el interior de la provincia de Buenos Aires. Primeros distribuidores exclusivos.",
      "Inicio de las primeras importaciones directas desde España e Italia, marcando un antes y un después en la propuesta de valor.",
      "Incorporación de porcelanato rectificado importado. Lanzamiento de las líneas simil madera y simil piedra.",
      "Apertura de la red de distribuidores a nivel nacional. Cobertura en más de 15 provincias.",
      "Inauguración del nuevo centro de distribución con más de 20.000 m² de depósito. Lanzamiento de la línea Swan Timber de maderas macizas.",
      "Más de 1.300 clientes activos, presencia en las 24 provincias y consolidación como el mayorista N°1 en Argentina.",
    ],

    ctaTitulo: "Impulsa tu empresa con el N°1",
    ctaTexto: "Sumate como distribuidor o contactá a nuestro equipo de ventas para conocer todas las opciones.",
    ctaDistribuidor: "Quiero ser distribuidor",
  },

  distribuidores: {
    etiqueta: "Distribuidores",
    titulo: "La red de distribución más grande del país",
    quieroSer: "Quiero ser distribuidor",
    sumateTitulo: "¿Querés sumarte?",
    sumateTexto: "Completá el formulario y te contactamos con toda la información.",
    enviada: "¡Solicitud enviada!",
    enviadaDetalle: "Te contactaremos a la brevedad.",
    campoCiudad: "Ciudad",
    campoProvincia: "Provincia",
    campoQueVendes: "¿Qué vendés actualmente?",
    requerido: "Requerido",
    emailInvalido: "Email inválido",
    errorEnvio: "Error al enviar. Intentá por WhatsApp.",
  },

  chat: {
    abrir: "Abrir chat",
    asesor: "Asesor Maxipiso · En línea",
    saludoTitulo: "Nacho · Asesor Maxipiso",
    saludoInicial: "¡Hola! Soy Nacho, tu asesor de Maxipiso 👋 Contame qué estás buscando — tipo de ambiente, estilo, m² aproximados — y te oriento con las mejores opciones.",
    saludo: "Hola, soy Nacho. Estoy listo para ayudarte 👋",
    escribi: "Escribile a Nacho...",
    verTienda: "Ver tienda online",
    error: "Hubo un error. Intentá de nuevo.",
    sugerencias: ["¿Qué tipos de pisos tienen?", "Busco piso para exterior", "Quiero ver maderas macizas"],
    datosTexto: "Dejanos tus datos y te derivamos con un asesor por WhatsApp.",
    campoNombre: "Nombre*",
    campoWhatsapp: "WhatsApp* (ej: +54 9 221 1234567)",
    continuar: "Continuar a WhatsApp",
    usarOtros: "Usar otros datos",
    faltaNombre: "Ingresá tu nombre.",
    whatsappInvalido: "Ingresá un WhatsApp válido.",
    faltaEmail: "Ingresá tu email.",
    emailInvalido: "Ingresá un email válido.",
  },

  acceso: {
    etiqueta: "Catálogo Mayorista",
    tituloA: "Accedé a nuestro",
    texto: "Pisos, maderas, revestimientos y más. Consultá disponibilidad y solicitá tu acceso por WhatsApp.",
    titulo: "Acceso al catálogo",
    subtitulo: "Ingresá tus credenciales para ver el catálogo",
    dosPasos: "Verificación en dos pasos",
    dosPasosTexto: "Ingresá el código de tu app autenticadora",
    contrasena: "Contraseña",
    codigo2fa: "Código 2FA",
    verificar: "Verificar",
    ingresar: "Ingresar",
    sinCuenta: "¿No tenés cuenta?",
    pedirCredenciales: "Pedí tus credenciales por WhatsApp",
    volver: "Volver al inicio",
    exclusivo: "Acceso exclusivo para clientes mayoristas",
    credencialesInvalidas: "Credenciales inválidas",
    errorGenerico: "No se pudo iniciar sesión. Intentá nuevamente.",
  },

  catalogo: {
    titulo: "Catálogo",
    subtitulo: "Explorá todo nuestro stock mayorista. Entrega en todo el país.",
    buscar: "Buscar…",
    categoria: "Categoría",
    todasLasCategorias: "Todas las categorías",
    filtros: "Filtros",
    limpiar: "Limpiar",
    todos: "Todos",
    ordenarPor: "Ordenar por",
    productos: "productos",
    producto: "producto",
    sinResultados: "Sin resultados",
    sinResultadosDetalle: "No se encontraron productos en {categoria} con los filtros seleccionados.",
    consultarPorWhatsapp: "Consultar por WhatsApp",
    errorTitulo: "No pudimos cargar el catálogo",
    reintentar: "Reintentar",
    verDetalle: "Ver detalle",
    consultar: "Consultar",
    iniciarSesion: "Iniciar sesión",
    cerrarSesion: "Cerrar sesión",
    anterior: "Anterior",
    siguiente: "Siguiente",
    orden: {
      relevancia: "Más relevantes",
      precioAsc: "Menor precio",
      precioDesc: "Mayor precio",
      nombreAsc: "Nombre A-Z",
    },
  },

  producto: {
    detalle: "Detalle de producto",
    migas: "Migas de pan",
    masIva: "+ IVA",
    calcularEnvio: "Calculá tu envío",
    similares: "Productos Similares",
    complementarios: "Productos Complementarios",
    verProducto: "Ver producto",
    verTodos: "Ver todos",
    abrirDocumento: "Abrir documento",
    pedirPorWhatsapp: "Pedir por WhatsApp",
    instalacion: "Instalación",
    fichaTecnica: "Ficha Técnica",
    garantia: "Garantía",
    consultarPrecio: "Consultar precio",
  },
};

/** El tipo del diccionario. Los otros idiomas se tipan contra esto. */
export type Diccionario = typeof es;
