-- Elimina la tabla del hero administrable.
--
-- El ABM de /panel/hero subia archivos con fs.writeFile sobre public/uploads/hero,
-- y en Vercel el filesystem de las funciones es de solo lectura: nunca se cargo
-- un item en produccion (no hay ningun archivo en public/uploads/hero commiteado)
-- y la home siempre mostro su video de fallback. Se removio el ABM, el endpoint
-- y el modelo.
--
-- Es seguro incluso si la tabla no existe en la base destino.
DROP TABLE IF EXISTS "hero_media";
