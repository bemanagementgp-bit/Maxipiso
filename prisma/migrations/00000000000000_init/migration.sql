◇ injected env (0) from .env.local // tip: ⌘ override existing { override: true }
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "passwordChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpBackupCodes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "change_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tablaNombre" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "tipo" TEXT NOT NULL,
    "fechaCambio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "change_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pisos_flotantes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoriaPrincipal" TEXT,
    "categoriaSecundaria" TEXT,
    "categoriaTerciaria" TEXT,
    "tipoProducto" TEXT,
    "origen" TEXT,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "marca" TEXT NOT NULL,
    "linea" TEXT,
    "tipoDeUso" TEXT,
    "espesor" TEXT,
    "espesorUm" TEXT,
    "abrasion" TEXT,
    "mantoIncorporado" TEXT,
    "bisel" TEXT,
    "ancho" TEXT,
    "anchoUm" TEXT,
    "largo" TEXT,
    "largoUm" TEXT,
    "base" TEXT,
    "baseUm" TEXT,
    "tablasPorCaja" INTEGER,
    "precioM2" REAL,
    "moneda" TEXT,
    "precioCaja" REAL,
    "pesoCaja" REAL,
    "cajasPallet" INTEGER,
    "pesoPallet" REAL,
    "stock" INTEGER,
    "imagenes" TEXT,
    "precioEnvioCaja" REAL,
    "garantia" TEXT,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "porcellanatos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoriaPrincipal" TEXT,
    "categoriaSecundaria" TEXT,
    "tipoProducto" TEXT,
    "acabado" TEXT,
    "terminacion" TEXT,
    "origen" TEXT,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "marca" TEXT NOT NULL,
    "linea" TEXT,
    "tipoDeUso" TEXT,
    "espesor" TEXT,
    "espesorUm" TEXT,
    "ancho" TEXT,
    "anchoUm" TEXT,
    "largo" TEXT,
    "largoUm" TEXT,
    "base" TEXT,
    "baseUm" TEXT,
    "precioM2" REAL,
    "moneda" TEXT,
    "precioCaja" REAL,
    "stock" INTEGER,
    "imagenes" TEXT,
    "precioEnvioCaja" REAL,
    "garantia" TEXT,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "revestimientos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoriaPrincipal" TEXT,
    "tipoProducto" TEXT,
    "uso" TEXT,
    "material" TEXT,
    "marca" TEXT,
    "linea" TEXT,
    "nombre" TEXT NOT NULL,
    "espesor" TEXT,
    "espesorUm" TEXT,
    "ancho" TEXT,
    "anchoUm" TEXT,
    "largo" TEXT,
    "largoUm" TEXT,
    "baseTabla" TEXT,
    "baseTablUm" TEXT,
    "precioTabla" REAL,
    "precioM2" REAL,
    "precioMl" REAL,
    "moneda" TEXT,
    "imagenes" TEXT,
    "flete" REAL,
    "stock" INTEGER,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pisos_vinilicos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoriaPrincipal" TEXT,
    "categoriaSecundaria" TEXT,
    "categoriaTerciaria" TEXT,
    "tipoProducto" TEXT,
    "material" TEXT,
    "origen" TEXT,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "marca" TEXT NOT NULL,
    "linea" TEXT,
    "tipoDeUso" TEXT,
    "espesorTotal" TEXT,
    "espesorTotalUm" TEXT,
    "espesorComposicion" TEXT,
    "espesorComposicionUm" TEXT,
    "capaDeUso" TEXT,
    "mantoIncorporado" TEXT,
    "tablasPorCaja" INTEGER,
    "ancho" TEXT,
    "anchoUm" TEXT,
    "largo" TEXT,
    "largoUm" TEXT,
    "base" TEXT,
    "baseUm" TEXT,
    "bisel" TEXT,
    "precioM2" REAL,
    "moneda" TEXT,
    "precioCaja" REAL,
    "cajasPallet" INTEGER,
    "pesoCaja" REAL,
    "pesoPallet" REAL,
    "stock" INTEGER,
    "imagenes" TEXT,
    "precioEnvioCaja" REAL,
    "garantia" TEXT,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pisos_madera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoriaPrincipal" TEXT,
    "categoriaSecundaria" TEXT,
    "categoriaTerciaria" TEXT,
    "subtipo" TEXT,
    "subtipo2" TEXT,
    "especie" TEXT,
    "acabado" TEXT,
    "terminacion" TEXT,
    "calidad" TEXT,
    "origen" TEXT,
    "marca" TEXT,
    "linea" TEXT,
    "nombre" TEXT,
    "espesor" TEXT,
    "espesorUm" TEXT,
    "espesorLamina" TEXT,
    "espesorLaminaUm" TEXT,
    "ancho" TEXT,
    "anchoUm" TEXT,
    "largo" TEXT,
    "largoUm" TEXT,
    "base" TEXT,
    "baseUm" TEXT,
    "bisel" TEXT,
    "precioM2" REAL,
    "moneda" TEXT,
    "precioCaja" REAL,
    "stock" INTEGER,
    "imagenes" TEXT,
    "precioEnvioCaja" REAL,
    "garantia" TEXT,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "decks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoriaPrincipal" TEXT,
    "tipoProducto" TEXT,
    "material" TEXT,
    "marca" TEXT,
    "linea" TEXT,
    "nombre" TEXT NOT NULL,
    "espesor" TEXT,
    "espesorUm" TEXT,
    "ancho" TEXT,
    "anchoUm" TEXT,
    "largo" TEXT,
    "largoUm" TEXT,
    "baseTabla" TEXT,
    "baseTablUm" TEXT,
    "precioTabla" REAL,
    "precioM2" REAL,
    "precioMLineal" REAL,
    "moneda" TEXT,
    "imagenes" TEXT,
    "flete" REAL,
    "stock" INTEGER,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "maderas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "tipoProducto" TEXT,
    "nombre" TEXT NOT NULL,
    "origen" TEXT,
    "espesoresDisponibles" TEXT,
    "medidas" TEXT,
    "secado" TEXT,
    "precio" REAL,
    "unidadMedida" TEXT,
    "moneda" TEXT,
    "stock" INTEGER,
    "imagenes" TEXT,
    "descripcion" TEXT,
    "fichaTecnica" TEXT,
    "archivoInstalacion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "accesorios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "tipoProducto" TEXT,
    "subtipo" TEXT,
    "nombre" TEXT NOT NULL,
    "espesor" TEXT,
    "dimensiones" TEXT,
    "colores" TEXT,
    "stock" INTEGER,
    "imagenes" TEXT,
    "descripcion" TEXT,
    "metadatos" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "hero_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT NOT NULL,
    "telefonoNormalizado" TEXT NOT NULL,
    "mensaje" TEXT,
    "origenUrl" TEXT,
    "userAgent" TEXT,
    "interacciones" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "auth_events_userId_idx" ON "auth_events"("userId");

