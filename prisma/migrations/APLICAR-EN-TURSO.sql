-- ═══════════════════════════════════════════════════════════════════════════
--  Migraciones pendientes de aplicar en Turso (producción)
--
--  Pegar TODO esto en el shell SQL de Turso, de una vez y en este orden.
--  Las tablas usan IF NOT EXISTS, asi que repetirlo no rompe nada. Los
--  ALTER TABLE no se pueden hacer idempotentes en SQLite: si alguno dice
--  "duplicate column name", esa columna ya estaba — seguir con el siguiente.
--
--  Mientras la primera parte no esté aplicada, el catálogo muestra 0 productos
--  y el panel dice "Error al cargar productos": el código lee la columna
--  `stickers` y la base todavía no la tiene.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. STICKERS (20260907000000) ──────────────────────────────── URGENTE ───
-- Es la que rompe el catálogo si falta.

CREATE TABLE IF NOT EXISTS "stickers" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "nombre"      TEXT NOT NULL,
  "tipo"        TEXT NOT NULL DEFAULT 'texto',
  "imagenUrl"   TEXT,
  "texto"       TEXT,
  "colorFondo"  TEXT,
  "colorTexto"  TEXT,
  "posicion"    TEXT NOT NULL DEFAULT 'arriba-izq',
  "orden"       INTEGER NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "stickers_isActive_idx" ON "stickers"("isActive");

ALTER TABLE "pisos_flotantes" ADD COLUMN "stickers" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "stickers" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "stickers" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "stickers" TEXT;
ALTER TABLE "pisos_madera"    ADD COLUMN "stickers" TEXT;
ALTER TABLE "decks"           ADD COLUMN "stickers" TEXT;
ALTER TABLE "maderas"         ADD COLUMN "stickers" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "stickers" TEXT;


-- ── 2. PORTADAS DEL HOME (20260907010000) ───────────────────────────────────
-- Sin esto, Panel → Portadas no tiene qué editar. El home igual se ve bien:
-- cae a las portadas que están en el código.

CREATE TABLE IF NOT EXISTS "lineas_home" (
  "slug"      TEXT NOT NULL PRIMARY KEY,
  "label"     TEXT NOT NULL,
  "imagenUrl" TEXT NOT NULL,
  "orden"     INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" DATETIME NOT NULL
);

INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('pisos-flotantes', 'Pisos Laminados', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/laminados-portada_s4ialn.png', 0, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('pisos-vinilicos', 'Pisos Vinílicos', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/vinilico-portada_jtwqrp.png', 1, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('porcellanatos', 'Porcelanatos', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784517/porcelanato-portada_vfp0ml.png', 2, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('pisos-madera', 'Pisos de Madera', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/pisos-madera-portada_skuv8k.png', 3, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('decks', 'Deck', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784519/deck-portada_cah2hc.png', 4, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('revestimientos', 'Revestimientos', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784475/revestimientos-portada_ou8yse.png', 5, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('maderas', 'Maderas', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784518/maderas-portada_ynx4dp.png', 6, true, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('accesorios', 'Accesorios', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784475/accesorios-portada_pfjckc.png', 7, true, CURRENT_TIMESTAMP);


-- ── 3. FILTROS NUEVOS (20260907020000) ──────────────────────────────────────
-- Columnas para los filtros pedidos que todavía no existen en ningún maestro.
-- Se pueden aplicar antes o después del deploy: son nullable y nada las
-- necesita para funcionar.

ALTER TABLE "pisos_flotantes" ADD COLUMN "tono" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "tono" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "tono" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "tono" TEXT;
ALTER TABLE "decks"           ADD COLUMN "tono" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "diseno" TEXT;
ALTER TABLE "pisos_madera"    ADD COLUMN "textura" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "compatibleCon" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "composicion" TEXT;


-- ── 4. PRODUCTOS COMPLEMENTARIOS (20260907030000) ──────────────── URGENTE ───
-- Los complementarios se eligen a mano desde el ABM. El codigo lee esta columna
-- en cada consulta de producto: si falta, el catalogo vuelve a quedar en cero.
-- APLICAR ANTES DE DEPLOYAR.

ALTER TABLE "pisos_flotantes" ADD COLUMN "complementarios" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "complementarios" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "complementarios" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "complementarios" TEXT;
ALTER TABLE "pisos_madera"    ADD COLUMN "complementarios" TEXT;
ALTER TABLE "decks"           ADD COLUMN "complementarios" TEXT;
ALTER TABLE "maderas"         ADD COLUMN "complementarios" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "complementarios" TEXT;
