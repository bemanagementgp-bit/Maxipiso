# Maxipiso — documento de proyecto

> Estado real del repositorio, no el estado deseado. Todo lo que está acá fue verificado
> leyendo el código, el schema y el historial de git, y corriendo `next build` + `tsc`.
> Si algo no se pudo verificar, está marcado como tal.
>
> **Última verificación:** 2026-08-18 · Next.js 16.2.6 · build ✅ · typecheck ✅ (0 errores, **0 `@ts-nocheck`**)
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
| `CLOUDINARY_URL` | **sí en Vercel** | storage de imágenes, formato del dashboard: `cloudinary://<key>:<secret>@dnaom2evd` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | alternativa | las tres separadas; tienen prioridad sobre `CLOUDINARY_URL`. Sin nada, los uploads caen al disco local (§8.5) |
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
│   │   └── panel/                  page (ABM) · importacion · reportes
│   ├── api/                        3.481 líneas — todos los endpoints (§6)
│   ├── auth/login/                 login del panel → redirige a /panel
│   ├── catalogo/                   listado (561) · ficha [id] (537) · login (227)
│   ├── novedades/                  índice + 3 landings estáticas + [slug] SSG
│   ├── distribuidores/  empresa/
│   ├── tienda/                     redirect permanente a /catalogo (§8.7)
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
└── migrations/                     baseline SQLite + drop de hero_media
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
- `Lead` — contactos que captura el chatbot antes de derivar a WhatsApp (§8.7).
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
- `/api/upload`, `/api/productos/{import,export,plantilla,stats,metadata-suggest}`
  y `/api/reportes/*` → 401 si no es `ADMIN`.
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

#### Navegación y estado de la vista

Toda la vista vive en la query string (`categoria`, `search`, `filtros[...]`, `orden`, `page`),
así que cualquier combinación es compartible por link y sobrevive a un refresh. El componente
la lee al montar y la reescribe cuando cambia el estado; `construirUrl()` está fuera del
componente justamente para que el efecto que escribe y el que lee produzcan el mismo string
carácter por carácter — si difirieran, cada lectura dispararía una escritura y se ensuciaría
el historial.

- **La URL se escribe con `history.pushState` / `replaceState`, no con `router.push`.** El App
  Router soporta la History API nativa y sincroniza `useSearchParams` solo, sin pedirle el RSC
  payload al servidor en cada click. Con `router.push` la URL directamente dejaba de
  actualizarse en el build de producción.
- Paginar, filtrar, ordenar o cambiar de categoría **apilan** entrada de historial: el botón
  atrás recorre el catálogo en vez de salir del sitio de una. Escribir en el buscador usa
  `replace`, porque si no cada tecleo dejaría una entrada basura.
- **Caché de resultados en scope de módulo** (`snapshotCache`, tope 40 entradas, clave
  `auth|anon` + query). Al volver de una ficha el componente se remonta y perdía todo: se veía
  el skeleton y se reconsultaban las 8 tablas. Ahora se pinta desde el snapshot al instante y
  se revalida en silencio.
- **Prefetch de la página siguiente** sobre ese mismo caché, 400 ms después de que la vista
  actual terminó de cargar. "Siguiente" pinta sin esperar red.
- La grilla **no se blanquea** al paginar o filtrar: queda atenuada con `aria-busy` mientras
  llega la respuesta. El skeleton aparece sólo cuando no hay nada previo que mostrar.
- **Restauración de scroll.** La altura se anota en el `click` sobre la ficha, no en el evento
  de scroll: Next sube la página al tope antes de desmontar el catálogo, y ese scroll pisaba el
  valor guardado con un 0. Se reaplica recién cuando la grilla ya está pintada, reintentando
  unos frames porque el documento todavía está creciendo.

> El bug original —"volvés de un producto y estás de nuevo en la página 1"— no era el caché ni
> el scroll: era un `useEffect` que forzaba `page = 1` al cambiar el orden y que **también
> corría en el montaje**, pisando la página que traía la URL. El guard con `useRef` es el fix;
> lo demás es lo que hace que la vuelta se sienta instantánea.

#### Imágenes en el ABM

Las imágenes ya guardadas y los archivos que todavía no se subieron viven en **una sola
lista ordenada** (`ImagenItem`). Antes el archivo nuevo estaba en un estado aparte
(`imageFile`), y de ahí salían dos limitaciones que se sentían como bugs: sólo entraba una
imagen por guardado, y la recién elegida no se podía mover, así que para dejarla de portada
había que guardar, cerrar el popup y volver a abrirlo.

