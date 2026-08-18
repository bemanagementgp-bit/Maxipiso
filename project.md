# Maxipiso — documento de proyecto

> Estado real del repositorio, no el estado deseado. Todo lo que está acá fue verificado
> leyendo el código, el schema y el historial de git, y corriendo `next build` + `tsc`.
> Si algo no se pudo verificar, está marcado como tal.
>
> **Última verificación:** 2026-08-18 · commit base `a4a79d8` · Next.js 16.2.6 · build ✅

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
| TypeScript | 5.x | `strict: true` — pero ver §9, hay 28 archivos con `@ts-nocheck` |
| Tailwind CSS | v4 | vía `@tailwindcss/postcss`, sin `tailwind.config` |
| Prisma | 6.19.3 | `driverAdapters`, `engineType: library` |
| Base de datos | Turso / libSQL | provider `sqlite`, adapter `@prisma/adapter-libsql` |
| Auth | NextAuth v4 (`4.24.14`) | provider `credentials`, sesión **JWT**, TOTP opcional |
| LLM del chat | Groq | `llama-3.3-70b-versatile` con fallback a `llama-3.1-8b-instant` |
| Email | Resend | vía `fetch` a la REST API, sin SDK |
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

**No hay** `lint`, `test`, `typecheck` ni `db:seed` en `package.json`. Tampoco hay
config de ESLint ni workflows de CI. Ver §11.

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
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | sólo para el seed | `prisma/seed.ts` |

⚠️ **Trampa con el secret.** `src/app/api/auth/[...nextauth]/route.ts:6` acepta
`NEXTAUTH_SECRET || AUTH_SECRET`, pero `src/lib/auth.ts:20` y `src/proxy.ts:54` leen
**sólo `NEXTAUTH_SECRET`**. Si configurás únicamente `AUTH_SECRET`, el login parece
funcionar pero el middleware no puede decodificar el token y `/panel` redirige a login
en loop. Usá siempre `NEXTAUTH_SECRET`.

⚠️ **`src/lib/env.ts` no se usa.** Define un schema de Zod que valida todas las variables
y corta el boot en producción si falta algo — pero **ningún módulo lo importa**. Todos leen
`process.env` directo, así que ese fail-fast nunca se dispara. Además todavía valida
variables del CRM (`CRM_DATABASE_URL`, `CRM_DIRECT_URL`, `CRM_IP_HASH_SALT`) que ya no
existen en el código.

---

## 4. Mapa del repositorio

```
src/
├── app/
│   ├── (admin)/                    1.749 líneas — grupo de rutas del panel
│   │   ├── layout.tsx              shell del panel (sidebar, theme switcher)
│   │   └── panel/                  page (ABM) · hero · importacion · reportes
│   ├── api/                        3.279 líneas — todos los endpoints (§6)
│   ├── auth/login/                 login del panel → redirige a /panel
│   ├── catalogo/                   listado (561) · ficha [id] (537) · login (227)
│   ├── novedades/                  índice + 3 landings estáticas + [slug] SSG
│   ├── distribuidores/  empresa/  tienda/
│   ├── layout.tsx                  root layout: SessionProvider + ShellLayout
│   └── globals.css
├── components/
│   ├── admin/                      2.741 líneas (§10: casi la mitad es código muerto)
│   ├── catalog/                    1.150 líneas
│   ├── layout/                     Header · Footer · ShellLayout · ChatWidget · WhatsAppButton
│   ├── home/HeroCarousel.tsx
│   ├── distribuidores/DistributorMap.tsx
│   └── providers/SessionProvider.tsx
├── lib/                            2.197 líneas — la lógica de verdad (§5, §7)
├── data/                           contenido hardcodeado: novedades, distribuidores, products
├── types/                          tipos a mano (⚠️ divergen del schema, ver §9)
└── proxy.ts                        middleware: rate limit + autorización por ruta
prisma/
├── schema.prisma                   8 tablas de producto + auth + auditoría
├── seed.ts                         crea el admin inicial (no está cableado a npm)
└── migrations/                     ⚠️ una sola migración, y es de PostgreSQL (§11)
```

