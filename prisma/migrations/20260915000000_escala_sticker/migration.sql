-- Tamano del sticker sobre la foto.
--
-- Los stickers se dibujaban todos al mismo tamano, y no todos se leen igual: un
-- "WATER RESISTANT" entra comodo donde una bandera queda diminuta. `escala` es
-- un porcentaje del tamano base, y 100 es exactamente como se veia antes, asi
-- que los que ya estaban cargados no cambian.
ALTER TABLE "stickers" ADD COLUMN "escala" INTEGER NOT NULL DEFAULT 100;
