# Maxipiso — documento de proyecto

> Estado real del repositorio, no el estado deseado. Todo lo que está acá fue verificado
> leyendo el código, el schema y el historial de git, y corriendo `next build` + `tsc`.
> Si algo no se pudo verificar, está marcado como tal.
>
> **Última verificación:** 2026-08-18 · commit `23caa19` · Next.js 16.2.6 · build ✅ · typecheck ✅ (0 errores, **0 `@ts-nocheck`**)
>
> Una tanda de arreglos ya se aplicó sobre este documento. Lo que fue corregido
> está marcado ✅ en el backlog (§12) y sacado de las trampas (§9). Lo que sigue
> abierto está en §9 y §12.

---

## 1. Qué es esto

Web + backoffice de **Maxipiso**, mayorista argentino de pisos, maderas y revestimientos.
Un solo proyecto Next.js sirve cuatro cosas distintas:

| Superficie | Ruta | Quién entra |
|---|---|---|
| Sitio institucional | `/`, `/empresa`, `/novedades/*`, `/distribuidores` | público |
| Catálogo de productos | `/catalogo`, `/catalogo/[id]` | público; **los precios sólo con sesión** |
| Panel de administración | `/panel/*` | rol `ADMIN` |
| Chatbot comercial ("Nacho") | widget flotante en todo el sitio público | público |

Producción: `https://maxipiso.vercel.app` (Vercel) · dominio de marca `maxipiso.com.ar`.

**Modelo de acceso al catálogo.** El catálogo se ve sin login, pero los campos de precio,
stock y moneda se filtran en el servidor si no hay sesión. Los mayoristas piden credenciales
por WhatsApp (`+54 221 438-8894`) y entran por `/catalogo/login` o por un modal en `/catalogo`.

---

## 2. Stack

| Pieza | Versión | Notas |
|---|---|---|
| Next.js | 16.2.6 | App Router, **Turbopack**, React Server Components |
| React | 19.2.4 | |
| TypeScript | 5.x | `strict: true`, 0 errores, **sin ningún `@ts-nocheck`** |
| Tailwind CSS | v4 | vía `@tailwindcss/postcss`, sin `tailwind.config` |
| Prisma | 6.19.3 | `driverAdapters`, `engineType: library` |
| Base de datos | Turso / libSQL | provider `sqlite`, adapter `@prisma/adapter-libsql` |
| Auth | NextAuth v4 (`4.24.14`) | provider `credentials`, sesión **JWT**, TOTP opcional |
| LLM del chat | Groq | `llama-3.3-70b-versatile` con fallback a `llama-3.1-8b-instant` |
| Email | Resend | vía `fetch` a la REST API, sin SDK (la dependencia se quitó) |
| Excel | SheetJS `xlsx` 0.20.3 | **desde `cdn.sheetjs.com`, no desde npm** — ver §11 |
| Mapas | Leaflet 1.9.4 | import dinámico, sin `react-leaflet` |
| Gráficos | Recharts 3.9 | sólo en `/panel/reportes` |

### Nombre de archivo del middleware

El middleware vive en **`src/proxy.ts`**, no en `middleware.ts`. No es un error: Next.js 16
renombró la convención a `proxy.ts`. El commit `43129b1` hizo ese rename.

---

## 3. Cómo levantarlo

```bash
npm install          # postinstall corre `prisma generate`
npx prisma generate  # si hace falta regenerar el cliente a mano
npm run dev          # http://localhost:3000
npm run build        # prisma generate && next build
npm start
```

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run check` | typecheck + lint |
| `npm run db:push` | Aplica el schema sin migraciones (desarrollo) |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Crea el admin inicial |

CI corre typecheck + lint + build en cada PR (`.github/workflows/ci.yml`).
**Todavía no hay tests** — ver §12.

⚠️ La primera vez hay que correr `npm install` (no `npm ci`): se agregaron
devDependencies (ESLint, tsx) y se quitaron cuatro dependencias sin uso, así que
`package-lock.json` quedó desincronizado a propósito. `xlsx` se resuelve desde
`cdn.sheetjs.com`, no desde el registry de npm, y eso impide regenerar el lock
en entornos con la red restringida.

### Variables de entorno

`prisma.config.ts` carga `.env` y además `.env.local` con `override: true`.

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `DATABASE_URL` | **sí** | URL de Turso (`libsql://…`) o `file:./dev.db` en local |
| `DATABASE_AUTH_TOKEN` | sí en Turso | token de la base remota |
| `NEXTAUTH_SECRET` | **sí** | firma del JWT de sesión. Mínimo 32 chars |
| `NEXTAUTH_URL` | recomendada | base URL para callbacks |
| `NEXT_PUBLIC_APP_URL` | opcional | se usa en la validación de `Origin` de las mutaciones |
| `TOTP_ENC_KEY` | **sí en prod** | 64 chars hex (32 bytes) para cifrar los secrets TOTP en AES-256-GCM |
| `GROQ_API_KEY` | opcional | sin ella `/api/chat` devuelve 503 |
| `RESEND_API_KEY` | opcional | sin ella `/api/contacto` devuelve 503 |
| `BLOB_READ_WRITE_TOKEN` | **sí en Vercel** | storage de archivos subidos; sin esto se usa disco local (§8.5) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | sólo para el seed | `prisma/seed.ts` |

⚠️ **Trampa con el secret.** `src/app/api/auth/[...nextauth]/route.ts:6` acepta
`NEXTAUTH_SECRET || AUTH_SECRET`, pero `src/lib/auth.ts:20` y `src/proxy.ts:54` leen
**sólo `NEXTAUTH_SECRET`**. Si configurás únicamente `AUTH_SECRET`, el login parece
funcionar pero el middleware no puede decodificar el token y `/panel` redirige a login
en loop. Usá siempre `NEXTAUTH_SECRET`.