### Archivos huérfanos en la raíz

- `image-map.json` (14 KB) — sus instrucciones apuntan a `scripts/apply-image-map.js`,
  y `scripts/` está en `.gitignore` y ya no existe en el repo.
- `Diseños ABM productos_files/` (8,1 MB) — assets de un HTML de diseño que sí está
  gitignoreado. Queda el directorio sin su archivo.
- `assets/` (47 MB) — material de origen, no lo consume el build.

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
en `src/lib/all-products.ts` (`TABLE_KEYS`, `DB_NAMES`, `TABLE_LABELS`, `TABLE_CATEGORIA`),
pero varios endpoints redefinen su propio mapa local en vez de importarlo
(`import/route.ts`, `import/preview/route.ts`, `metadata-suggest/route.ts`,
`reorder/route.ts`, `[id]/toggle/route.ts`, `catalogo/[categoria]/route.ts`,
`catalogo/todos/route.ts`). Si agregás una categoría, hay que tocar los ocho.

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

El middleware aplica además un rate limit de **10 req/min por IP** sobre `/api/catalogo/*`
y `/api/contacto` (`proxy.ts:38-51`).

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
- `export const runtime = "nodejs"` está en casi todos (necesario por Prisma + libSQL).
  **Falta en `reorder/route.ts`** — funciona porque nodejs es el default, pero rompe la convención.
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
  en la clave. **No se invalida al editar** (§9).
- `timeout()` (12 s) envuelve cada query: si Turso tarda o la query falla, esa tabla devuelve
  `[]` y la request sigue. Es a la vez la red de seguridad y la causa de que ciertos errores
  se manifiesten como "0 productos" en vez de como un error (§9).

La ficha `/catalogo/[id]` es **server component**: resuelve el producto con `findProductById()`
(recorre las 8 tablas secuencialmente hasta el primer match), arma las specs con
`buildSpecsFromRow()` y muestra precios sólo si `getServerSession` devuelve sesión.

### 8.2 ABM de productos

`/panel` → `ProductTable` (listado + drag & drop de orden) + `QuickEditPanel` (formulario
lateral) + `HistorialModal` + `ImportPreviewModal`.

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

Dos caminos, con costos muy distintos:

- **Drag & drop dentro de una página** → manda todos los items de esa página con su nuevo
  `sortOrder` → el backend hace un `update` por item. Correcto.
- **"Mover a posición N"** → manda **un solo item** → `reorder/route.ts:49-77` hace un
  `findMany()` de **toda la tabla**, recalcula el orden completo y dispara un `update` por
  cada fila. En una tabla de 200 productos son 200 UPDATEs a Turso en un solo request.

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
- `parseRow()` traduce header → campo Prisma vía `fieldMap`; lo que no está en el mapa se descarta.
- El upsert es por `sku` **dentro de la tabla detectada**. SKUs duplicados en el mismo archivo:
  gana el primero, el resto se cuenta como omitido.

⚠️ El archivo se sube **dos veces** (una al preview, otra al import) y se re-parsea de cero.

### 8.5 Imágenes

`POST /api/upload` con `multipart/form-data` (`file` + `productId` opcional):
valida tamaño (5 MB), MIME declarado, **y los magic bytes reales del buffer**; escribe con un
nombre aleatorio de 16 bytes; verifica que el path resultante quede dentro del directorio de
uploads; y si vino `productId`, hace push de la URL al array `imagenes` del producto.

⚠️ **Escribe en `public/uploads/productos/` con `fs.writeFile`.** En Vercel el filesystem de
las funciones es de sólo lectura salvo `/tmp`, y además es efímero. Los 50 MB de
`public/uploads/` commiteados al repo sugieren que hoy las imágenes se suben en local y se
commitean a mano. Migrar a un blob store es P1 (§12).

