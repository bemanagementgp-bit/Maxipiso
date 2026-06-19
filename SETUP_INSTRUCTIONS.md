# 🚀 Setup Instructions - MaxiPiso Admin Panel

Pasos completos para configurar y ejecutar el panel de administración.

## Requisitos Previos

- Node.js 18+ instalado
- npm o yarn
- Cuenta en Neon (https://neon.tech) para la base de datos PostgreSQL

---

## PASO 1: Configurar Base de Datos (Neon)

### 1.1 Crear cuenta y proyecto en Neon

1. Ir a https://neon.tech/
2. Registrarse y crear nuevo proyecto
3. Copiar el **Connection String** completo

### 1.2 Agregar CONNECTION_STRING a `.env.local`

Editar `c:\Users\beman\OneDrive\Desktop\SaaS - MaxiPiso\web-maxipiso\.env.local`:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="tu-secreto-aqui-genera-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@maxipiso.com"
ADMIN_PASSWORD="ChangeMe123!"
```

**⚠️ Cambiar contraseña en producción**

---

## PASO 2: Crear Tablas en la Base de Datos

```bash
cd c:\Users\beman\OneDrive\Desktop\SaaS - MaxiPiso\web-maxipiso

# Ejecutar migraciones y crear tablas
npx prisma migrate dev --name init

# Seedear usuario admin (automático con el migrate)
npx prisma db seed
```

Esto:
- ✅ Crea todas las tablas en PostgreSQL
- ✅ Genera Prisma Client
- ✅ Crea usuario admin de prueba

### Verifiación (opcional)

```bash
# Abre interfaz visual de Prisma Studio
npx prisma studio
```

---

## PASO 2.bis: Base de datos del CRM (PostgreSQL / Neon)

El CRM (clientes + interacciones del chat) usa una **base PostgreSQL separada**
de la base de productos (Turso/SQLite). Esto está definido en `prisma/crm/schema.prisma`.

### 2.bis.1 Crear proyecto Neon

1. Crear un proyecto en https://neon.tech/ (puede ser el mismo o uno aparte).
2. Copiar las dos connection strings:
   - **Pooled** (con `-pooler` en el host) → `CRM_DATABASE_URL`
   - **Direct** (sin pooler, para migraciones) → `CRM_DIRECT_URL`

### 2.bis.2 Agregar a `.env.local`

```env
CRM_DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require"
CRM_DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Opcional: sal para hashear IPs en interacciones (min. 16 chars). Sin esto no se guarda hash.
CRM_IP_HASH_SALT="cambiá-esto-por-una-cadena-aleatoria-larga"
```

### 2.bis.3 Crear tablas y generar cliente

```bash
# Crea las tablas clientes / interacciones_chat en Neon
npm run db:crm:migrate

# (Regenerar cliente manualmente si hace falta)
npm run db:crm:generate

# Inspeccionar visualmente
npm run db:crm:studio
```

> El `postinstall` ya corre `prisma generate` para los dos schemas, así que un
> `npm install` deja ambos clientes listos.

### 2.bis.4 Verificación rápida del endpoint

```powershell
curl.exe -X POST http://localhost:3000/api/crm/leads `
  -H "Content-Type: application/json" `
  -H "Origin: http://localhost:3000" `
  -d '{"nombre":"Test","telefono":"+541112345678","url_origen":"http://localhost:3000/catalogo","mensaje_inicial":"Quiero ver pisos"}'
```

Debe devolver `{ "ok": true, "clienteId": "..." }`. Un segundo POST con el mismo
teléfono **no duplica el cliente** y agrega una segunda interacción.


---

## PASO 3: Generar NextAuth Secret

Si no tienes un secret, genéralo:

```bash
# En PowerShell o terminal:
openssl rand -base64 32
```

Copia el output y actualiza `NEXTAUTH_SECRET` en `.env.local`

---

## PASO 4: Instalar Dependencias (si falta alguna)

```bash
npm install
```

---

## PASO 5: Ejecutar en Desarrollo

```bash
npm run dev
```

El servidor estará en: **http://localhost:3000**

---

## PASO 6: Acceder al Panel

### Redirección Automática

1. Abre http://localhost:3000
2. Se redirige automáticamente a http://localhost:3000/auth/login

### Credenciales de Prueba

- **Email**: admin@maxipiso.com
- **Contraseña**: ChangeMe123!

⚠️ **CAMBIAR INMEDIATAMENTE EN PRODUCCIÓN**

---

## 🎯 Funcionalidades Disponibles

### Panel Principal (`/panel`)

✅ **Ver Productos**
- Tabla con SKU, Nombre, Marca, Imagen, Precio
- Buscar por nombre/SKU/marca
- Filtrar por marca
- Paginación

✅ **Crear Producto**
- Click en "Nuevo Producto"
- Completar formulario
- Subir imagen (JPG, PNG, WEBP, máx 5MB)

✅ **Editar Producto**
- Click en ícono de lápiz
- Modificar datos
- Cambiar imagen

✅ **Eliminar Producto**
- Click en ícono de papelera
- Confirmación de eliminación
- Soft delete (datos no se pierden)

✅ **Ver Historial**
- Click en ícono de ojos
- Ver todos los cambios del producto
- Usuario que realizó el cambio
- Fecha y hora del cambio

✅ **Exportar a Excel**
- Click en "Exportar Excel"
- Descarga archivo .xlsx con todos los productos

✅ **Importar desde Excel**
- Click en "Importar Excel"
- Selecciona archivo .xlsx
- Actualiza o crea productos automáticamente

---

## 📁 Estructura de Archivos Importantes

```
web-maxipiso/
├── prisma/
│   ├── schema.prisma       # Definición de modelos
│   └── seed.ts             # Script para crear admin
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts    # NextAuth config
│   │   │   ├── productos/route.ts              # CRUD de productos
│   │   │   ├── productos/[id]/route.ts         # Detalle y actualización
│   │   │   ├── productos/[id]/historial/...   # Historial de cambios
│   │   │   ├── productos/export/route.ts       # Export a Excel
│   │   │   ├── productos/import/route.ts       # Import desde Excel
│   │   │   └── upload/route.ts                 # Upload de imágenes
│   │   ├── auth/login/page.tsx                 # Página de login
│   │   └── (admin)/panel/page.tsx              # Panel principal
│   ├── components/admin/
│   │   ├── ProductTable.tsx    # Tabla de productos
│   │   ├── ProductModal.tsx    # Modal crear/editar
│   │   └── HistorialModal.tsx  # Modal historial
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config
│   │   ├── prisma.ts           # Cliente Prisma
│   │   └── auth-helpers.ts     # Funciones de autenticación
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   └── middleware.ts           # Protección de rutas
├── public/uploads/productos/   # Imágenes subidas
├── .env.local                  # Variables de entorno
├── DATABASE_SETUP.md           # Setup de BD
└── package.json
```

---

## 🔒 Seguridad Importante

### Antes de Producción

1. ✅ Cambiar `ADMIN_PASSWORD` en `.env.local`
2. ✅ Generar `NEXTAUTH_SECRET` nuevo con `openssl rand -base64 32`
3. ✅ Crear usuario admin adicional con contraseña fuerte
4. ✅ Habilitar HTTPS en producción
5. ✅ Configurar `NEXTAUTH_URL` con dominio real

### Variables de Entorno Seguras

```env
# NO commitear .env.local a Git
# Usa secrets en tu hosting (Vercel, Railway, etc.)
```

---

## 🚀 Deploy a Producción

### Opción 1: Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

Vercel maneja automáticamente:
- Build de Next.js
- Migraciones de Prisma
- Variables de entorno secretas

### Opción 2: Docker

```bash
docker build -t maxipiso-admin .
docker run -p 3000:3000 maxipiso-admin
```

### Opción 3: Servidor Linux/Windows

```bash
npm run build
npm run start
```

---

## 🐛 Troubleshooting

### Error: "No estás autorizado"

- ✅ Verificar cookies de sesión habilitadas
- ✅ Verificar `NEXTAUTH_SECRET` en `.env.local`
- ✅ Limpiar caché del navegador

### Error: "Error de conexión a base de datos"

- ✅ Verificar `DATABASE_URL` en `.env.local`
- ✅ Verificar conexión a internet
- ✅ En Neon, permitir acceso desde tu IP

### Imágenes no cargan

- ✅ Verificar carpeta `public/uploads/productos/` existe
- ✅ Verificar permisos de escritura en servidor
- ✅ Verificar tamaño de imagen < 5MB

### Migrations failed

```bash
# Reset base de datos (CUIDADO: ELIMINA TODOS LOS DATOS)
npx prisma migrate reset

# O, crear una nueva migración:
npx prisma migrate dev --name fix_issue
```

---

## 📞 Soporte

Si hay problemas:

1. Verificar archivo `.env.local` está correcto
2. Revisar logs en terminal (`npm run dev`)
3. Ejecutar `npx prisma studio` para verificar BD
4. Limpiar caché: `npm cache clean --force`
5. Reinstalar dependencias: `rm -r node_modules && npm install`

---

## ✅ Checklist Final

- [ ] Base de datos Neon creada y conectada
- [ ] `.env.local` configurado con DATABASE_URL
- [ ] Migraciones ejecutadas (`npx prisma migrate dev --name init`)
- [ ] Usuario admin creado
- [ ] NextAuth secret generado
- [ ] `npm run dev` ejecutándose sin errores
- [ ] Página de login accesible
- [ ] Login funciona con admin@maxipiso.com / ChangeMe123!
- [ ] Panel de productos cargado
- [ ] Crear producto funciona
- [ ] Excel export/import funciona

---

**¡Panel listo para usar!** 🎉