-- CreateIndex
CREATE INDEX "auth_events_type_idx" ON "auth_events"("type");

-- CreateIndex
CREATE INDEX "auth_events_createdAt_idx" ON "auth_events"("createdAt");

-- CreateIndex
CREATE INDEX "change_logs_tablaNombre_entidadId_idx" ON "change_logs"("tablaNombre", "entidadId");

-- CreateIndex
CREATE INDEX "change_logs_usuarioId_idx" ON "change_logs"("usuarioId");

-- CreateIndex
CREATE INDEX "change_logs_fechaCambio_idx" ON "change_logs"("fechaCambio");

-- CreateIndex
CREATE UNIQUE INDEX "pisos_flotantes_sku_key" ON "pisos_flotantes"("sku");

-- CreateIndex
CREATE INDEX "pisos_flotantes_sku_idx" ON "pisos_flotantes"("sku");

-- CreateIndex
CREATE INDEX "pisos_flotantes_marca_idx" ON "pisos_flotantes"("marca");

-- CreateIndex
CREATE INDEX "pisos_flotantes_isActive_idx" ON "pisos_flotantes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "porcellanatos_sku_key" ON "porcellanatos"("sku");

-- CreateIndex
CREATE INDEX "porcellanatos_sku_idx" ON "porcellanatos"("sku");

-- CreateIndex
CREATE INDEX "porcellanatos_marca_idx" ON "porcellanatos"("marca");

-- CreateIndex
CREATE INDEX "porcellanatos_isActive_idx" ON "porcellanatos"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "revestimientos_sku_key" ON "revestimientos"("sku");

-- CreateIndex
CREATE INDEX "revestimientos_sku_idx" ON "revestimientos"("sku");

-- CreateIndex
CREATE INDEX "revestimientos_marca_idx" ON "revestimientos"("marca");

-- CreateIndex
CREATE INDEX "revestimientos_categoriaPrincipal_idx" ON "revestimientos"("categoriaPrincipal");

-- CreateIndex
CREATE INDEX "revestimientos_isActive_idx" ON "revestimientos"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pisos_vinilicos_sku_key" ON "pisos_vinilicos"("sku");

-- CreateIndex
CREATE INDEX "pisos_vinilicos_sku_idx" ON "pisos_vinilicos"("sku");

-- CreateIndex
CREATE INDEX "pisos_vinilicos_marca_idx" ON "pisos_vinilicos"("marca");

-- CreateIndex
CREATE INDEX "pisos_vinilicos_isActive_idx" ON "pisos_vinilicos"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pisos_madera_sku_key" ON "pisos_madera"("sku");

-- CreateIndex
CREATE INDEX "pisos_madera_sku_idx" ON "pisos_madera"("sku");

-- CreateIndex
CREATE INDEX "pisos_madera_marca_idx" ON "pisos_madera"("marca");

-- CreateIndex
CREATE INDEX "pisos_madera_isActive_idx" ON "pisos_madera"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "decks_sku_key" ON "decks"("sku");

-- CreateIndex
CREATE INDEX "decks_sku_idx" ON "decks"("sku");

-- CreateIndex
CREATE INDEX "decks_marca_idx" ON "decks"("marca");

-- CreateIndex
CREATE INDEX "decks_isActive_idx" ON "decks"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "maderas_sku_key" ON "maderas"("sku");

-- CreateIndex
CREATE INDEX "maderas_sku_idx" ON "maderas"("sku");

-- CreateIndex
CREATE INDEX "maderas_isActive_idx" ON "maderas"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "accesorios_sku_key" ON "accesorios"("sku");

-- CreateIndex
CREATE INDEX "accesorios_sku_idx" ON "accesorios"("sku");

-- CreateIndex
CREATE INDEX "accesorios_isActive_idx" ON "accesorios"("isActive");

-- CreateIndex
CREATE INDEX "hero_media_isActive_sortOrder_idx" ON "hero_media"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "leads_telefonoNormalizado_key" ON "leads"("telefonoNormalizado");

-- CreateIndex
CREATE INDEX "leads_estado_idx" ON "leads"("estado");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

