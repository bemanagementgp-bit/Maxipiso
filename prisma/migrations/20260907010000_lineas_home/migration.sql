-- Cards de "Nuestras lineas de productos" del home.
--
-- La portada es lo que mas cambia del sitio: cada campana trae fotos nuevas, y
-- hasta ahora cada cambio era editar codigo y deployar.
CREATE TABLE "lineas_home" (
  "slug"      TEXT NOT NULL PRIMARY KEY,
  "label"     TEXT NOT NULL,
  "imagenUrl" TEXT NOT NULL,
  "orden"     INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" DATETIME NOT NULL
);

-- Se siembra con lo que hoy esta en el codigo, para que el home siga viendose
-- igual apenas se aplique y el panel arranque con algo que editar.

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('pisos-flotantes', 'Pisos Laminados', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/laminados-portada_s4ialn.png', 0, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('pisos-vinilicos', 'Pisos Vinílicos', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/vinilico-portada_jtwqrp.png', 1, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('porcellanatos', 'Porcelanatos', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784517/porcelanato-portada_vfp0ml.png', 2, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('pisos-madera', 'Pisos de Madera', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784476/pisos-madera-portada_skuv8k.png', 3, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('decks', 'Deck', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784519/deck-portada_cah2hc.png', 4, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('revestimientos', 'Revestimientos', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784475/revestimientos-portada_ou8yse.png', 5, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('maderas', 'Maderas', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784518/maderas-portada_ynx4dp.png', 6, true, CURRENT_TIMESTAMP);

INSERT INTO "lineas_home" ("slug","label","imagenUrl","orden","isActive","updatedAt")
VALUES ('accesorios', 'Accesorios', 'https://res.cloudinary.com/dnaom2evd/image/upload/v1788784475/accesorios-portada_pfjckc.png', 7, true, CURRENT_TIMESTAMP);
