-- Precio en accesorios.
--
-- Era la unica de las 8 tablas sin ninguna columna de importe: una manta bajo
-- piso o un zocalo no tenian donde cargar el precio, no aparecian en la grilla
-- de Precios y stock y en el catalogo salian sin precio.
--
-- Va `precio` a secas y no `precioM2`: un accesorio se vende por unidad, bolsa
-- o rollo, no por metro cuadrado. Es el mismo criterio que en `maderas`.
ALTER TABLE "accesorios" ADD COLUMN "precio" REAL;
ALTER TABLE "accesorios" ADD COLUMN "moneda" TEXT;