Con la lista unificada, mover / quitar / "usar como principal" funcionan igual sobre una
guardada que sobre una pendiente. **El orden que se ve es el que se guarda**: al guardar se
suben los pendientes en ese orden y cada uno ocupa su lugar. La primera es la portada.

`public/uploads/` está **ignorado por git**. En producción los uploads van a Cloudinary; el
driver local sólo corre en tu máquina y esos archivos son descartables. Estuvieron
versionados hasta que se comprobó contra producción (`/api/storage/diagnostico`) que ningún
producto los referenciaba: eran 50 MB que viajaban en cada clone y cada build. Ojo que
borrarlos **no achicó el `.git`** — los blobs siguen en el historial, y bajar esos 344 MB
requiere reescribirlo entero.

**Los archivos conservan su nombre**, porque en este catálogo el nombre del archivo *es* el
SKU (`14704-1.jpg`, `20308-2.jpg`): así la imagen queda ubicable en Cloudinary por el mismo
código con el que se busca el producto. El nombre llega del cliente, así que
`nombreSeguro()` lo trata como entrada no confiable: descarta cualquier componente de
directorio, saca los acentos y reemplaza todo lo que no sea letra, número, guion o guion
bajo — eso elimina de raíz las barras (que en Cloudinary crearían carpetas) y los puntos
(que darían `..`). Si no queda nada utilizable, cae al sha256 del contenido.

**Subir un archivo con el mismo nombre reemplaza la imagen anterior.** Es lo esperable
cuando el nombre identifica al producto, y de paso resuelve el problema que había: antes
cada subida generaba un nombre al azar, así que subir la misma foto dos veces creaba dos
archivos. Así fue como `public/uploads` terminó con 23 archivos de los cuales sólo 3 eran
imágenes distintas. En Cloudinary hace falta mandar `public_id` explícito, porque si no
ignora el nombre del archivo y genera uno aleatorio.

#### Sugerencias en los campos de texto

`GET /api/productos/valores?tabla=…` devuelve los valores ya usados en cada campo de texto de
esa categoría, y el ABM los ofrece en un combo con búsqueda. **No es un select**: se puede
escribir un valor nuevo, y la lista avisa cuando lo tipeado no coincide con ninguno.

El problema que resuelve es de datos: los filtros del catálogo se arman con los valores
distintos que hay en la tabla, así que "Max Core", "MaxCore" y "max core" aparecen como tres
marcas y el filtro queda inservible. Se descartan los campos propios de cada producto (`sku`,
`nombre`, `especie`, `codigo`, `descripcion`, fichas) y los que superan 200 valores distintos,
que son campos libres disfrazados. Cache de 60 s por tabla.

### 8.2 bis Precios y stock — `/panel/precios`

Grilla editable para actualizar listas de precios sin abrir producto por producto.
La regla de fondo: **nada toca la base hasta que se aprieta Guardar.** Editar una celda,
aplicar un aumento del 12% o redondear escribe en un buffer de cambios pendientes que se ve
en amarillo sobre la grilla, así se pueden encadenar operaciones (aumentar → redondear →
corregir tres filas a mano), revisar el total y recién ahí impactarlo en una sola request.

- Edición inline con teclado (Enter y flechas mueven entre filas, Escape revierte la celda).
  Se acepta coma o punto como separador decimal, porque en la práctica se pega de planillas.
- **Las columnas se arman según las categorías visibles**, y cada celda se habilita sólo
  donde la columna existe. Las 8 tablas no comparten los campos: `maderas` tiene `precio` a
  secas, `revestimientos` usa `precioMl` y `decks` `precioMLineal` para lo mismo, y
  **`accesorios` no tiene ningún precio ni moneda, sólo `stock`**. Todo eso se deriva de
  `lib/price-fields.ts`, que lo saca de `CATEGORY_CONFIGS` en vez de repetir la lista.
- Operaciones en lote sobre la selección: porcentaje, redondeo (entero / decena / centena /
  millar / terminación 99), fijar o sumar stock, y cambiar moneda con conversión opcional por
  cotización. Las categorías sin campos de precio se omiten con aviso de cuántas fueron.
- Los pendientes sobreviven al cambio de página y de filtro: se puede editar en varias
  páginas y guardar todo junto.

#### Detección de moneda

Las filas sin `moneda` cargada muestran una sugerencia deducida del precio: **por encima
de $300 es ARS, por debajo es USD**. Un piso importado ronda los 20-60 dólares el m² y el
mismo piso en pesos está en decenas de miles, así que no hay zona gris entre las dos escalas.