Lo mismo aplica a `POST /api/hero`, que además acepta video (MP4/WebM hasta 50 MB) y —a
diferencia de `/api/upload`— **valida sólo el `Content-Type` declarado por el cliente, sin
chequear magic bytes**.

### 8.6 Chatbot "Nacho"

`ChatWidget` → `POST /api/chat` → Groq.

- El system prompt (≈100 líneas en `chat/route.ts:22`) define personalidad, catálogo,
  reglas de precio/stock/reclamos y cuándo derivar. Es la especificación comercial del bot;
  editarlo cambia el comportamiento sin tocar código.
- El body se valida con Zod (máx 30 mensajes, 2.000 chars c/u) y **se descartan los mensajes
  con `role: "system"` que mande el cliente** — defensa contra prompt injection del rol.
- El modelo responde JSON forzado (`response_format: json_object`) con
  `{ reply, waText, storeUrl, lead }`. `waText` se convierte en un link `wa.me` prellenado.
- `lead` (nombre / email / teléfono que el bot extrajo de la charla) se sanitiza y valida.

⚠️ **Los leads no se guardan en ningún lado.** El formulario previo al handoff
(`LeadHandoff` en `ChatWidget.tsx:357`) guarda los datos en `localStorage` y abre WhatsApp.
El comentario del componente todavía dice "sólo abre wa.me si `/api/crm/leads` responde OK",
pero **ese endpoint no existe**: el CRM se removió (ver `chat/route.ts:271`,
"CRM deshabilitado — integración removida"). Los datos de contacto sólo llegan al vendedor
dentro del texto del mensaje de WhatsApp.

⚠️ **`storeUrl: true` deriva a `/tienda`, que siempre está vacía.** `/tienda` (269 líneas)
lee `products` de `src/data/products.ts`, que es **`[]`**. Además `/tienda` no está enlazada
desde el header, el footer ni ninguna página — el chatbot es su única entrada.

---

## 9. ⚠️ Trampas conocidas

Leé esto antes de tocar nada. Son cosas que están mal hoy y que van a confundirte.

### 9.1 `@ts-nocheck` en 28 archivos

`tsc --noEmit` da **0 errores**, pero es un espejismo: 28 archivos (todos los de
`api/productos/*`, `api/reportes/*`, `api/hero`, `api/upload`, `lib/all-products.ts`, casi
todo `components/admin/`, `catalogo/[id]/page.tsx` y 3 páginas del panel) empiezan con
`// @ts-nocheck`. **Al quitarlos aparecen 16 errores reales.** Los importantes:

| Archivo | Error | Consecuencia |
|---|---|---|
| `api/productos/export/route.ts:42` | `p.imagenes` no existe en `NormalizedProduct` (es `p.imagen`) | La columna "Imagen" del Excel exportado sale vacía |
| `api/reportes/resumen/route.ts:29` | mismo campo fantasma | El KPI "productos con imagen" cuenta mal |
| `components/admin/ProductModal.tsx:5` | importa `Product` de `@/types`, que no lo exporta | El componente no compilaría (hoy no se usa, §10) |
| `catalogo/[id]/page.tsx:358` | pasa `SpecEntry[]` donde se espera `Record<string,string>` | |
| `api/productos/import/route.ts:144` | `existingRecord.id` sobre `{}` | Sólo tipado |

Regla: **no agregues `@ts-nocheck` nuevos.** Al tocar uno de esos archivos, sacalo y arreglá
lo que salte.

### 9.2 Campos que no existen en el schema

Hay tres nombres de campo usados en el código que **no existen en Prisma**:

- **`tipoDeProducto`** (el real es `tipoProducto`). Aparece en
  `api/catalogo/[categoria]/route.ts:35` y `:66` como filtro declarado, y en
  `catalogo/[id]/page.tsx:135,142,216,220` construyendo links de breadcrumb.
  En `/catalogo` el filtro se ignora en silencio; en `/api/catalogo/[categoria]` reventaría.
