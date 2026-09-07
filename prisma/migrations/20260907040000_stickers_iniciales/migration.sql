-- Los 10 stickers que pidio el cliente, ya cargados.
--
-- Se siembran para que nadie tenga que crearlos a mano uno por uno: son los que
-- se van a usar desde el dia uno. Se pueden editar, apagar y borrar como
-- cualquier otro, y agregar mas: la tabla sigue siendo el catalogo dinamico de
-- siempre.
--
-- INSERT OR IGNORE por los ids fijos: correr esto dos veces no duplica nada.
--
-- Las banderas apuntan a los SVG de `public/flags/`, que ya se usan para el
-- origen del producto: la misma imagen, sin subir nada a Cloudinary.
--
-- Las esquinas no son arbitrarias:
--  - Las banderas arriba a la izquierda: son la procedencia, se leen primero.
--  - Lo comercial (Oferta, Mas Vendido, Novedad) arriba a la derecha, que es
--    donde el ojo busca el precio.
--  - Lo tecnico (Waterproof, Water Resistant, Importado) abajo a la derecha.
--  - Nada abajo a la izquierda: ahi la card del catalogo tiene el chip del SKU.

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_bandera_alemania','Bandera de Alemania','imagen','/flags/de.svg',NULL,NULL,NULL,'arriba-izq',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_bandera_americana','Bandera Americana','imagen','/flags/us.svg',NULL,NULL,NULL,'arriba-izq',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_bandera_italia','Bandera Italia','imagen','/flags/it.svg',NULL,NULL,NULL,'arriba-izq',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_bandera_ue','Bandera Union Europea','imagen','/flags/eu.svg',NULL,NULL,NULL,'arriba-izq',3,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_oferta','Oferta','texto',NULL,'OFERTA','#DF8635','#FFFFFF','arriba-der',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_mas_vendido','Mas Vendido','texto',NULL,'MÁS VENDIDO','#111111','#FFFFFF','arriba-der',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_novedad','Novedad','texto',NULL,'NOVEDAD','#2E7D5B','#FFFFFF','arriba-der',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_waterproof','Waterproof','texto',NULL,'WATERPROOF','#12608F','#FFFFFF','abajo-der',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_water_resistant','Water Resistant','texto',NULL,'WATER RESISTANT','#4A94C4','#FFFFFF','abajo-der',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- "Logo de Producto Importado": va como etiqueta de texto porque no hay logo.
-- Cuando lo tengan, se cambia a tipo imagen desde Panel -> Stickers sin tocar
-- los productos que ya lo tengan asignado: el id no cambia.
INSERT OR IGNORE INTO "stickers" ("id","nombre","tipo","imagenUrl","texto","colorFondo","colorTexto","posicion","orden","isActive","createdAt","updatedAt")
VALUES ('stk_importado','Producto Importado','texto',NULL,'IMPORTADO','#4A4A4A','#FFFFFF','abajo-der',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
