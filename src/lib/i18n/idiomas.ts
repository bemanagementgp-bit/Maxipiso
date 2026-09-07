/**
 * Idiomas del sitio publico.
 *
 * El espanol es la base y no una traduccion mas: es el idioma en el que se
 * escribe el contenido, el que ven los clientes mayoristas argentinos que son
 * el grueso del trafico, y al que se cae cualquier texto que falte.
 *
 * Los productos NO se traducen. Nombres y descripciones salen de la base, se
 * cargan en espanol y quedan asi: son miles de filas y traducirlas obligaria a
 * escribir cada una en cinco idiomas cada vez que se carga un producto.
 */

export const IDIOMAS = [
  { codigo: "es", nombre: "Español",   bandera: "🇦🇷" },
  { codigo: "en", nombre: "English",   bandera: "🇬🇧" },
  { codigo: "de", nombre: "Deutsch",   bandera: "🇩🇪" },
  { codigo: "fr", nombre: "Français",  bandera: "🇫🇷" },
  { codigo: "it", nombre: "Italiano",  bandera: "🇮🇹" },
  { codigo: "pt", nombre: "Português", bandera: "🇧🇷" },
] as const;

export type Idioma = (typeof IDIOMAS)[number]["codigo"];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** La cookie la lee el servidor para renderizar ya en el idioma correcto. */
export const COOKIE_IDIOMA = "maxipiso_idioma";

export function esIdioma(valor: unknown): valor is Idioma {
  return IDIOMAS.some((i) => i.codigo === valor);
}

/**
 * Elige el idioma a partir del `Accept-Language` del navegador.
 *
 * Sirve para la primera visita, cuando todavia no hay cookie: un aleman que
 * entra por primera vez ve el sitio en aleman sin tener que buscar el selector.
 * Solo mira el prefijo ("de-AT" cuenta como "de") y cae al espanol si no
 * reconoce ninguno.
 */
export function idiomaDesdeAcceptLanguage(header: string | null | undefined): Idioma {
  if (!header) return IDIOMA_POR_DEFECTO;
  const preferencias = header
    .split(",")
    .map((parte) => {
      const [tag, q] = parte.trim().split(";q=");
      return { codigo: tag.trim().toLowerCase().split("-")[0], peso: q ? Number(q) : 1 };
    })
    .filter((p) => Number.isFinite(p.peso))
    .sort((a, b) => b.peso - a.peso);

  for (const { codigo } of preferencias) {
    if (esIdioma(codigo)) return codigo;
  }
  return IDIOMA_POR_DEFECTO;
}