- **`uso` en `pisoVinilico`** (el real es `tipoDeUso`). `all-products.ts:372`
  (`TABLE_FIELDS.pisoVinilico`) lo lista, así que **la spec "Uso" nunca se muestra en pisos
  vinílicos**.
- **`imagen` en el esquema de import de accesorios** (el real es `imagenes`).
  `sheet-schemas.ts`, bloque `accesorios`: Prisma rechaza la fila y se cuenta como omitida,
  o sea **los accesorios importados por Excel se quedan sin imagen**.

### 9.3 Los tipos de `src/types/index.ts` divergen del schema

Están escritos a mano y **no se generan** desde Prisma. Divergencias detectadas:
`Revestimiento`, `Deck`, `Madera` y `Accesorio` declaran `imagen?: string`, pero en Prisma
las cuatro tablas tienen **`imagenes`**. Además no existe ningún tipo `Product` exportado,
aunque `ProductModal.tsx` lo importe.

**Usá los tipos generados por Prisma (`@prisma/client`), no estos.**

### 9.4 Errores que se manifiestan como "0 resultados"

`timeout()` en `catalogo/todos/route.ts:21` resuelve con el fallback **tanto por timeout como
por rechazo de la promesa**. Cualquier query mal formada devuelve `[]` sin loguear nada.

El caso vivo: **ordenar por precio vacía el catálogo.** `sortBy=precio-menor|precio-mayor`
genera `orderBy: [{ precio: ... }]`, pero **sólo `Madera` tiene el campo `precio`**; las otras
7 usan `precioM2`. Prisma rechaza esas 7 queries, `timeout()` las convierte en `[]`, y el
usuario ve "0 productos" sin ningún error.

Si estás debuggeando un catálogo vacío, empezá por acá.

### 9.5 La ventana de "sesiones de importación" está invertida

`api/reportes/importaciones/route.ts:26-42` ordena los logs `fechaCambio: desc` (más nuevo
primero) pero después chequea `log.fechaCambio >= ventanaFin`, donde
`ventanaFin = ventanaInicio + 10 min` y `ventanaInicio` es el **más nuevo**. Como todos los
siguientes son más viejos, la condición nunca se cumple y **las 200 entradas colapsan en una
sola "sesión"**. El panel de importación siempre muestra una única sesión con el total.

### 9.6 Precios promediados sin normalizar

`firstPrice()` (`all-products.ts:134`) devuelve el primer valor no-cero de
`precioM2 → precioCaja → precio → precioTabla → precioMLineal → precioMl`. O sea: para un
producto es el precio por m², para otro el precio por caja. Encima **el campo `moneda` se
ignora**, y conviven `u$s` y pesos en la misma tabla.

`/api/productos/stats` y `/api/reportes/resumen` promedian eso. **Los "precio promedio por
categoría / por marca" del panel no son magnitudes comparables.** No tomes decisiones con esos
números hasta normalizar por unidad y moneda.

### 9.7 Caché sin invalidación

`catalogo/todos` y `catalogo/[categoria]` mantienen un `Map` en memoria con TTL de 60 s.
No se invalida al guardar un producto, y en serverless cada instancia tiene el suyo:
después de editar en el panel, el cambio puede tardar hasta un minuto **y aparecer distinto
según qué instancia atienda la request**.

### 9.8 El rate limit no funciona en producción

`src/lib/rate-limit.ts` y `src/proxy.ts` usan un `Map` en memoria del proceso. En Vercel cada
instancia tiene el suyo y se reciclan seguido: el límite ni se comparte ni sobrevive. El
propio archivo lo dice ("para multi-instancia usar Redis/Upstash"). Y al revés, el límite de
10 req/min sobre `/api/catalogo` es **demasiado bajo** para navegación normal con búsqueda
debounced y filtros — genera 429 a usuarios legítimos.

### 9.9 Otros detalles que confunden

- **14 archivos tienen BOM UTF-8** (`﻿`) al inicio, antes del `// @ts-nocheck`.
  Al editarlos, no lo borres accidentalmente ni lo agregues a archivos nuevos.
