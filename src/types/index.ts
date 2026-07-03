export type UserRole = "ADMIN" | "VIEWER";

// ── Common fields shared across all product types ──────────────
type ProductBase = {
  id: string;
  sku: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ── 1. Pisos Flotantes ─────────────────────────────────────────
export type PisoFlotante = ProductBase & {
  categoriaPrincipal?: string;
  categoriaSecundaria?: string;
  categoriaTerciaria?: string;
  tipoProducto?: string;
  origen?: string;
  nombre: string;
  codigo?: string;
  marca: string;
  linea?: string;
  tipoDeUso?: string;
  espesor?: string;
  espesorUm?: string;
  abrasion?: string;
  mantoIncorporado?: string;
  bisel?: string;
  ancho?: string;
  anchoUm?: string;
  largo?: string;
  largoUm?: string;
  base?: string;
  baseUm?: string;
  tablasPorCaja?: number;
  precioM2?: number;
  moneda?: string;
  precioCaja?: number;
  pesoCaja?: number;
  cajasPallet?: number;
  pesoPallet?: number;
  stock?: number;
  imagenes?: string; // JSON array de URLs
  precioEnvioCaja?: number;
  garantia?: string;
  fichaTecnica?: string;
  archivoInstalacion?: string;
  descripcion?: string;
};

// ── 2. Porcellanatos ───────────────────────────────────────────
export type Porcellanato = ProductBase & {
  categoriaPrincipal?: string;
  categoriaSecundaria?: string;
  tipoProducto?: string;
  acabado?: string;
  terminacion?: string;
  origen?: string;
  nombre: string;
  codigo?: string;
  marca: string;
  linea?: string;
  tipoDeUso?: string;
  espesor?: string;
  espesorUm?: string;
  ancho?: string;
  anchoUm?: string;
  largo?: string;
  largoUm?: string;
  base?: string;
  baseUm?: string;
  precioM2?: number;
  moneda?: string;
  precioCaja?: number;
  stock?: number;
  imagenes?: string;
  precioEnvioCaja?: number;
  garantia?: string;
  fichaTecnica?: string;
  archivoInstalacion?: string;
  descripcion?: string;
};

// ── 3. Revestimientos ─────────────────────────────────────────
export type Revestimiento = ProductBase & {
  categoriaPrincipal?: string; // "Exteriores" | "Interiores"
  tipoProducto?: string;
  uso?: string;
  material?: string;
  marca?: string;
  linea?: string;
  nombre: string;
  espesor?: string;
  espesorUm?: string;
  ancho?: string;
  anchoUm?: string;
  largo?: string;
  largoUm?: string;
  baseTabla?: string;
  baseTablUm?: string;
  precioTabla?: number;
  precioM2?: number;
  precioMl?: number;
  moneda?: string;
  imagen?: string;
  flete?: number;
  stock?: number;
  fichaTecnica?: string;
  archivoInstalacion?: string;
  descripcion?: string;
};

// ── 4. Pisos Vinílicos ─────────────────────────────────────────
export type PisoVinilico = ProductBase & {
  categoriaPrincipal?: string;
  categoriaSecundaria?: string;
  categoriaTerciaria?: string;
  tipoProducto?: string;
  material?: string;
  origen?: string;
  nombre: string;
  codigo?: string;
  marca: string;
  linea?: string;
  tipoDeUso?: string;
  espesorTotal?: string;
  espesorTotalUm?: string;
  espesorComposicion?: string;
  espesorComposicionUm?: string;
  capaDeUso?: string;
  mantoIncorporado?: string;
  tablasPorCaja?: number;
  ancho?: string;
  anchoUm?: string;
  largo?: string;
  largoUm?: string;
  base?: string;
  baseUm?: string;
  bisel?: string;
  precioM2?: number;
  moneda?: string;
  precioCaja?: number;
  cajasPallet?: number;
  pesoCaja?: number;
  pesoPallet?: number;
  stock?: number;
  imagenes?: string;
  precioEnvioCaja?: number;
  garantia?: string;
  fichaTecnica?: string;
  archivoInstalacion?: string;
  descripcion?: string;
};

// ── 5. Pisos Madera e Ingeniería ───────────────────────────────
export type PisoMadera = ProductBase & {
  categoriaPrincipal?: string;
  categoriaSecundaria?: string;
  categoriaTerciaria?: string;
  subtipo?: string;
  subtipo2?: string;
  especie?: string;
  acabado?: string;
  terminacion?: string;
  origen?: string;
  marca?: string;
  linea?: string;
  nombre?: string;
  espesor?: string;
  espesorUm?: string;
  espesorLamina?: string;
  espesorLaminaUm?: string;
  ancho?: string;
  anchoUm?: string;
  largo?: string;
  largoUm?: string;
  base?: string;
  baseUm?: string;
  bisel?: string;
  precioM2?: number;
  moneda?: string;
  precioCaja?: number;
  stock?: number;
  imagenes?: string;
  precioEnvioCaja?: number;
  garantia?: string;
  fichaTecnica?: string;
  archivoInstalacion?: string;
  descripcion?: string;
};

// ── 6. Decks ───────────────────────────────────────────────────
export type Deck = ProductBase & {
  categoriaPrincipal?: string;
  tipoProducto?: string;
  material?: string;
  marca?: string;
  linea?: string;
  nombre: string;
  espesor?: string;
  espesorUm?: string;
  ancho?: string;
  anchoUm?: string;
  largo?: string;
  largoUm?: string;
  baseTabla?: string;
  baseTablUm?: string;
  precioTabla?: number;
  precioM2?: number;
  precioMLineal?: number;
  moneda?: string;
  imagen?: string;
  flete?: number;
  stock?: number;
  fichaTecnica?: string;
  archivoInstalacion?: string;
  descripcion?: string;
};

// ── 7. Maderas ─────────────────────────────────────────────────
export type Madera = ProductBase & {
  tipoProducto?: string;
  nombre: string;
  origen?: string;
  espesoresDisponibles?: string;
  medidas?: string;
  secado?: string;
  precio?: number;
  unidadMedida?: string;
  moneda?: string;
  stock?: number;
  imagen?: string;
  descripcion?: string;
  fichaTecnica?: string;
  archivoInstalacion?: string;
};

// ── 8. Accesorios ──────────────────────────────────────────────
export type Accesorio = ProductBase & {
  tipoProducto?: string;
  subtipo?: string;
  nombre: string;
  espesor?: string;
  dimensiones?: string;
  colores?: string;
  stock?: number;
  imagen?: string;
  descripcion?: string;
};

// ── Union para búsquedas globales ──────────────────────────────
export type AnyProduct =
  | (PisoFlotante  & { _tabla: "pisos_flotantes" })
  | (Porcellanato  & { _tabla: "porcellanatos" })
  | (Revestimiento & { _tabla: "revestimientos" })
  | (PisoVinilico  & { _tabla: "pisos_vinilicos" })
  | (PisoMadera    & { _tabla: "pisos_madera" })
  | (Deck          & { _tabla: "decks" })
  | (Madera        & { _tabla: "maderas" })
  | (Accesorio     & { _tabla: "accesorios" });

// ── Identificadores de tabla ───────────────────────────────────
export type CategoriaSlug =
  | "pisos-flotantes"
  | "porcellanatos"
  | "revestimientos"
  | "pisos-vinilicos"
  | "pisos-madera"
  | "decks"
  | "maderas"
  | "accesorios";

// ── Audit log ─────────────────────────────────────────────────
export type ChangeLog = {
  id: string;
  tablaNombre: string;
  entidadId: string;
  usuarioId: string;
  campo: string;
  valorAnterior?: string;
  valorNuevo?: string;
  tipo: "CREATE" | "UPDATE" | "DELETE";
  fechaCambio: Date;
};

// ── User ──────────────────────────────────────────────────────
export type User = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

