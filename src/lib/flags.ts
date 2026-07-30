const COUNTRY_MAP: Record<string, { code: string; label: string }> = {
  "alemania": { code: "de", label: "Alemania" },
  "de": { code: "de", label: "Alemania" },
  "deu": { code: "de", label: "Alemania" },
  "al": { code: "de", label: "Alemania" },

  "argentina": { code: "ar", label: "Argentina" },
  "ar": { code: "ar", label: "Argentina" },
  "brasil": { code: "br", label: "Brasil" },
  "br": { code: "br", label: "Brasil" },
  "paraguay": { code: "py", label: "Paraguay" },
  "py": { code: "py", label: "Paraguay" },
  "uruguay": { code: "uy", label: "Uruguay" },
  "uy": { code: "uy", label: "Uruguay" },
  "chile": { code: "cl", label: "Chile" },
  "cl": { code: "cl", label: "Chile" },
  "espana": { code: "es", label: "España" },
  "es": { code: "es", label: "España" },
  "italia": { code: "it", label: "Italia" },
  "it": { code: "it", label: "Italia" },
  "francia": { code: "fr", label: "Francia" },
  "fr": { code: "fr", label: "Francia" },
  "china": { code: "cn", label: "China" },
  "cn": { code: "cn", label: "China" },
  "mexico": { code: "mx", label: "México" },
  "mx": { code: "mx", label: "México" },
  "estados unidos": { code: "us", label: "Estados Unidos" },
  "eeuu": { code: "us", label: "Estados Unidos" },
  "usa": { code: "us", label: "Estados Unidos" },
  "us": { code: "us", label: "Estados Unidos" },
  "belgica": { code: "be", label: "Bélgica" },
  "be": { code: "be", label: "Bélgica" },
  "peru": { code: "pe", label: "Perú" },
  "pe": { code: "pe", label: "Perú" },
  "colombia": { code: "co", label: "Colombia" },
  "co": { code: "co", label: "Colombia" },
  "turquia": { code: "tr", label: "Turquía" },
  "tr": { code: "tr", label: "Turquía" },
  "india": { code: "in", label: "India" },
  "in": { code: "in", label: "India" },
  "portugal": { code: "pt", label: "Portugal" },
  "pt": { code: "pt", label: "Portugal" },
  "austria": { code: "at", label: "Austria" },
  "at": { code: "at", label: "Austria" },
  "suiza": { code: "ch", label: "Suiza" },
  "ch": { code: "ch", label: "Suiza" },
  "malasia": { code: "my", label: "Malasia" },
  "my": { code: "my", label: "Malasia" },
  "indonesia": { code: "id", label: "Indonesia" },
  "id": { code: "id", label: "Indonesia" },

  "africa": { code: "af", label: "África" },
  "af": { code: "af", label: "África" },

  "bolivia": { code: "bo", label: "Bolivia" },
  "bo": { code: "bo", label: "Bolivia" },
  "camerun": { code: "cm", label: "Camerún" },
  "cm": { code: "cm", label: "Camerún" },
  "canada": { code: "ca", label: "Canadá" },
  "ca": { code: "ca", label: "Canadá" },
  "croacia": { code: "hr", label: "Croacia" },
  "hr": { code: "hr", label: "Croacia" },

  "misiones": { code: "ar", label: "Argentina" },
  "nacional": { code: "ar", label: "Argentina" },
  "brazil": { code: "br", label: "Brasil" },
  "brasil bolivia": { code: "br", label: "Brasil / Bolivia" },
};

function normalizeCountry(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ü/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

function resolve(origin: unknown): { code: string; label: string } | null {
  if (origin === null || origin === undefined) return null;
  const raw = String(origin).trim();
  if (!raw) return null;
  const normalized = normalizeCountry(raw);
  const entry = COUNTRY_MAP[normalized];
  if (entry) return entry;
  const code = normalized.replace(/\s+/g, "");
  if (code.length === 2) return { code, label: raw };
  return null;
}

export function getFlagUrl(origin: unknown): string | null {
  const r = resolve(origin);
  if (!r) return null;
  return `/flags/${r.code}.svg`;
}

export function getCountryLabel(origin: unknown): string | null {
  const r = resolve(origin);
  return r?.label ?? null;
}

export function formatOriginLabel(origin: unknown): string | undefined {
  const r = resolve(origin);
  if (!r) {
    const raw = String(origin ?? "").trim();
    return raw || undefined;
  }
  return r.label;
}

export function getFlagEmoji(origin: unknown): string {
  const r = resolve(origin);
  if (!r) return "🌐";
  const letters = r.code.toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(letters)) return "🌐";
  return String.fromCodePoint(...[...letters].map((char) => 0x1F1E6 + char.charCodeAt(0) - 65));
}