Dos decisiones que importan:

- **Qué precio se mira.** Se usa el precio unitario, en este orden: `precioM2` → `precio` →
  `precioTabla` → `precioMLineal` → `precioMl` → `precioCaja`. Mirar el más grande daría
  falsos positivos: una fila puede tener `precioM2 = 50` (USD) y `precioCaja = 1200` (USD,
  la caja rinde 24 m²). **`precioEnvioCaja` queda afuera**: es un flete, no el precio del
  producto, y su magnitud no dice nada de la moneda.
- **Nunca pisa una moneda elegida a mano.** Sólo completa lo vacío. Sí recalcula la que puso
  la propia deducción: si se tipea 52000 (→ ARS) y después se corrige a 48, pasa a USD. En
  cuanto alguien toca el select, esa fila deja de recalcularse.

La sugerencia se aplica con un click en el chip de la celda, o en lote para toda la página /
la selección. Como todo en esta pantalla, entra como cambio pendiente y no toca la base
hasta Guardar.

> El importador **ya mapea `moneda`** en las 7 categorías que la tienen (`lib/sheet-schemas.ts`),
> y `cleanRow()` la preserva. O sea que si el Excel la trae, debería estar en la base; la
> deducción es para las filas que quedaron sin ella. El preview de importación muestra, por
> cada columna del archivo, a qué campo mapea o si se ignora — ahí se verifica en un vistazo.

`GET /api/productos/precios` hace `select` sólo de lo que se muestra — `/api/productos`
devuelve la fila entera y trae 2.000 registros por tabla. `PATCH` aplica hasta 500 cambios por
request, valida campo por campo contra la config de esa tabla (el mismo chequeo que evita
mandarle a Prisma una columna inexistente, §9.x `garantia`), acota importes y stock, redondea
a dos decimales y escribe un `changeLog` por campo — que es lo que alimenta el reporte de
precio histórico. Devuelve el detalle de lo que falló, y esos productos quedan pendientes en
pantalla en vez de perderse.

### 8.2 ABM de productos

`/panel` → `ProductTable` (listado + drag & drop de orden) + `QuickEditPanel` (formulario
lateral) + `HistorialModal`.

- Los campos del formulario **no están hardcodeados por página**: salen de
  `src/lib/category-fields.ts` (`CATEGORY_CONFIGS`), que define por tabla qué campos existen,
  su tipo, cuáles se ven en la grilla (`gridVisible`) y cuáles son obligatorios.
- El backend usa **la misma config** como whitelist: `sanitizeProductData()` en
  `productos/route.ts:22` y `productos/[id]/route.ts:22` descarta cualquier clave que no esté
  en `config.fields`.

> ⚠️ **`category-fields.ts` tiene que coincidir exactamente con el schema, en los dos
> sentidos.** Una columna de Prisma que falta en la config no se puede editar y el backend la
> ignora en silencio. Y al revés: una clave en la config que **no** existe en ese modelo llega
> a Prisma como columna inexistente y **rompe el guardado con un 500**.
>
> Pasaba con `garantia`: estaba dentro de `FICHA_FIELDS`, que se esparce en casi todas las
> categorías, pero la columna solo existe en `PisoFlotante`, `Porcellanato`, `PisoVinilico` y
> `PisoMadera`. En **revestimientos, decks y maderas** el formulario mostraba un campo
> "Garantía" que al llenarlo tiraba el update entero. Ahora `garantia` vive aparte
> (`GARANTIA_FIELD`) y se agrega solo a esas cuatro.
>
> Al tocar el schema, revisá las dos direcciones. Hoy están al día: **las 8 categorías tienen
> el 100% de sus columnas editables y ninguna clave fantasma.**
- Cada `PUT` genera un `ChangeLog` **por campo modificado**, en un loop de creates secuenciales
  (`[id]/route.ts:148-172`) — no está batcheado.
- El borrado es **soft**: `isActive = false`. No hay borrado físico en ninguna parte.
- Las **unidades de medida** (`espesorUm`, `anchoUm`, `largoUm`, `baseUm`, `baseTablUm`,
  `espesorTotalUm`, `espesorComposicionUm`, `espesorLaminaUm`) son campos editables. Son las
  que hacen que el catálogo muestre "12 mm" y no "12" (§5).
- El badge de **Estado es un botón**: llama a `POST /api/productos/[id]/toggle` y activa o
  desactiva en un click, en las dos vistas de la tabla. Si el nuevo estado no entra en el
  filtro activo, la tabla recarga; si entra, se parchea la fila sin refetch.

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

