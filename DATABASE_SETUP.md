# SQL Schema para MaxiPiso Admin Panel

Este archivo contiene el esquema de base de datos generado automáticamente por Prisma.

## Requisitos Previos

- Base de datos PostgreSQL (recomendado: Neon - https://neon.tech)
- Prisma CLI instalado (`npm install -D prisma`)

## Crear las Tablas en la Base de Datos

Después de configurar tu DATABASE_URL en `.env.local`, ejecuta:

```bash
npx prisma migrate dev --name init
```

Esto:
1. Crea todas las tablas en tu base de datos PostgreSQL
2. Genera el cliente de Prisma automáticamente
3. Ejecuta el seed para crear usuario admin de prueba

## Estructura de Tablas

### users
- id (String, PRIMARY KEY)
- email (String, UNIQUE)
- name (String, NULLABLE)
- passwordHash (String)
- role (Enum: ADMIN, VIEWER)
- createdAt (DateTime)
- updatedAt (DateTime)

### products
- id (String, PRIMARY KEY)
- sku (String, UNIQUE, INDEX)
- nombre (String)
- marca (String)
- descripcion (String, NULLABLE)
- precio (Float)
- imagen (String, NULLABLE)
- isActive (Boolean, DEFAULT: true)
- createdAt (DateTime)
- updatedAt (DateTime)

### change_logs
- id (String, PRIMARY KEY)
- productId (FK → products.id)
- usuarioId (FK → users.id)
- campo (String)
- valorAnterior (String, NULLABLE, TEXT)
- valorNuevo (String, NULLABLE, TEXT)
- tipo (Enum: CREATE, UPDATE, DELETE)
- fechaCambio (DateTime)

**Indices**: productId, usuarioId, fechaCambio

### imagenes_productos
- id (String, PRIMARY KEY)
- productId (FK → products.id)
- url (String)
- nombre (String, NULLABLE)
- fechaCarga (DateTime)

### sessions (NextAuth)
- id (String, PRIMARY KEY)
- sessionToken (String, UNIQUE)
- userId (FK → users.id)
- expires (DateTime)

## Conexión a Neon (Recomendado)

1. Crear cuenta: https://neon.tech/
2. Crear nuevo proyecto
3. Copiar CONNECTION_STRING
4. Agregar a `.env.local`: `DATABASE_URL="postgresql://..."`
5. Ejecutar: `npx prisma migrate dev --name init`

## Alternativas de Base de Datos

- **Neon** (PostgreSQL): Recomendado, serverless
- **AWS RDS PostgreSQL**: Más control, costo variable
- **Render PostgreSQL**: Simple, buena integración
- **Supabase**: PostgreSQL + herramientas extras

## Verifiación

Después de ejecutar migraciones, verifica:

```bash
npx prisma studio
```

Esto abre una interfaz visual para ver y editar los datos.
