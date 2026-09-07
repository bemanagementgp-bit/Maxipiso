import type { Diccionario } from "./es";

/**
 * Portugues.
 *
 * Variante de Brasil, que es el mercado vecino: "piso", "estoque", "frete".
 */
export const pt: Diccionario = {
  idioma: { etiqueta: "Idioma", cambiar: "Mudar idioma" },

  meta: {
    titulo: "Maxipiso | Líderes em pisos, madeiras e revestimentos",
    descripcion: "Maxipiso, o N°1 na Argentina em importação e distribuição de pisos, madeiras e revestimentos. Porcelanato, madeira, cerâmica e acessórios para distribuidores e profissionais.",
  },

  nav: {
    inicio: "Início",
    empresa: "Empresa",
    novedades: "Novidades",
    catalogo: "Catálogo",
    contactarAsesor: "Falar com um consultor",
    catalogoMayorista: "Catálogo atacado",
    verCatalogoCompleto: "Ver catálogo completo",
    consultarPrecios: "Consultar preços de atacado pelo WhatsApp",
    abrirMenu: "Abrir menu",
    cerrarMenu: "Fechar menu",
  },

  categorias: {
    pisos: "Pisos",
    maderas: "Madeiras",
    decks: "Decks",
    revestimientos: "Revestimentos",
    accesorios: "Acessórios",
    flotantes: "Laminado",
    vinilicos: "Vinílico",
    porcelanatos: "Porcelanato",
    maderaIngenieria: "Madeira maciça e engenheirada",
    nativas: "Nativas",
    exoticas: "Exóticas",
    tratadas: "Tratadas",
    wpc: "WPC",
    maderaNatural: "Madeira natural",
    exteriores: "Externos",
    interiores: "Internos",
    zocalos: "Rodapés",
    terminaciones: "Perfis de acabamento",
    mantos: "Mantas",
  },

  pie: {
    descripcion: "Líderes na importação e distribuição de pisos, madeiras e revestimentos. N°1 na Argentina.",
    navegacion: "Navegação",
    direccion: "Endereço",
    telefonos: "Telefones",
    horarios: "Horários",
    lunesAViernes: "Segunda a sexta 8:00 - 17:00",
    sabado: "Sábado 8:00 - 12:00",
    derechos: "Todos os direitos reservados.",
  },

  home: {
    heroEtiqueta: "N°1 na Argentina",
    heroTituloA: "Líderes em",
    heroTituloB: "importação e distribuição",
    heroTituloC: "de pisos, madeiras e revestimentos.",
    verCatalogo: "Ver catálogo",
    contactarAsesor: "Falar com um consultor",

    lineasEtiqueta: "Catálogo",
    lineasTitulo: "Nossas linhas de produtos",
    lineasSubtitulo: "A maior variedade importada, num só lugar",

    statsEtiqueta: "Os números falam por si",

    experienciaEtiqueta: "Mais de 60 anos de experiência",

    statsClientes: "clientes",
    statsStock: "m² em estoque",
    statsAnios: "anos",
    statsDeposito: "m² de depósito",

    novedadesEtiqueta: "Blog e guias",
    novedadesTitulo: "Novidades",
    verTodas: "Ver todas",
    leerMas: "Leia mais",

    porQueTitulo: "Por que escolher a gente?",
    importacionEtiqueta: "Importação direta",

    contactoEtiqueta: "Contato",
    contactoTitulo: "Como podemos ajudar?",
    emailVentas: "E-mail de vendas",
    mensajeEnviado: "Mensagem enviada!",
    mensajeEnviadoDetalle: "Entraremos em contato em breve.",
    enviarOtro: "Enviar outra mensagem",
    campoNombre: "Nome",
    campoEmpresa: "Empresa",
    campoTelefono: "Telefone",
    campoEmail: "E-mail",
    campoMensaje: "Mensagem",
    enviar: "Enviar",
    enviando: "Enviando…",
    errorEnvio: "Houve um erro ao enviar. Tente pelo WhatsApp.",

    ticker: [
      "Importação direta", "Mais de 1.000 distribuidores ativos", "Entregas em todo o país",
      "Mais de 60 anos de trajetória", "Estoque garantido", "N°1 na Argentina",
      "Distribuição no atacado", "Assessoria técnica", "Importação de 5 continentes",
      "A maior variedade do mercado",
    ],
    cadena: {
      importacion:  { titulo: "Importação direta",      texto: "Trabalhamos com os melhores fabricantes da Europa, Ásia e América. Sem intermediários, preço de origem." },
      stock:        { titulo: "Estoque permanente",     texto: "Depósito próprio com milhares de m² em estoque. Disponibilidade imediata para pedidos de qualquer volume." },
      distribucion: { titulo: "Distribuição nacional",  texto: "24 províncias cobertas. Rede de distribuidores ativos em todo o país com despacho garantido." },
    },
    importacion: {
      titulo: "Do fabricante ao seu negócio, sem intermediários",
      texto: "Importamos direto dos melhores fabricantes da Europa, Ásia e América. Isso nos permite oferecer o preço mais competitivo do mercado com a maior variedade disponível.",
      puntos: [
        "Estoque permanente de mais de 1.000 produtos",
        "Controle de qualidade na origem",
        "Preços de atacado direto",
        "Envios para todo o país com frota própria",
      ],
    },
    beneficios: {
      importacion:   { titulo: "Importação direta",    texto: "Importamos direto da origem para garantir a melhor qualidade e preço." },
      cobertura:     { titulo: "Cobertura nacional",   texto: "Rede de distribuidores em todo o país. Do norte ao sul, chegamos onde você estiver." },
      variedad:      { titulo: "Ampla variedade",      texto: "Mais de 1.000 produtos em estoque, a maior variedade do mercado." },
      asesoramiento: { titulo: "Assessoria técnica",   texto: "Mais de 60 anos de experiência à sua disposição em cada projeto." },
    },
  },

  catalogo: {
    titulo: "Catálogo",
    subtitulo: "Explore todo o nosso estoque de atacado. Entrega em todo o país.",
    buscar: "Buscar…",
    categoria: "Categoria",
    todasLasCategorias: "Todas as categorias",
    filtros: "Filtros",
    limpiar: "Limpar",
    todos: "Todos",
    ordenarPor: "Ordenar por",
    productos: "produtos",
    producto: "produto",
    sinResultados: "Sem resultados",
    sinResultadosDetalle: "Nenhum produto encontrado em {categoria} com os filtros selecionados.",
    consultarPorWhatsapp: "Consultar pelo WhatsApp",
    errorTitulo: "Não conseguimos carregar o catálogo",
    reintentar: "Tentar de novo",
    verDetalle: "Ver detalhes",
    consultar: "Consultar",
    iniciarSesion: "Entrar",
    cerrarSesion: "Sair",
    anterior: "Anterior",
    siguiente: "Próximo",
    orden: {
      relevancia: "Mais relevantes",
      precioAsc: "Menor preço",
      precioDesc: "Maior preço",
      nombreAsc: "Nome A-Z",
    },
  },

  producto: {
    detalle: "Detalhe do produto",
    migas: "Caminho",
    masIva: "+ impostos",
    calcularEnvio: "Calcular o frete",
    similares: "Produtos similares",
    complementarios: "Combina com",
    verProducto: "Ver produto",
    verTodos: "Ver todos",
    abrirDocumento: "Abrir documento",
    pedirPorWhatsapp: "Pedir pelo WhatsApp",
    instalacion: "Instalação",
    fichaTecnica: "Ficha técnica",
    garantia: "Garantia",
    consultarPrecio: "Consultar preço",
  },
};
