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


-- ── 5. LOS 10 STICKERS, YA CARGADOS (20260907040000) ────────────────────────
-- No es urgente: sin esto el panel de stickers arranca vacio y hay que crearlos
-- a mano. Las banderas apuntan a los SVG de public/flags, que ya se usan para
-- el origen del producto.
-- INSERT OR IGNORE por los ids fijos: correrlo dos veces no duplica nada.

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_bandera_alemania','Bandera de Alemania','imagen','/flags/de.svg',NULL,NULL,NULL,'arriba-izq',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_bandera_americana','Bandera Americana','imagen','/flags/us.svg',NULL,NULL,NULL,'arriba-izq',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_bandera_italia','Bandera Italia','imagen','/flags/it.svg',NULL,NULL,NULL,'arriba-izq',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_bandera_ue','Bandera Union Europea','imagen','/flags/eu.svg',NULL,NULL,NULL,'arriba-izq',3,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_oferta','Oferta','texto',NULL,'OFERTA','#DF8635','#FFFFFF','arriba-der',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_mas_vendido','Mas Vendido','texto',NULL,'MÁS VENDIDO','#111111','#FFFFFF','arriba-der',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_novedad','Novedad','texto',NULL,'NOVEDAD','#2E7D5B','#FFFFFF','arriba-der',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_waterproof','Waterproof','texto',NULL,'WATERPROOF','#12608F','#FFFFFF','abajo-der',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_water_resistant','Water Resistant','texto',NULL,'WATER RESISTANT','#4A94C4','#FFFFFF','abajo-der',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt") VALUES ('stk_importado','Producto Importado','texto',NULL,'IMPORTADO','#4A4A4A','#FFFFFF','abajo-der',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- ── 6. VARIANTES DE PRODUCTO (20260914000000) ─────────────── URGENTE ───
-- APLICAR ANTES DE DEPLOYAR: el codigo lee estas columnas en cada consulta de
-- producto, y si faltan el catalogo vuelve a quedar en cero.
--
-- Si ya corriste una version anterior de esta parte, la que tenia
-- `varianteEtiqueta`: esa columna quedo sin uso y no molesta. Corre igual
-- estas lineas; las que digan "duplicate column name" ya estaban.
--
-- Variantes de producto: el mismo producto en otro color, otra medida.
--
-- No son una tabla nueva: una variante ES un producto, con su foto, su precio,
-- su stock y su SKU. Lo unico que hace falta es decir a que grupo pertenece.
--
--   varianteDe        SKU del producto principal del grupo. Vacio = principal.
--   varianteOpciones  En que se diferencia: "Color: Roble ; Medidas: 120x20".
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

-- Las opciones son pares tipo/valor y no un rotulo suelto porque un producto
-- puede variar en dos cosas a la vez: seis filas pueden ser tres colores por dos
-- medidas, y la ficha tiene que mostrar dos filas de botones, no seis sueltos.
ALTER TABLE "pisos_flotantes" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "porcellanatos" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "revestimientos" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "pisos_madera" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "decks" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "maderas" ADD COLUMN "varianteOpciones" TEXT;
ALTER TABLE "accesorios" ADD COLUMN "varianteOpciones" TEXT;

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

-- ── 7. TAMANO DEL STICKER (20260915000000) ────────────────── URGENTE ───
-- APLICAR ANTES DE DEPLOYAR: sin esta columna el panel de Stickers responde
-- error al listarlos. El catalogo sigue andando (los productos se muestran sin
-- sticker), pero no se pueden editar hasta correrla.
--
-- Los stickers se dibujaban todos al mismo tamano, y no todos se leen igual: un
-- "WATER RESISTANT" entra comodo donde una bandera queda diminuta. `escala` es
-- un porcentaje del tamano base, y 100 es exactamente como se veia antes, asi
-- que los diez que ya estan cargados no cambian solos.
--
-- Es una linea sola.

ALTER TABLE "stickers" ADD COLUMN "escala" INTEGER NOT NULL DEFAULT 100;

-- ── 8. PRECIO EN ACCESORIOS (20260921000000) ──────────────── URGENTE ───
-- APLICAR ANTES DE DEPLOYAR: el codigo lee estas columnas al abrir cualquier
-- accesorio en el panel y al listar la grilla de precios.
--
-- `accesorios` era la unica de las 8 tablas sin ninguna columna de importe: una
-- manta bajo piso o un zocalo no tenian donde cargar el precio, no salian en
-- Precios y stock y en el catalogo aparecian sin precio.
--
-- Va `precio` a secas y no `precioM2`: un accesorio se vende por unidad, bolsa
-- o rollo, no por metro cuadrado. Mismo criterio que en `maderas`.
--
-- Son dos lineas.

ALTER TABLE "accesorios" ADD COLUMN "precio" REAL;
ALTER TABLE "accesorios" ADD COLUMN "moneda" TEXT;

-- ── 9. UNIDAD DE MEDIDA EN TODAS LAS TABLAS (20260923000000) ─ URGENTE ───
-- APLICAR ANTES DE DEPLOYAR: el codigo lee esta columna al abrir cualquier
-- producto en el panel y al dibujar el precio en el catalogo.
--
-- Un cliente pregunto si los $11.200 de una manta bajo piso eran por metro,
-- por rollo o por unidad, y la ficha no lo decia: la card solo sabia poner
-- "/m2" cuando el precio venia en `precioM2`, y un accesorio cobra `precio` a
-- secas. Tampoco habia donde cargarlo, asi que no era un dato que faltara sino
-- uno que no existia.
--
-- `unidadMedida` ya vivia en `maderas` y hacia exactamente esto. Se lleva a las
-- otras siete para que la respuesta sea la misma en todo el catalogo.
--
-- Queda vacia en lo ya cargado, y eso esta bien: sin valor, el catalogo la
-- deduce de la columna de precio -m2 para `precioM2`, ml para `precioMl`- que
-- es lo que mostraba antes. Solo cambia donde no se podia deducir nada.
--
-- Son siete lineas.

ALTER TABLE "pisos_flotantes" ADD COLUMN "unidadMedida" TEXT;
ALTER TABLE "porcellanatos"   ADD COLUMN "unidadMedida" TEXT;
ALTER TABLE "revestimientos"  ADD COLUMN "unidadMedida" TEXT;
ALTER TABLE "pisos_vinilicos" ADD COLUMN "unidadMedida" TEXT;
ALTER TABLE "pisos_madera"    ADD COLUMN "unidadMedida" TEXT;
ALTER TABLE "decks"           ADD COLUMN "unidadMedida" TEXT;
ALTER TABLE "accesorios"      ADD COLUMN "unidadMedida" TEXT;