El destino se elige en `getStorage()`: **Cloudinary** si hay credenciales, y disco local si
no. Se aceptan las dos formas — `CLOUDINARY_URL` en el formato que entrega el dashboard
(`cloudinary://<key>:<secret>@<cloud>`), o las tres variables separadas, que tienen prioridad
para poder sobreescribir una sola. En Vercel, sin configurarlas, los uploads responden **503 con un mensaje
accionable** en lugar de un 500 mudo.

**Cloudinary** (`src/lib/cloudinary.ts`) se implementó sobre `fetch`, sin el SDK oficial: la
API de upload es un POST multipart con firma SHA-1 y evitar la dependencia mantiene chico el
árbol de npm, que en este proyecto es frágil (§11, `xlsx` desde CDN). El upload es **firmado
desde el servidor**, no con un unsigned preset: un preset sin firma permitiría que cualquiera
que lo descubra suba archivos a la cuenta. Los archivos van a `maxipiso/<carpeta>/`.

Se eligió Cloudinary porque **la cuenta ya existía** (`dnaom2evd`): los dos videos del home ya
se sirven desde ahí. No hubo que dar de alta ningún proveedor.

**Transformaciones.** `SafeImage` detecta las URLs de Cloudinary y les pasa un `loader` propio
de `next/image`, que inyecta `f_auto,q_auto,c_limit,w_<ancho>` por cada entrada del srcset. El
formato lo negocia el navegador (WebP/AVIF) y la calidad la elige Cloudinary: sobre un JPG sin
optimizar eso recorta cerca del 90% del peso. Además no pasa por el optimizador de imágenes de
Vercel, que se cobra aparte. Las imágenes locales de `public/` siguen el camino normal de Next.

**Alta por URL.** El panel también permite agregar una imagen pegando su **ruta o URL**
(`/14704-1.jpg`, o https de un host permitido), además de reordenarlas y quitarlas. Sirve para
las imágenes que ya están en `public/` y no depende del storage. Los hosts válidos salen de
**`src/lib/image-hosts.ts`**, que es la única fuente: alimenta `images.remotePatterns`, el
`img-src` del CSP y la validación del panel, así que no puede pasar que el admin guarde una URL
que después `next/image` rechaza.

**No hay que migrar nada.** `imagenes` es un array de URLs: las nuevas van a Cloudinary y las
viejas siguen siendo rutas de `public/`. Conviven.

#### Diagnóstico del storage

`GET /api/storage/diagnostico` (sólo ADMIN) responde en un paso qué driver está
activo, de qué variable salió la config (`CLOUDINARY_URL` o las tres separadas) y si
las credenciales sirven, haciendo un `ping` con Basic auth contra Cloudinary.

Nace de un caso real: un upload devolvía `Invalid Signature` y no había forma de saber,
desde afuera del servidor, si el problema era la credencial, el formato de la variable o
cómo se arma la firma. **No devuelve el `api_secret`**: de la key van los últimos 4
dígitos y del secret sólo el largo, que alcanza para detectar el error más común, un valor
pegado a medias.

Sólo un **401** se interpreta como credencial inválida — es lo que devuelve el Basic auth
de Cloudinary. Un `status: 0` es que la request ni salió, y cualquier otro código puede
venir de un proxy en el medio; en esos casos se muestra la respuesta cruda en vez de
inventar un diagnóstico.

> Sobre `Invalid Signature`: el error de Cloudinary incluye la cadena que esperaba firmar.
> Si esa cadena coincide con la que arma `sign()` —`folder=...&timestamp=...`, ordenada
> alfabéticamente— entonces la firma se construye bien y lo que no coincide es el
> `api_secret`. Es el atajo para no perder tiempo revisando el algoritmo.

### 8.6 Hero de la home — eliminado

`HeroCarousel` renderiza un único video de fondo (`res.cloudinary.com`, hardcodeado).

Antes era un carrusel administrable: leía `hero_media` vía `GET /api/hero` y se cargaba
desde `/panel/hero`. Se eliminó por completo — página del panel, entrada del nav, endpoint,
modelo Prisma y la tabla. **El motivo es que nunca funcionó en producción**: el upload
escribía con `fs.writeFile` sobre `public/uploads/hero`, que en Vercel es de solo lectura.
No hay un solo archivo en `public/uploads/hero` en el repo, así que la home siempre mostró
el video de fallback y el cambio no altera nada visible.

Si en algún momento se quiere un hero administrable, hacerlo sobre `lib/storage.ts` con un
blob store configurado (§8.5).