`src/lib/env.ts` valida el entorno con Zod y ahora **sí se ejecuta**: lo importa
`src/lib/prisma.ts` por efecto de borde. Loguea los problemas en vez de lanzar, para no
tumbar un deploy que hoy funciona; el comentario del archivo explica cómo volverlo fatal
una vez que verifiques que producción cumple el schema.

Hay un `.env.example` en la raíz con todas las variables y sus trampas.

---

## 4. Mapa del repositorio

```
src/
├── app/
│   ├── (admin)/                    1.695 líneas — grupo de rutas del panel
│   │   ├── layout.tsx              shell del panel (sidebar, theme switcher)
│   │   └── panel/                  page (ABM) · hero · importacion · reportes
│   ├── api/                        3.481 líneas — todos los endpoints (§6)
│   ├── auth/login/                 login del panel → redirige a /panel
│   ├── catalogo/                   listado (561) · ficha [id] (537) · login (227)
│   ├── novedades/                  índice + 3 landings estáticas + [slug] SSG
│   ├── distribuidores/  empresa/
│   ├── tienda/                     redirect permanente a /catalogo (§8.6)
│   ├── sitemap.ts                  sitemap de las páginas públicas estables
│   ├── layout.tsx                  root layout: SessionProvider + ShellLayout
│   └── globals.css
├── components/
│   ├── admin/                      1.465 líneas — ProductTable · QuickEditPanel
│   │                               HistorialModal · MetadataEditor
│   ├── catalog/                    621 líneas — ProductCard · ProductGallery
│   │                               ProductCarousel · SafeImage · LoginModal
│   ├── layout/                     Header · Footer · ShellLayout · ChatWidget · WhatsAppButton
│   ├── home/HeroCarousel.tsx
│   ├── distribuidores/DistributorMap.tsx
│   └── providers/SessionProvider.tsx
├── lib/                            2.224 líneas — la lógica de verdad
│   ├── all-products.ts             registro de las 8 tablas + acceso a delegates
│   ├── auth.ts  audit.ts  totp.ts  password.ts     autenticación
│   ├── category-fields.ts          define los campos del ABM por categoría
│   ├── sheet-schemas.ts            mapeo de columnas de Excel → campos Prisma
│   ├── storage.ts                  abstracción de archivos subidos (§8.5)
│   ├── catalog-cache.ts            caché del catálogo público, invalidable
│   ├── security.ts  rate-limit.ts  env.ts  prisma.ts  flags.ts
│   └── catalog-public.ts  google-drive.ts
├── data/                           contenido estático: novedades, distribuidores
├── types/                          reexporta los tipos generados por Prisma
└── proxy.ts                        middleware: rate limit + autorización por ruta
prisma/
├── schema.prisma                   8 tablas de producto + auth + auditoría + leads
├── seed.ts                         crea el admin inicial (`npm run db:seed`)
└── migrations/00000000000000_init  baseline SQLite (14 tablas)
```

### Archivos que no consume el build

- `assets/` (47 MB) — material de origen (videos, piezas de diseño). No lo usa el
  build; sigue en el repo por decisión pendiente (§12, ítem 23).

`image-map.json` y `Diseños ABM productos_files/` ya se eliminaron: el primero
apuntaba a `scripts/apply-image-map.js`, que no está en el repo; el segundo eran
los assets de un HTML gitignoreado.

---

## 5. Modelo de datos

### La decisión estructural: 8 tablas, no una

No hay tabla `Product`. Cada categoría comercial es su propio modelo de Prisma, porque los
atributos técnicos casi no se solapan (un piso flotante tiene `abrasion` y `tablasPorCaja`;
una madera tiene `espesoresDisponibles` y `secado`).

| Modelo Prisma | `@@map` | Clave del delegate | Precio principal |
|---|---|---|---|
| `PisoFlotante` | `pisos_flotantes` | `pisoFlotante` | `precioM2` |
| `Porcellanato` | `porcellanatos` | `porcellanato` | `precioM2` |
| `Revestimiento` | `revestimientos` | `revestimiento` | `precioM2` / `precioTabla` / `precioMl` |
| `PisoVinilico` | `pisos_vinilicos` | `pisoVinilico` | `precioM2` |
| `PisoMadera` | `pisos_madera` | `pisoMadera` | `precioM2` |
| `Deck` | `decks` | `deck` | `precioM2` / `precioTabla` / `precioMLineal` |
| `Madera` | `maderas` | `madera` | **`precio`** ← la única distinta |
| `Accesorio` | `accesorios` | `accesorio` | — (sin precio) |

Los tres nombres de cada tabla (modelo Prisma / nombre en DB / clave del delegate) conviven
en todo el código y **hay que mapear entre ellos constantemente**. El registro canónico está
en `src/lib/all-products.ts`:

- `TABLE_KEYS`, `DB_NAMES`, `TABLE_LABELS`, `TABLE_CATEGORIA` — el registro.
- **`getDelegate(key)`** — único lugar donde se indexa el `PrismaClient` por nombre.
  No escribas `(prisma as any)[key]` en ningún otro lado.
- **`tableKeyFromDbName(dbName)`** — traduce `"pisos_flotantes"` → `"pisoFlotante"`.

Los cuatro mapas duplicados que había en `import`, `import/preview`,
`metadata-suggest` y `reorder` ya se eliminaron. Los endpoints de catálogo
(`catalogo/[categoria]`, `catalogo/todos`) todavía tienen su propio mapa slug →
delegate, porque usan slugs públicos con guiones (`"pisos-flotantes"`) que no
coinciden con los nombres de tabla. Si agregás una categoría, tocá esos dos más
`all-products.ts`, `category-fields.ts` y `sheet-schemas.ts`.

### Campos comunes a las 8 tablas

`id` (cuid) · `sku` (**unique**) · `imagenes` · `descripcion` · `metadatos` ·
`isActive` (soft delete) · `sortOrder` (orden manual en el panel) · `createdAt` · `updatedAt`.

