-- Productos complementarios elegidos a mano por producto.
--
-- Es un JSON array de ids, igual que `imagenes` y `stickers`, y por el mismo
-- motivo: viene con la fila en las consultas que ya existen, sin sumar un join.
--
-- Reemplaza al mapa por categoria que habia antes, que le mostraba los mismos
-- accesorios a todos los productos de una categoria. Un producto sin nada
-- elegido no muestra la seccion.
ALTER TABLE "pisos_flotantes" ADD COLUMN "complementarios" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "complementarios" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "complementarios" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "complementarios" TEXT;
ALTER TABLE "pisos_madera"    ADD COLUMN "complementarios" TEXT;
ALTER TABLE "decks"           ADD COLUMN "complementarios" TEXT;
ALTER TABLE "maderas"         ADD COLUMN "complementarios" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "complementarios" TEXT;