- `globals.css:13` mapea `--color-brand-gray: var(--brand-gray)`, pero **`--brand-gray` nunca
  se define**. La variable que sí existe es `--brand-dark`, y no está mapeada al theme.
  `bg-brand-gray` no resuelve a nada.
- La paginación multi-categoría de `catalogo/todos` pide `skip + take` filas **a cada una de
  las 8 tablas** y corta en memoria. En la página 50 son 8 queries de 765 filas por request.
- El panel arranca con `tablaFilter = "pisos_flotantes"`, no con "todas".

---

## 10. Código muerto

Verificado por búsqueda de referencias en todo `src/`. **~1.940 líneas** que no se ejecutan:

| Archivo | Líneas | Por qué está muerto |
|---|---|---|
| `components/catalog/CategoryListing.tsx` | 769 | No se importa en ninguna página. Es el único consumidor de `/api/catalogo/[categoria]`, así que **ese endpoint también está huérfano** |
| `components/admin/ProductModal.tsx` | 373 | Reemplazado por `QuickEditPanel`. Además no compilaría sin `@ts-nocheck` (§9.1) |
| `components/admin/ImportMasivaModal.tsx` | 337 | Reemplazado por `ImportPreviewModal` + `/panel/importacion` |
| `components/admin/ProductDetailModal.tsx` | 304 | Sin referencias |
| `components/admin/PriceChart.tsx` | 124 | `/panel/reportes` usa Recharts directo |
| `lib/auth-helpers.ts` | 33 | `requireAuth` / `requireAdminAuth` no se usan; cada handler repite el chequeo inline |

Parcialmente muerto:

- `lib/catalog-public.ts` — sólo se importa **el tipo** `CatalogPublicProduct`. Las funciones
  (`enrichCatalogProduct`, `sortCatalogProducts`, `isFeaturedSku`), el `PRODUCT_METADATA`
  hardcodeado de 8 SKUs y `FEATURED_PRODUCT_SKUS = []` no se ejecutan nunca.
- `data/products.ts` — `products` es `[]`; sólo `CATEGORIES` se usa (§8.6).
- `lib/google-drive.ts` — de sus 3 funciones sólo se usa `isRemoteImageUrl`.
- `chat/route.ts` — `hashIp()` y `normalizePhone()` no se llaman; `getClientIp` se importa sin usar.

Dependencias en `package.json` que no se importan en ningún lado:
**`@anthropic-ai/sdk`**, **`resend`** (contacto usa `fetch` directo),
**`@next-auth/prisma-adapter`** (nunca se configura adapter), **`react-leaflet`**
(se usa `leaflet` a pelo), **`react-is`**.

---

## 11. Infraestructura y repo

### Peso

| Qué | Tamaño |
|---|---|
| `.git` | **341 MB** |
| `public/` | **612 MB** (de los cuales `public/productos/` 249 MB y `public/uploads/` 50 MB) |
| `assets/` | 47 MB |
| Archivos trackeados | 2.783 |

Hay imágenes de producto de hasta 4 MB y videos (`gente.mov` 9 MB, MP4s de WhatsApp)
commiteados. **Y se sirven sin optimizar**: `components/catalog/SafeImage.tsx` usa un `<img>`
crudo en vez de `next/image`, así que el navegador se baja el original a tamaño completo.
La config de `images.remotePatterns` en `next.config.ts` casi no se aprovecha.

### Migraciones de Prisma: rotas

`prisma/migrations/` tiene **una sola migración**, `20260603230221_init_crm`, y es
**PostgreSQL puro** (`CREATE TYPE ... AS ENUM`, `UUID`, `TIMESTAMPTZ`) — restos del CRM que
ya se removió. El datasource actual es **`sqlite`** (Turso).

**No existe ninguna migración del schema de productos.** Las 8 tablas viven sólo en
`schema.prisma` y se aplicaron con `prisma db push`. Consecuencias:

