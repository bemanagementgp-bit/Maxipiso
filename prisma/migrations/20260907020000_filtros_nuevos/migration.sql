-- Columnas nuevas para los filtros del catalogo.
--
-- Son las que el cliente pidio y todavia no existen en ningun maestro. Todas
-- nullable: un producto sin cargar sigue siendo valido, y el filtro no aparece
-- en el catalogo hasta que haya al menos un valor (la API solo publica los
-- filtros que tienen opciones).

-- Tono de color. Es el mismo concepto en las cinco categorias, asi que se llama
-- igual en todas: filtrar "Claro" tiene que significar lo mismo en un piso
-- flotante que en un deck.
ALTER TABLE "pisos_flotantes" ADD COLUMN "tono" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "tono" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "tono" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "tono" TEXT;
ALTER TABLE "decks"           ADD COLUMN "tono" TEXT;

-- Diseno del porcelanato: simil madera, cemento, marmol.
ALTER TABLE "porcellanatos" ADD COLUMN "diseno" TEXT;

-- Textura de la superficie del piso de madera.
ALTER TABLE "pisos_madera" ADD COLUMN "textura" TEXT;

-- Accesorios: con que producto se usa y de que esta hecho.
ALTER TABLE "accesorios" ADD COLUMN "compatibleCon" TEXT;
ALTER TABLE "accesorios" ADD COLUMN "composicion" TEXT;
