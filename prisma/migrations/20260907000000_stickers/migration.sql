-- Catalogo de stickers, administrable desde /panel/stickers.
--
-- Es una tabla y no una lista en el codigo porque cambia con la campana
-- comercial: hoy "Oferta" y "Mas vendido", manana otra cosa.
CREATE TABLE "stickers" (
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

CREATE INDEX "stickers_isActive_idx" ON "stickers"("isActive");

-- Que stickers tiene cada producto: un JSON array de ids, igual que `imagenes`.
-- Va como columna en cada tabla y no como tabla de union para que venga con la
-- fila en las consultas que ya existen, sin sumar un join en cada listado.
ALTER TABLE "pisos_flotantes" ADD COLUMN "stickers" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "stickers" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "stickers" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "stickers" TEXT;
ALTER TABLE "pisos_madera"    ADD COLUMN "stickers" TEXT;
ALTER TABLE "decks"           ADD COLUMN "stickers" TEXT;
ALTER TABLE "maderas"         ADD COLUMN "stickers" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "stickers" TEXT;