- `prisma migrate dev` / `deploy` **no corren** contra este repo.
- No hay historial de cambios de schema ni forma de reproducir la base desde cero.
- `prisma/migrations` está listado en `.gitignore` **y sin embargo trackeado** (se agregó
  antes de la regla).

Mientras esto siga así, los cambios de schema se aplican con `db push` y hay que coordinarlos
a mano entre dev y producción.

### `xlsx` desde CDN

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

Es la distribución **oficial y recomendada** por SheetJS (el paquete de npm está abandonado
con CVEs abiertos), así que la decisión es correcta. Pero tiene costos reales:
`npm install` falla en cualquier entorno con registry restringido o sin salida a
`cdn.sheetjs.com` (pasa en CI y en sandboxes), la dependencia queda fuera de `npm audit`, y
no hay verificación de integridad en el lockfile.

### Sin lint, sin tests, sin CI

- No hay `eslint.config.*` ni `.eslintrc*`, aunque el código tiene `eslint-disable-next-line`
  en 10 lugares (o sea: existió y se borró, o nunca se configuró).
- `package.json` sólo tiene `dev`, `build`, `start`, `postinstall`.
- No hay `.github/workflows/`.
- `prisma/seed.ts` existe y funciona, pero no está declarado (`prisma.seed` en `package.json`)
  ni tiene script. Se corre a mano con `tsx`/`ts-node`.

### `.vercelignore`

Excluye del deploy: `dump.sql`, `node_modules`, `imagenes-sku`, `.next`, `scripts`,
`prisma/migrations`, `*.bak`.

---

## 12. Backlog priorizado

Cada item incluye dónde tocar. El orden es por relación impacto/esfuerzo.

### P0 — rompen funcionalidad visible al usuario

| # | Qué | Dónde |
|---|---|---|
| 1 | **Ordenar por precio vacía el catálogo.** Normalizar a un campo de orden común (columna calculada o `orderBy` por tabla) y dejar de tragar el error | `api/catalogo/todos/route.ts` (`sortBy`) + `lib/all-products.ts` (`timeout`) |
| 2 | **Los uploads no persisten en Vercel.** Migrar a Vercel Blob / S3 / Cloudinary | `api/upload/route.ts`, `api/hero/route.ts` |
| 3 | **Los leads del chatbot no se guardan.** Definir destino (tabla nueva, email a ventas, o CRM) y persistirlos antes de abrir WhatsApp | `components/layout/ChatWidget.tsx:357`, `api/chat/route.ts:271` |
| 4 | **`/tienda` siempre vacía** y el bot deriva ahí. O conectarla a la DB, o sacar `storeUrl` del prompt y del handler | `data/products.ts`, `app/tienda/page.tsx`, `api/chat/route.ts:261` |
| 5 | **Import de accesorios pierde las imágenes** (`imagen` → `imagenes`) | `lib/sheet-schemas.ts`, bloque `accesorios` |

### P1 — corrección de datos y operación

| # | Qué | Dónde |
|---|---|---|
| 6 | **Cuentas individuales por mayorista** en vez de una `VIEWER` compartida. Habilita revocar acceso y auditar por cliente | `lib/auth.ts`, `prisma/schema.prisma`, ABM de usuarios (no existe) |
| 7 | **Campos fantasma** `tipoDeProducto` y `uso` (§9.2) | `api/catalogo/[categoria]/route.ts:35,66`, `catalogo/[id]/page.tsx:135,142,216,220`, `lib/all-products.ts:372` |
| 8 | **Promedios de precio sin normalizar** (§9.6). Como mínimo, separar por moneda y por unidad, o quitar el KPI | `api/productos/stats`, `api/reportes/resumen`, `lib/all-products.ts:134` |
| 9 | **Ventana invertida en "sesiones de importación"** (§9.5) | `api/reportes/importaciones/route.ts:26-42` |
| 10 | **`detectSchema()` nunca falla**: con score 0 cae a pisos flotantes y se importa todo mal. Exigir score mínimo y rechazar | `lib/sheet-schemas.ts:302` |
| 11 | **Rate limit y caché a Redis/Upstash** (§9.7, §9.8). Y subir el límite de `/api/catalogo` | `lib/rate-limit.ts`, `proxy.ts`, `api/catalogo/*` |
| 12 | **`reorder` de un item reescribe la tabla entera** (§8.3). Recalcular sólo el rango afectado | `api/productos/reorder/route.ts:49-77` |
| 13 | **Sin UI para 2FA ni cambio de contraseña** (§6). Los endpoints ya existen y funcionan | falta una pantalla en `(admin)/panel/` |

