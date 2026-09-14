-- Variantes de producto: el mismo producto en otro color, otra medida.
--
-- No son una tabla nueva: una variante ES un producto, con su foto, su precio,
-- su stock y su SKU. Lo unico que hace falta es decir a que grupo pertenece.
--
--   varianteDe        SKU del producto principal del grupo. Vacio = principal.
--   varianteEtiqueta  Como se llama en el selector: "Roble", "120x20".
--
-- Se eligio el SKU del principal y no un codigo de grupo generado porque el SKU
-- es lo que la persona conoce y escribe en la planilla; un codigo habria que
-- buscarlo antes de poder cargar nada.
--
-- El catalogo lista solo los principales, asi que el mismo producto en ocho
-- colores pasa a ocupar una card en vez de ocho. Los ocho siguen existiendo
-- como productos: se editan, se les pone precio y stock igual que siempre.

ALTER TABLE "pisos_flotantes" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "porcellanatos" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "revestimientos" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "pisos_madera" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "decks" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "maderas" ADD COLUMN "varianteDe" TEXT;
ALTER TABLE "accesorios" ADD COLUMN "varianteDe" TEXT;

ALTER TABLE "pisos_flotantes" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "porcellanatos" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "revestimientos" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "pisos_madera" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "decks" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "maderas" ADD COLUMN "varianteEtiqueta" TEXT;
ALTER TABLE "accesorios" ADD COLUMN "varianteEtiqueta" TEXT;

-- La ficha busca los hermanos del grupo en cada carga: sin indice son ocho
-- escaneos completos de tabla por producto abierto.
CREATE INDEX IF NOT EXISTS "pisos_flotantes_varianteDe_idx" ON "pisos_flotantes"("varianteDe");
CREATE INDEX IF NOT EXISTS "porcellanatos_varianteDe_idx" ON "porcellanatos"("varianteDe");
CREATE INDEX IF NOT EXISTS "revestimientos_varianteDe_idx" ON "revestimientos"("varianteDe");
CREATE INDEX IF NOT EXISTS "pisos_vinilicos_varianteDe_idx" ON "pisos_vinilicos"("varianteDe");
CREATE INDEX IF NOT EXISTS "pisos_madera_varianteDe_idx" ON "pisos_madera"("varianteDe");
CREATE INDEX IF NOT EXISTS "decks_varianteDe_idx" ON "decks"("varianteDe");
CREATE INDEX IF NOT EXISTS "maderas_varianteDe_idx" ON "maderas"("varianteDe");
CREATE INDEX IF NOT EXISTS "accesorios_varianteDe_idx" ON "accesorios"("varianteDe");
