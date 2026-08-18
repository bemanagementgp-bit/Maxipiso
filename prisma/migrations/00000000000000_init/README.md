# Baseline

Esta migracion es la linea base del schema actual, generada con
`prisma migrate diff --from-empty --to-schema-datamodel`.

El schema de productos nunca tuvo migraciones: se venia aplicando con
`prisma db push`, y la unica migracion que existia en el repo era
`20260603230221_init_crm`, escrita para PostgreSQL (`CREATE TYPE ... AS ENUM`,
`UUID`, `TIMESTAMPTZ`) cuando el datasource ya era SQLite/Turso. Con eso
`prisma migrate` no corria contra este proyecto.

## Bases que YA existen (produccion y cualquier copia con datos)

No corras `migrate deploy` de una: intentaria crear tablas que ya estan.
Marcala como aplicada primero:

    npx prisma migrate resolve --applied 00000000000000_init

A partir de ahi los cambios de schema van con `prisma migrate dev`.

## Bases nuevas (local, staging)

    npx prisma migrate deploy