### P2 — deuda técnica

| # | Qué |
|---|---|
| 14 | **Sacar los 28 `@ts-nocheck`** y arreglar los 16 errores (§9.1). Hacerlo archivo por archivo, no de una |
| 15 | **Generar los tipos desde Prisma** y borrar `src/types/index.ts` (§9.3) |
| 16 | **Migraciones**: descartar `init_crm`, generar la baseline real del schema SQLite, sacar `prisma/migrations` del `.gitignore` (§11) |
| 17 | **Centralizar los mapas de tabla** en `lib/all-products.ts` y borrar las 7 copias locales (§5) |
| 18 | **`next/image` en el catálogo** en vez de `<img>` crudo, y recomprimir `public/productos/` (§11) |
| 19 | **ESLint + `npm run typecheck` + CI** en GitHub Actions (§11) |
| 20 | **Borrar el código muerto** (~1.940 líneas) y las 5 dependencias sin usar (§10) |
| 21 | **Usar `lib/env.ts`** (importarlo en el arranque) o borrarlo; y limpiar las variables del CRM (§3) |
| 22 | **Unificar el secret**: que `[...nextauth]`, `auth.ts` y `proxy.ts` lean la misma variable (§3) |

### P3 — higiene

| # | Qué |
|---|---|
| 23 | Mover `public/` (612 MB) y `assets/` (47 MB) a un CDN; sacar los videos del repo |
| 24 | Borrar `image-map.json` y `Diseños ABM productos_files/` (huérfanos, §4) |
| 25 | Quitar los BOM UTF-8 de los 14 archivos (§9.9) |
| 26 | Definir `--brand-gray` o borrar el mapeo roto en `globals.css:13` |
| 27 | Cablear `prisma/seed.ts` a `package.json` (`prisma.seed` + script) |
| 28 | Reescribir el `README.md`, que sigue siendo el de `create-next-app` |
| 29 | Agregar `robots.txt` y `sitemap.xml` (no existen) |

---

## 13. Cómo se verificó este documento

| Qué | Cómo | Resultado |
|---|---|---|
| Compilación | `npx next build` con env dummy | ✅ compila; 43 páginas prerenderizadas, sin warnings |
| Tipos (estado actual) | `npx tsc --noEmit` | ✅ 0 errores |
| Tipos (sin `@ts-nocheck`) | quitando la directiva en los 28 archivos y recompilando | ❌ **16 errores** (§9.1) |
| Campos fantasma | `grep` cruzado contra `prisma/schema.prisma` | 3 confirmados (§9.2) |
| Código muerto | búsqueda de referencias por basename en todo `src/` | 6 módulos + 5 deps (§10) |
| Peso del repo | `du -sh` + `git ls-files \| xargs du` | §11 |
| Bugs de lógica (§9.4, §9.5, §8.3) | lectura del código contra el schema | confirmados por inspección, **no ejecutados contra una base real** |

Lo único que **no** se pudo verificar en runtime es el comportamiento contra Turso: no hubo
acceso a una base con datos. Los bugs de §9.4, §9.5 y §8.3 están confirmados leyendo el
código y el schema, pero no reproducidos end-to-end.

### Mantenimiento de este documento

Actualizalo cuando cambies el schema, agregues o saques un endpoint, resuelvas un item del
backlog o elimines una trampa de §9. Un `project.md` desactualizado es peor que no tenerlo:
la gracia es que refleje el estado real, con lo feo incluido.