#### Las 8 cards de líneas de producto

Debajo del hero, la home lista las 8 líneas en una grilla de 4 + 4 (`grid-cols-2 md:grid-cols-4`,
`aspect-ratio 4/3`). El array `lineas` en `src/app/page.tsx` es la única fuente: cada entrada
lleva `label`, `href` con el slug de categoría **tal como lo espera `/api/catalogo/todos`**,
`img` e icono. Si se agrega una categoría, el slug tiene que coincidir con el del endpoint o la
card lleva a un catálogo vacío.

Las portadas usan `SafeImage`, no `next/image` pelado: eso les da el loader de Cloudinary
(`f_auto,q_auto` por cada ancho del srcset) y un placeholder si la URL falla, que es lo que se
ve hoy en Deck cuando no hay red hacia `res.cloudinary.com`. Las demás son archivos locales de
`public/` y siguen el camino normal del optimizador de Next.

La portada de Deck apunta a un asset de la cuenta de Cloudinary del proyecto. **Es una foto
tomada de un sitio de terceros (Construex/Polyarq) y re-alojada**; queda anotado acá porque el
riesgo de derechos no desaparece por haberla copiado a un CDN propio. Reemplazarla por una foto
propia o con licencia cuando haya una.

### 8.7 Chatbot "Nacho"

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

### 9.7 Cloudinary necesita sus credenciales en Vercel

El driver está implementado (§8.5) pero **no funciona hasta que estén las credenciales** en
las Environment Variables del proyecto (`CLOUDINARY_URL`, o las tres separadas). Sin ellas cae
al disco local y en Vercel los uploads responden 503.

⚠️ Vercel **no aplica variables nuevas a un deploy ya hecho**: hay que redeployar después de
agregarlas.

El round-trip real contra la API de Cloudinary **no está probado**: el sandbox donde se
desarrolló bloquea `api.cloudinary.com`. Sí están verificados el algoritmo de firma contra su
especificación, el parseo de `public_id` y la construcción de las URLs transformadas. La
primera subida real desde el panel es la prueba que falta.

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
| `data/products.ts` | 26 | `products` era `[]` (§8.7) |

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
| 3 | **Los leads del chatbot no se guardaban** en ningún lado (§8.7) |
| 4 | **`/tienda` siempre vacía** y el bot derivaba ahí (§8.7) |
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
| — | El badge de Estado del panel era decorativo: `/api/productos/[id]/toggle` existía sin un solo llamador, así que activar o desactivar exigía abrir el panel de edición |
| — | `/api/upload`, `/api/productos/import` y `/import/preview` devolvían 500 ante un multipart malformado, en vez de 400 |
| — | El ABM de hero de `/panel/hero` no funcionaba en producción (filesystem de solo lectura); se eliminó junto con su endpoint, modelo y tabla (§8.6) |
| — | **`garantia` rompía el guardado en revestimientos, decks y maderas**: la config del ABM ofrecía el campo pero la columna no existe en esos modelos, así que el update terminaba en 500 |
| — | **27 columnas no eran editables** desde el panel: las 8 unidades de medida (`*Um`) en las 6 categorías que las tienen, más `nombre` en pisos_madera. El backend las descartaba en silencio porque no estaban en `category-fields.ts` |
| — | Las imágenes solo se podían cambiar subiendo un archivo, que en producción falla. Ahora se pueden agregar por ruta o URL, validadas contra la misma lista de hosts que usa `next/image` |
| 2 | **Uploads a un blob store**: se implementó el driver de Cloudinary sobre la cuenta que ya existía, con upload firmado y transformaciones `f_auto,q_auto` (§8.5). Falta solo cargar las credenciales en Vercel |
| — | Actualizar precios exigía abrir producto por producto en el ABM: un formulario de 30 campos por número y un `PUT` por producto. Ahora hay una grilla dedicada con edición inline y operaciones en lote (§8.2 bis) |
| — | **Volver atrás desde una ficha te devolvía a la página 1** del catálogo: un `useEffect` forzaba `page = 1` al cambiar el orden y también corría en el montaje, pisando la página de la URL (§8.1) |
| — | El catálogo reconsultaba las 8 tablas y mostraba el skeleton en cada vuelta atrás; ahora pinta desde un caché de módulo y revalida en silencio, con prefetch de la página siguiente y restauración de scroll (§8.1) |
| — | Paginar no dejaba entrada en el historial: el botón atrás sacaba del sitio de una en vez de recorrer las páginas (§8.1) |

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