- **`imagenes`** es un `String?` que guarda un **array JSON** de URLs (`'["/a.jpg","/b.jpg"]'`).
  Los helpers toleran también CSV separado por `;` o `,` (ver `firstImage()` en
  `all-products.ts:119` y `parseImagenes()` en `catalogo/[id]/page.tsx:29`).
- **`metadatos`** es un `String?` con JSON `[{clave, valor}]` para atributos ad-hoc que no
  tienen columna. `/api/productos/metadata-suggest` mina las últimas 50 filas de una tabla
  para sugerir las claves más usadas.
- **Las medidas son `String`, no números** (`espesor`, `ancho`, `largo`, `base`), cada una con
  su columna de unidad al lado (`espesorUm`, `anchoUm`, …). `formatMeasureFields()` en
  `all-products.ts:303` las une para mostrar ("12" + "mm" → "12 mm").
- **`moneda`** es texto libre (`"u$s"`, `"USD"`, pesos…). Ver §9: los reportes lo ignoran.

### Auth y auditoría

- `User` — email único, `passwordHash` (bcrypt), `role` (`ADMIN` | `VIEWER`), contadores de
  lockout (`failedLoginCount`, `lockedUntil`), campos TOTP (`totpSecret` cifrado,
  `totpEnabled`, `totpBackupCodes` hasheados).
- `AuthEvent` — bitácora de login/logout/lockout/TOTP con IP y user-agent.
- `ChangeLog` — auditoría **polimórfica** de productos: `tablaNombre` + `entidadId` apuntan a
  cualquiera de las 8 tablas. `campo` guarda o el nombre del campo (UPDATE por campo) o el
  literal `"PRODUCTO"` (CREATE / import). Sin FK — la integridad no está garantizada por la DB.
- `HeroMedia` — imágenes y videos del carrusel del home, ordenables.
- `Lead` — contactos que captura el chatbot antes de derivar a WhatsApp (§8.6).
  Se deduplica por `telefonoNormalizado` (solo dígitos) y lleva un contador de
  `interacciones` y un `estado` para seguimiento comercial.
- `Session` — **tabla muerta**. La sesión es JWT y no se configura ningún adapter de Prisma,
  así que nunca se escribe una fila. `@next-auth/prisma-adapter` está en `package.json` sin usarse.

---

## 6. Endpoints

Todos bajo `src/app/api/`. La columna "Gate" indica **quién puede llegar** combinando
`src/proxy.ts` (middleware) y el chequeo dentro del handler.

### Públicos

| Método | Ruta | Gate | Qué hace |
|---|---|---|---|
| `GET` | `/api/catalogo` | público | Conteo de productos activos por categoría (hub) |
| `GET` | `/api/catalogo/todos` | público | **Endpoint principal del catálogo.** Búsqueda + filtros + orden + paginación sobre las 8 tablas. Filtra campos de precio si no hay sesión |
| `GET` | `/api/catalogo/[categoria]` | público | Listado por categoría. ⚠️ **Sólo lo consume `CategoryListing.tsx`, que no está montado en ninguna página** (§10) |
| `GET` | `/api/hero` | público | Items activos del carrusel del home |
| `POST` | `/api/chat` | público | Chatbot Groq. Rate limit 20/min |
| `POST` | `/api/contacto` | público | Formulario de contacto → Resend. Rate limit 5/10min |
| `POST` | `/api/leads` | público | Registra un lead del chatbot antes del handoff a WhatsApp. Rate limit 10/10min, upsert por teléfono |

El middleware aplica además un rate limit de **120 req/min por IP** sobre `/api/catalogo/*`
y `/api/contacto` (`proxy.ts`). Era 10, que lo superaba cualquiera navegando con búsqueda
debounced y filtros. Sigue siendo un contador en memoria del proceso — ver §9.5.

### Requieren sesión

| Método | Ruta | Gate | Qué hace |
|---|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | público | Login (credentials + TOTP) |
| `POST` | `/api/auth/password` | autenticado | Cambio de contraseña. ⚠️ **sin UI** (§9) |
| `POST` | `/api/auth/2fa/setup` | autenticado | Genera secret + QR |
| `POST` | `/api/auth/2fa/enable` | autenticado | Confirma con código, devuelve 10 backup codes |
| `POST` | `/api/auth/2fa/disable` | autenticado | Requiere contraseña **y** código vigente |
| `GET` | `/api/productos` | autenticado | Listado admin cross-tabla con filtros y paginación |
| `GET` | `/api/productos/[id]` | autenticado | Fila cruda + `_tabla` |

⚠️ Los tres endpoints de 2FA y el de cambio de contraseña **no tienen ninguna pantalla que
los llame**. Están completos y funcionan, pero hoy sólo se pueden usar con curl/Postman.

### Sólo ADMIN

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/productos` | Crear producto (requiere `_tabla`) |
| `PUT` `DELETE` | `/api/productos/[id]` | Editar / soft-delete (`isActive = false`) |
| `POST` | `/api/productos/[id]/toggle` | Alternar `isActive` |
| `GET` | `/api/productos/[id]/historial` | ChangeLog paginado del producto |
| `PUT` | `/api/productos/reorder` | Reordenar (`sortOrder`) |
| `GET` | `/api/productos/export` | Excel de todos los productos activos |
| `GET` | `/api/productos/plantilla` | Excel vacío con las columnas de una categoría |
| `POST` | `/api/productos/import/preview` | Analiza el Excel sin escribir |
| `POST` | `/api/productos/import` | Importa (upsert por SKU). Máx 5 MB / 2.000 filas |
| `POST` | `/api/productos/metadata-suggest` | Claves de `metadatos` más usadas |
| `GET` | `/api/productos/stats` | Precio promedio por categoría y marca |
| `GET` | `/api/reportes/resumen` | KPIs del panel |
| `GET` | `/api/reportes/precio-historico` | Serie temporal de precio de un producto |
| `GET` | `/api/reportes/importaciones` | Últimas "sesiones" de importación |
| `POST` | `/api/upload` | Sube imagen de producto |
| `POST` `PUT` `DELETE` | `/api/hero` | ABM del carrusel |

### Convenciones de los handlers

- Todas las mutaciones (`POST`/`PUT`/`PATCH`/`DELETE`) empiezan con `verifyOrigin(req)`
  de `src/lib/security.ts` — compara `Origin`/`Referer` contra el host y `NEXT_PUBLIC_APP_URL`,
  y devuelve 403 si no matchea o si faltan ambos headers.
- Respuesta estándar: `{ success: true, data }` o `{ error: "..." }` con el status HTTP.
  No es 100% uniforme: algunos devuelven `{ ok: true }`.
- `export const runtime = "nodejs"` está en todos (necesario por Prisma + libSQL).
- Toda mutación de producto llama a `clearCatalogCache()` antes de responder (§9.4).
- El rate limit por endpoint se pide con `enforceRateLimit()` de `src/lib/rate-limit.ts`.

---

## 7. Autenticación y roles

### Flujo

`CredentialsProvider` en `src/lib/auth.ts`. `authorize()` hace, en orden:

1. Normaliza el email, corta si excede longitudes razonables.
2. Rate limit por IP (10 / 15 min) **y** por email (5 / 15 min).
3. Chequea `lockedUntil` persistente en DB.
4. Compara siempre con bcrypt — contra un hash dummy si el usuario no existe, para que el
   tiempo de respuesta no revele si el email está registrado.
5. En fallo, incrementa `failedLoginCount`; a los 5 bloquea 15 minutos.
6. Si `totpEnabled`, exige código; si no vino, tira el error `TOTP_REQUIRED` que el front usa
   como señal para mostrar el segundo paso. Si el TOTP no valida, prueba como backup code
   (bcrypt, un solo uso, se descuenta de la lista).
7. Registra el resultado en `AuthEvent`.

Todos los errores hacia el cliente son genéricos (`"Credenciales inválidas"`), salvo
`TOTP_REQUIRED` y los mensajes de rate limit / bloqueo.

### Sesión

JWT, 7 días de vida, refresco cada 24 h. Cookie `httpOnly` + `sameSite: lax` + `secure` en
producción, con prefijo `__Secure-` en prod. El `role` viaja en el token
(callbacks `jwt` y `session` en `auth.ts:194-208`).

### Roles

| Rol | Qué puede |
|---|---|
| `ADMIN` | Todo el panel y todas las mutaciones |
| `VIEWER` | Sesión válida: ve precios en el catálogo. No puede mutar nada |

⚠️ **Hoy existe una sola cuenta `VIEWER` compartida entre todos los mayoristas.** No se puede
revocar el acceso a un cliente puntual sin cambiarle la contraseña a todos, ni saber por
`AuthEvent` qué empresa entró. Migrar a una cuenta por cliente es trabajo pendiente (P1 en §12).

### Autorización por ruta (`src/proxy.ts`)

El middleware corre sobre `/catalogo/:path*`, `/panel/:path*` y `/api/:path*`:

- `/api/auth/*` (menos `password` y `2fa`) pasa sin tocar.
- `/api/catalogo/*` y `/api/contacto` → rate limit por IP, sin auth.
- `/panel/*` → redirige a `/auth/login` si el rol no es `ADMIN`.
- `/api/upload`, `/api/productos/{import,export,plantilla,stats,metadata-suggest}`,
  `/api/reportes/*` y `/api/hero` no-GET → 401 si no es `ADMIN`.
- `/api/productos*` y `/api/auth/{password,2fa}` → 401 si no hay sesión.

**El middleware no reemplaza los chequeos del handler.** Cada route handler vuelve a llamar
`getServerSession` y a validar el rol. Mantené las dos capas: si sólo confiás en una, un
cambio en el `matcher` abre un agujero silencioso.

### Cabeceras de seguridad (`next.config.ts`)

CSP, HSTS (2 años + preload), `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`, `dangerouslyAllowSVG: false`.
`/uploads/*` se sirve con `default-src 'none'; sandbox` para que nada subido por un usuario
pueda ejecutarse como HTML/JS.

> **Seguridad.** Los hallazgos de la auditoría de seguridad se manejan **fuera de este
> documento** por decisión explícita. Mientras el repositorio sea público, no agregar acá
> detalle de vectores, rutas explotables ni pasos de reproducción.
>
> **Nada de esta sección se modificó en la tanda de arreglos**, también por decisión
> explícita: el modelo de accesos (verificación de sesión, gate de precios, roles, matcher
> del middleware, variables de secret) quedó exactamente como estaba. Los únicos cambios que
> tocan `proxy.ts` son el valor del rate limit público y nada más.

---

## 8. Flujos principales

### 8.1 Catálogo público

`/catalogo` (client component) → `GET /api/catalogo/todos`.

- Sin `categoria`: consulta las **8 tablas en paralelo**, mergea y pagina en memoria.
- Con `categoria`: consulta una sola tabla y pagina en la DB.
- Sólo se devuelven productos con imagen: el `where` incluye
  `imagenes NOT NULL AND != '' AND != '[]'`. **Un producto sin foto es invisible en el catálogo.**
- Si no hay sesión, se eliminan del payload todas las claves que empiezan con `precio`,
  más `stock` y `moneda`.
- Los accesorios y tipos secundarios (pastinas, adhesivos, perfiles) se empujan al final.
- Caché en memoria de 60 s por combinación de parámetros, con la bandera de sesión incluida
  en la clave (`lib/catalog-cache.ts`). Toda mutación de producto la invalida — con la
  salvedad de §9.4.
- `timeout()` (12 s) envuelve cada query: si Turso tarda, esa tabla devuelve `[]` y la
  request sigue. Ahora **distingue timeout de rechazo** y loguea cuál tabla falló: antes
  una query mal formada se veía como "0 productos" sin ningún error (§9.2).
- El orden (`sortBy`) se traduce por tabla con `buildOrderBy()`, porque el campo de precio
  no es el mismo en todas. En la vista multi-categoría el merge se reordena globalmente
  antes de cortar la página.

La ficha `/catalogo/[id]` es **server component**: resuelve el producto con `findProductById()`
(recorre las 8 tablas secuencialmente hasta el primer match), arma las specs con
`buildSpecsFromRow()` y muestra precios sólo si `getServerSession` devuelve sesión.

### 8.2 ABM de productos

`/panel` → `ProductTable` (listado + drag & drop de orden) + `QuickEditPanel` (formulario
lateral) + `HistorialModal`.

- Los campos del formulario **no están hardcodeados por página**: salen de
  `src/lib/category-fields.ts` (`CATEGORY_CONFIGS`), que define por tabla qué campos existen,
  su tipo, cuáles se ven en la grilla (`gridVisible`) y cuáles son obligatorios.
- El backend usa **la misma config** como whitelist: `sanitizeProductData()` en
  `productos/route.ts:22` y `productos/[id]/route.ts:22` descarta cualquier clave que no esté
  en `config.fields`. **Si agregás una columna a Prisma y no la agregás a `category-fields.ts`,
  el backend la va a ignorar en silencio.**
- Cada `PUT` genera un `ChangeLog` **por campo modificado**, en un loop de creates secuenciales
  (`[id]/route.ts:148-172`) — no está batcheado.
- El borrado es **soft**: `isActive = false`. No hay borrado físico en ninguna parte.

### 8.3 Orden manual (`sortOrder`)

Dos caminos:

- **Drag & drop dentro de una página** → manda todos los items de esa página con su nuevo
  `sortOrder` → un `update` por item, en transacción.
- **"Mover a posición N"** → manda un solo item → el backend recalcula **solo las filas
  entre el origen y el destino**, también en transacción. Si `sortOrder` todavía no es una
  permutación `0..n-1` (por ejemplo si están todos en 0), normaliza la tabla entera una
  vez; a partir de ahí los movimientos son incrementales.

El reorder sólo funciona con una categoría seleccionada: si el filtro es "Todas las
categorías", `tabla` va vacío y el endpoint devuelve 400.

### 8.4 Importación desde Excel

`/panel/importacion` (asistente de 3 pasos) o el botón "Importar" de `/panel`.

1. **Plantilla** — `GET /api/productos/plantilla?categoria=<id>` genera un `.xlsx` con las
   columnas de esa categoría (o un libro con las 8 hojas si no se pasa categoría).
2. **Preview** — `POST /api/productos/import/preview` parsea sin escribir y muestra qué
   esquema detectó, cuántas filas y qué SKUs ya existen.
3. **Confirmar** — `POST /api/productos/import` hace el upsert por `sku`.

Cómo funciona el parseo (`src/lib/sheet-schemas.ts`):

- `norm()` normaliza los headers: saca acentos, colapsa espacios, pasa a minúsculas.
- `pickWorksheets()` acepta toda hoja que tenga una columna `sku`; si ninguna la tiene,
  cae a la primera hoja del libro.
- `detectSchema()` puntúa cada uno de los 8 esquemas contra sus `signatureColumns` y gana el
  de mayor score. **Un libro multi-hoja puede importar cada hoja a una tabla distinta.**
  Si ninguna columna firma coincide (`score` 0), devuelve `recognized: false` y **la hoja se
  omite**: antes se importaba entera al primer esquema de la lista, o sea a pisos flotantes.
  El preview la muestra como "No reconocida" y el import la reporta en `warnings`.
- `parseRow()` traduce header → campo Prisma vía `fieldMap`; lo que no está en el mapa se descarta.
- El upsert es por `sku` **dentro de la tabla detectada**. SKUs duplicados en el mismo archivo:
  gana el primero, el resto se cuenta como omitido.

⚠️ El archivo se sube **dos veces** (una al preview, otra al import) y se re-parsea de cero.

El botón "Importar" de `/panel` ahora enlaza a `/panel/importacion`. Antes abría un modal
propio (`ImportPreviewModal`) que esperaba una forma de datos que el endpoint no devuelve,
así que mostraba tablas vacías siempre; el `@ts-nocheck` lo ocultaba.

### 8.5 Imágenes

`POST /api/upload` con `multipart/form-data` (`file` + `productId` opcional):
valida tamaño (5 MB), MIME declarado, **y los magic bytes reales del buffer**; y si vino
`productId`, hace push de la URL al array `imagenes` del producto.

El guardado pasa por **`src/lib/storage.ts`**, que define una interfaz `StorageDriver`
(`save` / `remove`) y elige el driver en `getStorage()`. Hoy hay un solo driver
implementado, el local, que escribe en `public/uploads/<carpeta>/` con nombre aleatorio y
verifica que el path resultante no se escape del directorio.

⚠️ **En Vercel el driver local no sirve**: el filesystem de las funciones es de solo
lectura salvo `/tmp`, y además es efímero. Ahora eso **falla de forma explícita**: el driver
detecta `EROFS`/`EACCES`/`EPERM`/`ENOSPC` y devuelve **503 con un mensaje accionable** en
lugar de un 500 mudo. Los 50 MB de `public/uploads/` commiteados al repo son el rastro de
que hoy las imágenes se suben en local y se commitean a mano.

**Para arreglarlo de verdad hace falta elegir un blob store.** Cuando esté decidido, es un
driver nuevo y una línea en `getStorage()`; el resto de la app no se entera. Es el ítem 2
del backlog y lo único de P0 que quedó sin cerrar.

`POST /api/hero` usa el mismo storage y acepta además video (MP4/WebM hasta 50 MB). Las
imágenes ahora también se validan por magic bytes; los videos siguen validándose por el
`Content-Type` declarado, porque no hay detector propio para ellos.

### 8.6 Chatbot "Nacho"

`ChatWidget` → `POST /api/chat` → Groq.

- El system prompt (≈100 líneas en `chat/route.ts`) define personalidad, catálogo,
  reglas de precio/stock/reclamos y cuándo derivar. Es la especificación comercial del bot;
  editarlo cambia el comportamiento sin tocar código.
- El body se valida con Zod (máx 30 mensajes, 2.000 chars c/u) y **se descartan los mensajes
  con `role: "system"` que mande el cliente** — defensa contra prompt injection del rol.
- El modelo responde JSON forzado (`response_format: json_object`) con
  `{ reply, waText, storeUrl, lead }`. `waText` se convierte en un link `wa.me` prellenado.
- `lead` (nombre / email / teléfono que el bot extrajo de la charla) se sanitiza y valida,
  y sirve para pre-llenar el formulario de derivación.

**Persistencia del lead.** Al confirmar el handoff, el widget hace `POST /api/leads` y
recién después abre WhatsApp. Es deliberadamente **fail-open**: si el guardado falla, igual
deriva — perder el registro es malo, perder la venta es peor. El endpoint deduplica por
teléfono normalizado, así que un cliente que vuelve actualiza su fila e incrementa
`interacciones` en vez de generar un duplicado.

> Antes de esto los datos solo viajaban dentro del texto del mensaje de WhatsApp y quedaban
> en el `localStorage` del visitante. El comentario del componente todavía decía que llamaba
> a `/api/crm/leads`, un endpoint que no existe desde que se removió el CRM.

**`storeUrl`.** Cuando el bot decide mandar al catálogo online devuelve `storeUrl: true`, y
el handler lo traduce a **`/catalogo`**. Antes apuntaba a `/tienda`, una página que leía un
array hardcodeado vacío y cuya única entrada era justamente el chatbot: el bot mandaba gente
a una página en blanco. `/tienda` ahora es un redirect permanente a `/catalogo`.

## 9. ⚠️ Trampas conocidas

Lo que sigue abierto hoy. Las trampas que ya se cerraron están listadas en §12 como ✅,
con una línea de qué eran, para que nadie las reintroduzca.

### 9.1 Una sola cuenta compartida para todos los mayoristas

El catálogo distingue dos roles: `ADMIN` (panel) y `VIEWER` (ve precios). Hoy existe **una
única cuenta `VIEWER`** que se reparte por WhatsApp a todos los clientes mayoristas.

Consecuencias operativas: no se le puede cortar el acceso a un cliente puntual sin cambiarle
la contraseña a todos, y `AuthEvent` no permite saber qué empresa entró. Migrar a una cuenta
por cliente necesita un ABM de usuarios, que no existe. Es el ítem 6 del backlog.

### 9.2 Errores que se manifiestan como "0 resultados"

`timeout()` en `catalogo/todos/route.ts` resuelve con el fallback tanto por timeout como por
rechazo de la promesa. Ahora **loguea** el rechazo con la tabla afectada, así que el
diagnóstico es directo — pero la request sigue devolviendo `[]` para esa tabla, de forma
deliberada: es lo que evita que una tabla lenta tire abajo todo el catálogo.

Si ves un catálogo vacío o incompleto, **mirá los logs del servidor antes que el frontend**.
Busca `[catalogo/todos] query fallo en`.

### 9.3 Precios promediados sin normalizar

`firstPrice()` (`all-products.ts`) devuelve el primer valor no-cero de
`precioM2 → precioCaja → precio → precioTabla → precioMLineal → precioMl`. O sea: para un
producto es el precio por m², para otro el precio por caja. Encima **el campo `moneda` se
ignora**, y conviven `u$s` y pesos en la misma tabla.

`/api/productos/stats` y `/api/reportes/resumen` promedian eso. **Los "precio promedio por
categoría / por marca" del panel no son magnitudes comparables.** No tomes decisiones con
esos números hasta normalizar por unidad y moneda (ítem 8).

Ojo: esto es distinto del **orden** por precio, que sí está arreglado — `buildOrderBy()`
usa el campo correcto de cada tabla. Lo que sigue roto es promediar valores heterogéneos.

### 9.4 Caché y rate limit viven en memoria del proceso

`lib/catalog-cache.ts` y `lib/rate-limit.ts` usan un `Map` en scope de módulo.

- La caché **ya se invalida** en cada mutación de producto… pero solo en la instancia que
  atendió la escritura. En serverless las demás esperan al TTL de 60 s.
- El rate limit tiene el mismo problema y es peor: cada instancia cuenta por separado y se
  recicla seguido, así que el límite real es difuso.

Para que ambos funcionen de verdad hace falta un store compartido (Redis/Upstash). Es el
ítem 11 y es **el mismo arreglo para los dos**.

### 9.5 Paginación multi-categoría cara

En la vista "todas las categorías", cada una de las 8 tablas trae `skip + take` filas y el
merge se corta en memoria. En la página 50 son 8 queries de 765 filas por request.

El resultado es **correcto** (los N globales están garantizados dentro de la unión de los N
de cada tabla), pero el costo crece con la profundidad. Si el catálogo sigue creciendo, hay
que pasar a keyset pagination o a una vista materializada.

### 9.6 Un producto sin foto es invisible

El `where` del catálogo incluye `imagenes NOT NULL AND != '' AND != '[]'`. Es intencional
—una tarjeta sin imagen queda mal— pero sorprende: si cargás un producto y no aparece en
`/catalogo`, lo primero a revisar es si tiene imagen, no el filtro.

### 9.7 Uploads sin blob store configurado

Ver §8.5. Con el driver local, en Vercel los uploads devuelven **503 con un mensaje
explícito**. Ya no es un 500 mudo, pero **sigue sin funcionar** hasta que se elija un
proveedor. Es lo único de P0 que quedó abierto.

### 9.8 El lockfile está desincronizado a propósito

`package.json` cambió (se agregaron devDependencies y se quitaron 4 dependencias sin uso)
pero `package-lock.json` no se pudo regenerar, porque `xlsx` se resuelve desde
`cdn.sheetjs.com` y eso requiere red hacia ese host.

**Corré `npm install` una vez y commiteá el lockfile actualizado.** Hasta entonces `npm ci`
falla — por eso el workflow de CI usa `npm install`.

### 9.9 Detalles menores

- **Sin UI para 2FA ni cambio de contraseña.** Los cuatro endpoints
  (`/api/auth/2fa/{setup,enable,disable}` y `/api/auth/password`) están completos y bien
  hechos, pero ninguna pantalla los llama: hoy solo se usan con curl. Ítem 13.
- **Trampa con el secret**: `[...nextauth]/route.ts` acepta `NEXTAUTH_SECRET || AUTH_SECRET`,
  pero `lib/auth.ts` y `proxy.ts` leen **solo `NEXTAUTH_SECRET`**. Con solo `AUTH_SECRET`
  configurada el login anda y `/panel` redirige en loop. Ítem 22.
- **`next/image` consume cuota de optimización** en Vercel. El cambio de `<img>` crudo a
  `next/image` reduce muchísimo el ancho de banda al usuario, pero mové el ojo a la factura
  si el tráfico crece.
- El panel arranca con `tablaFilter = "pisos_flotantes"`, no con "todas".
- El reorder solo funciona con una categoría seleccionada: con el filtro en "Todas", `tabla`
  va vacío y el endpoint devuelve 400.

---

## 10. Código muerto

Se eliminó todo el que había (~1.940 líneas) en la tanda de arreglos:

| Archivo | Líneas | Qué era |
|---|---|---|
| `components/catalog/CategoryListing.tsx` | 555 de 769 | El componente `CategoryListing` no estaba montado en ninguna página. Sus exports **sí usados** (`ProductCard`, `EmptyState`, `CatalogItem`) se movieron a `components/catalog/ProductCard.tsx` |
| `components/admin/ProductModal.tsx` | 373 | Reemplazado por `QuickEditPanel` |
| `components/admin/ImportMasivaModal.tsx` | 337 | Reemplazado por `/panel/importacion` |
| `components/admin/ProductDetailModal.tsx` | 304 | Sin referencias |
| `components/admin/ImportPreviewModal.tsx` | 181 | Esperaba una forma de datos que el endpoint no devuelve (§8.4) |
| `components/admin/PriceChart.tsx` | 124 | `/panel/reportes` usa Recharts directo |
| `lib/auth-helpers.ts` | 33 | Cada handler repite el chequeo inline |
| `data/products.ts` | 26 | `products` era `[]` (§8.6) |

También se recortó `lib/catalog-public.ts` a solo su tipo: `enrichCatalogProduct`,
`sortCatalogProducts`, `isFeaturedSku` y un `PRODUCT_METADATA` con descripciones
hardcodeadas de 8 SKUs no se ejecutaban nunca.

Y se quitaron 4 dependencias sin un solo import: `@anthropic-ai/sdk`, `resend`,
`@next-auth/prisma-adapter`, `react-leaflet`.

**Queda vivo pero parcial:** `lib/google-drive.ts` — de sus 3 funciones solo se usa
`isRemoteImageUrl`. `react-is` sigue en `package.json`; probablemente sea un pin para
resolver Recharts, así que no lo toqué.

---

## 11. Infraestructura y repo

### Peso — sigue siendo el problema principal

| Qué | Tamaño |
|---|---|
| `.git` | **342 MB** |
| `public/` | **612 MB** (`public/productos/` 249 MB, `public/uploads/` 50 MB) |
| `assets/` | 47 MB |

Hay imágenes de producto de hasta 4 MB y videos (`gente.mov` 9 MB, MP4s de WhatsApp)
commiteados. `next/image` ya evita que se sirvan a tamaño completo, pero **siguen pesando en
el repo y en cada deploy**. Moverlos a un CDN es el ítem 23 y no lo toqué: implica decidir
proveedor y reescribir URLs.

### Migraciones — arregladas

`prisma/migrations/` ahora tiene una baseline SQLite real
(`00000000000000_init`, 14 tablas) generada con `prisma migrate diff --from-empty`.

Antes la única migración era `20260603230221_init_crm`: PostgreSQL puro
(`CREATE TYPE ... AS ENUM`, `UUID`, `TIMESTAMPTZ`) sobre un datasource `sqlite`, y del CRM
que ya se había removido. El schema de productos nunca había tenido migraciones — se venía
aplicando con `db push`.

⚠️ **En una base que ya tiene datos, marcá la baseline como aplicada antes de cualquier
`migrate deploy`:**

```bash
npx prisma migrate resolve --applied 00000000000000_init
```

Está documentado también en `prisma/migrations/00000000000000_init/README.md`.
`migration_lock.toml` ya declara `provider = "sqlite"`, y `prisma/migrations` salió de
`.vercelignore` para que viaje al deploy.

### `xlsx` desde CDN

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

Es la distribución **oficial y recomendada** por SheetJS (el paquete de npm está abandonado
con CVEs), así que la decisión es correcta. Costos reales: `npm install` falla en cualquier
entorno sin salida a `cdn.sheetjs.com`, la dependencia queda fuera de `npm audit`, y el
lockfile no se puede regenerar en esos entornos (§9.8).

### Lint, CI y tests

- `eslint.config.mjs` — flat config de Next 16 (`next/core-web-vitals` + `next/typescript`).
- `.github/workflows/ci.yml` — typecheck + lint + build en cada PR y en `main`.
- **Sigue sin haber tests.** Es el hueco más grande de tooling; ítem 30.

---

## 12. Backlog priorizado

### ✅ Cerrado en la tanda de arreglos

| # | Qué era |
|---|---|
| 1 | **Ordenar por precio vaciaba el catálogo**: solo `maderas` tiene el campo `precio`, las otras 7 usan `precioM2`. Ahora `buildOrderBy()` resuelve el campo por tabla, y la vista multi-categoría reordena el merge globalmente |
| 3 | **Los leads del chatbot no se guardaban** en ningún lado (§8.6) |
| 4 | **`/tienda` siempre vacía** y el bot derivaba ahí (§8.6) |
| 5 | **Import de accesorios perdía las imágenes**: mapeaba a `imagen` en vez de `imagenes` |
| 7 | **Campos fantasma**: `tipoDeProducto` (es `tipoProducto`) en los filtros y breadcrumbs, y `uso` en lugar de `tipoDeUso` en las specs de vinílicos |
| 9 | **Ventana invertida** en el reporte de importaciones: colapsaba todo en una sola sesión |
| 10 | **`detectSchema()` nunca fallaba**: una planilla desconocida se importaba entera como pisos flotantes |
| 12 | **`reorder` de un item reescribía la tabla entera** |
| 14 | **28 `@ts-nocheck`** que ocultaban 14 errores reales de tipos |
| 15 | **`src/types/index.ts`** duplicaba a mano los modelos y ya había divergido del schema |
| 16 | **Migraciones**: la única era de PostgreSQL sobre un datasource SQLite |
| 17 | **Mapas de tabla duplicados** en 4 endpoints |
| 18 | **`<img>` crudo** en el catálogo en vez de `next/image` |
| 19 | **Sin ESLint ni CI** |
| 20 | **~1.940 líneas de código muerto** y 4 dependencias sin usar |
| 21 | **`env.ts` no lo importaba nadie**, así que nunca validaba |
| 24 | Huérfanos `image-map.json` y `Diseños ABM productos_files/` |
| 25 | BOM UTF-8 en 14 archivos |
| 26 | `--brand-gray` mapeado al theme pero nunca definido |
| 27 | `prisma/seed.ts` sin cablear a `package.json` |
| 28 | `README.md` era el de `create-next-app` |
| 29 | Sin `robots.txt` ni `sitemap.xml` |
| — | El modal de import de `/panel` mostraba tablas vacías siempre (§8.4) |
| — | El rate limit del catálogo era 10 req/min, demasiado bajo para navegación normal |
| — | `/api/hero` no validaba magic bytes (sí lo hacía `/api/upload`) |

### 🔴 Abierto — P0

| # | Qué | Por qué sigue abierto |
|---|---|---|
| 2 | **Uploads a un blob store** (§8.5, §9.7) | Hay que elegir proveedor. La abstracción ya está: es un driver nuevo y una línea en `getStorage()` |

### 🟠 Abierto — P1

| # | Qué | Dónde |
|---|---|---|
| 6 | **Cuentas individuales por mayorista** en vez de una `VIEWER` compartida (§9.1). Necesita un ABM de usuarios | `lib/auth.ts`, nueva pantalla en `(admin)/panel/` |
| 8 | **Promedios de precio sin normalizar** (§9.3). Separar por moneda y unidad, o quitar el KPI | `api/productos/stats`, `api/reportes/resumen`, `lib/all-products.ts` |
| 11 | **Caché y rate limit a Redis/Upstash** (§9.4). Un solo arreglo cubre los dos | `lib/catalog-cache.ts`, `lib/rate-limit.ts`, `proxy.ts` |
| 13 | **UI para 2FA y cambio de contraseña** (§9.9). Los endpoints ya existen | nueva pantalla en `(admin)/panel/` |
| 22 | **Unificar el secret** entre `[...nextauth]`, `auth.ts` y `proxy.ts` (§9.9) | 3 archivos, 1 línea cada uno |
| 30 | **Tests.** No hay ninguno. Empezar por `sheet-schemas` (parseo de Excel), `all-products` (normalización) y `buildOrderBy` | — |

### 🟡 Abierto — P2 / P3

| # | Qué |
|---|---|
| 23 | Mover `public/` (612 MB) y `assets/` (47 MB) a un CDN; sacar los videos del repo (§11) |
| 31 | Paginación multi-categoría: pasar a keyset si el catálogo sigue creciendo (§9.5) |
| 32 | Correr `npm install` y commitear el lockfile actualizado (§9.8) |
| 33 | Volver fatal la validación de `env.ts` una vez verificado el entorno de producción |

## 13. Cómo se verificó este documento

| Qué | Cómo | Resultado |
|---|---|---|
| Compilación | `npx next build` con env dummy | ✅ 45 páginas prerenderizadas, sin warnings |
| Tipos | `npx tsc --noEmit` | ✅ **0 errores con 0 `@ts-nocheck`** |
| Campos fantasma | `grep` cruzado contra `prisma/schema.prisma` | 3 encontrados y corregidos |
| Código muerto | búsqueda de referencias por símbolo exportado | 8 archivos eliminados, 1 dividido |
| Baseline de migraciones | `prisma migrate diff --from-empty` | ✅ 14 tablas |
| Peso del repo | `du -sh` + `git ls-files \| xargs du` | §11 |
| Bugs de lógica | lectura del código contra el schema | corregidos por inspección |

### Lo que NO está verificado

- **Nada se ejecutó contra una base con datos.** No hubo acceso a Turso ni a una copia. Los
  arreglos de §12 están validados por typecheck y build, no por ejecución end-to-end. Antes
  de mergear conviene probar en staging: orden por precio, import de un Excel real, reorder,
  y el registro de un lead.
- **ESLint no se pudo correr.** La config está escrita pero requiere `npm install` (§9.8), y
  este entorno no tiene salida a `cdn.sheetjs.com`. La primera corrida puede sacar findings.
- **El driver de storage remoto no existe todavía** (§9.7), así que el camino de upload en
  Vercel no está probado — solo el fallo explícito.

### Mantenimiento de este documento

Actualizalo cuando cambies el schema, agregues o saques un endpoint, resuelvas un item del
backlog o elimines una trampa de §9. Un `project.md` desactualizado es peor que no tenerlo:
la gracia es que refleje el estado real, con lo feo incluido.
