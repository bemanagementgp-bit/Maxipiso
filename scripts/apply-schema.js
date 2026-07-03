/**
 * apply-schema.js
 * Aplica el nuevo schema (8 tablas de productos) directamente a Turso via libSQL.
 * Ejecutar UNA VEZ después de haber limpiado los datos.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    process.env[key] = val;
  }
}

const STATEMENTS = [
  // ── Limpiar tablas antiguas ──────────────────────────────────
  `DROP TABLE IF EXISTS imagenes_productos`,
  `DROP TABLE IF EXISTS change_logs`,
  `DROP TABLE IF EXISTS products`,

  // ── Tabla de auditoría (polimórfica) ─────────────────────────
  `CREATE TABLE IF NOT EXISTS change_logs (
    id             TEXT PRIMARY KEY,
    tablaNombre    TEXT NOT NULL,
    entidadId      TEXT NOT NULL,
    usuarioId      TEXT NOT NULL,
    campo          TEXT NOT NULL,
    valorAnterior  TEXT,
    valorNuevo     TEXT,
    tipo           TEXT NOT NULL,
    fechaCambio    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuarioId) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_changelog_tabla ON change_logs (tablaNombre, entidadId)`,
  `CREATE INDEX IF NOT EXISTS idx_changelog_user  ON change_logs (usuarioId)`,
  `CREATE INDEX IF NOT EXISTS idx_changelog_fecha ON change_logs (fechaCambio)`,

  // ── 1. Pisos Flotantes ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pisos_flotantes (
    id                  TEXT PRIMARY KEY,
    sku                 TEXT UNIQUE NOT NULL,
    categoriaPrincipal  TEXT,
    categoriaSecundaria TEXT,
    categoriaTerciaria  TEXT,
    tipoProducto        TEXT,
    origen              TEXT,
    nombre              TEXT NOT NULL,
    codigo              TEXT,
    marca               TEXT NOT NULL,
    linea               TEXT,
    tipoDeUso           TEXT,
    espesor             TEXT,
    espesorUm           TEXT,
    abrasion            TEXT,
    mantoIncorporado    TEXT,
    bisel               TEXT,
    ancho               TEXT,
    anchoUm             TEXT,
    largo               TEXT,
    largoUm             TEXT,
    base                TEXT,
    baseUm              TEXT,
    tablasPorCaja       INTEGER,
    precioM2            REAL,
    moneda              TEXT,
    precioCaja          REAL,
    pesoCaja            REAL,
    cajasPallet         INTEGER,
    pesoPallet          REAL,
    stock               INTEGER,
    imagenes            TEXT,
    precioEnvioCaja     REAL,
    garantia            TEXT,
    fichaTecnica        TEXT,
    archivoInstalacion  TEXT,
    descripcion         TEXT,
    isActive            INTEGER NOT NULL DEFAULT 1,
    createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pf_sku      ON pisos_flotantes (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_pf_marca    ON pisos_flotantes (marca)`,
  `CREATE INDEX IF NOT EXISTS idx_pf_active   ON pisos_flotantes (isActive)`,

  // ── 2. Porcellanatos ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS porcellanatos (
    id                  TEXT PRIMARY KEY,
    sku                 TEXT UNIQUE NOT NULL,
    categoriaPrincipal  TEXT,
    categoriaSecundaria TEXT,
    tipoProducto        TEXT,
    acabado             TEXT,
    terminacion         TEXT,
    origen              TEXT,
    nombre              TEXT NOT NULL,
    codigo              TEXT,
    marca               TEXT NOT NULL,
    linea               TEXT,
    tipoDeUso           TEXT,
    espesor             TEXT,
    espesorUm           TEXT,
    ancho               TEXT,
    anchoUm             TEXT,
    largo               TEXT,
    largoUm             TEXT,
    base                TEXT,
    baseUm              TEXT,
    precioM2            REAL,
    moneda              TEXT,
    precioCaja          REAL,
    stock               INTEGER,
    imagenes            TEXT,
    precioEnvioCaja     REAL,
    garantia            TEXT,
    fichaTecnica        TEXT,
    archivoInstalacion  TEXT,
    descripcion         TEXT,
    isActive            INTEGER NOT NULL DEFAULT 1,
    createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pc_sku    ON porcellanatos (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_pc_marca  ON porcellanatos (marca)`,
  `CREATE INDEX IF NOT EXISTS idx_pc_active ON porcellanatos (isActive)`,

  // ── 3. Revestimientos (Exteriores + Interiores) ───────────────
  `CREATE TABLE IF NOT EXISTS revestimientos (
    id                  TEXT PRIMARY KEY,
    sku                 TEXT UNIQUE NOT NULL,
    categoriaPrincipal  TEXT,
    tipoProducto        TEXT,
    uso                 TEXT,
    material            TEXT,
    marca               TEXT,
    linea               TEXT,
    nombre              TEXT NOT NULL,
    espesor             TEXT,
    espesorUm           TEXT,
    ancho               TEXT,
    anchoUm             TEXT,
    largo               TEXT,
    largoUm             TEXT,
    baseTabla           TEXT,
    baseTablUm          TEXT,
    precioTabla         REAL,
    precioM2            REAL,
    precioMl            REAL,
    moneda              TEXT,
    imagen              TEXT,
    flete               REAL,
    stock               INTEGER,
    fichaTecnica        TEXT,
    archivoInstalacion  TEXT,
    descripcion         TEXT,
    isActive            INTEGER NOT NULL DEFAULT 1,
    createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rv_sku      ON revestimientos (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_rv_marca    ON revestimientos (marca)`,
  `CREATE INDEX IF NOT EXISTS idx_rv_cat      ON revestimientos (categoriaPrincipal)`,
  `CREATE INDEX IF NOT EXISTS idx_rv_active   ON revestimientos (isActive)`,

  // ── 4. Pisos Vinílicos ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pisos_vinilicos (
    id                    TEXT PRIMARY KEY,
    sku                   TEXT UNIQUE NOT NULL,
    categoriaPrincipal    TEXT,
    categoriaSecundaria   TEXT,
    categoriaTerciaria    TEXT,
    tipoProducto          TEXT,
    material              TEXT,
    origen                TEXT,
    nombre                TEXT NOT NULL,
    codigo                TEXT,
    marca                 TEXT NOT NULL,
    linea                 TEXT,
    tipoDeUso             TEXT,
    espesorTotal          TEXT,
    espesorTotalUm        TEXT,
    espesorComposicion    TEXT,
    espesorComposicionUm  TEXT,
    capaDeUso             TEXT,
    mantoIncorporado      TEXT,
    tablasPorCaja         INTEGER,
    ancho                 TEXT,
    anchoUm               TEXT,
    largo                 TEXT,
    largoUm               TEXT,
    base                  TEXT,
    baseUm                TEXT,
    bisel                 TEXT,
    precioM2              REAL,
    moneda                TEXT,
    precioCaja            REAL,
    cajasPallet           INTEGER,
    pesoCaja              REAL,
    pesoPallet            REAL,
    stock                 INTEGER,
    imagenes              TEXT,
    precioEnvioCaja       REAL,
    garantia              TEXT,
    fichaTecnica          TEXT,
    archivoInstalacion    TEXT,
    descripcion           TEXT,
    isActive              INTEGER NOT NULL DEFAULT 1,
    createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pv_sku    ON pisos_vinilicos (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_pv_marca  ON pisos_vinilicos (marca)`,
  `CREATE INDEX IF NOT EXISTS idx_pv_active ON pisos_vinilicos (isActive)`,

  // ── 5. Pisos Madera e Ingeniería ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS pisos_madera (
    id                  TEXT PRIMARY KEY,
    sku                 TEXT UNIQUE NOT NULL,
    categoriaPrincipal  TEXT,
    categoriaSecundaria TEXT,
    categoriaTerciaria  TEXT,
    subtipo             TEXT,
    subtipo2            TEXT,
    especie             TEXT,
    acabado             TEXT,
    terminacion         TEXT,
    origen              TEXT,
    marca               TEXT,
    linea               TEXT,
    nombre              TEXT,
    espesor             TEXT,
    espesorUm           TEXT,
    espesorLamina       TEXT,
    espesorLaminaUm     TEXT,
    ancho               TEXT,
    anchoUm             TEXT,
    largo               TEXT,
    largoUm             TEXT,
    base                TEXT,
    baseUm              TEXT,
    bisel               TEXT,
    precioM2            REAL,
    moneda              TEXT,
    precioCaja          REAL,
    stock               INTEGER,
    imagenes            TEXT,
    precioEnvioCaja     REAL,
    garantia            TEXT,
    fichaTecnica        TEXT,
    archivoInstalacion  TEXT,
    descripcion         TEXT,
    isActive            INTEGER NOT NULL DEFAULT 1,
    createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pm_sku    ON pisos_madera (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_pm_marca  ON pisos_madera (marca)`,
  `CREATE INDEX IF NOT EXISTS idx_pm_active ON pisos_madera (isActive)`,

  // ── 6. Decks ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS decks (
    id                  TEXT PRIMARY KEY,
    sku                 TEXT UNIQUE NOT NULL,
    categoriaPrincipal  TEXT,
    tipoProducto        TEXT,
    material            TEXT,
    marca               TEXT,
    linea               TEXT,
    nombre              TEXT NOT NULL,
    espesor             TEXT,
    espesorUm           TEXT,
    ancho               TEXT,
    anchoUm             TEXT,
    largo               TEXT,
    largoUm             TEXT,
    baseTabla           TEXT,
    baseTablUm          TEXT,
    precioTabla         REAL,
    precioM2            REAL,
    precioMLineal       REAL,
    moneda              TEXT,
    imagen              TEXT,
    flete               REAL,
    stock               INTEGER,
    fichaTecnica        TEXT,
    archivoInstalacion  TEXT,
    descripcion         TEXT,
    isActive            INTEGER NOT NULL DEFAULT 1,
    createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dk_sku    ON decks (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_dk_marca  ON decks (marca)`,
  `CREATE INDEX IF NOT EXISTS idx_dk_active ON decks (isActive)`,

  // ── 7. Maderas ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS maderas (
    id                    TEXT PRIMARY KEY,
    sku                   TEXT UNIQUE NOT NULL,
    tipoProducto          TEXT,
    nombre                TEXT NOT NULL,
    origen                TEXT,
    espesoresDisponibles  TEXT,
    medidas               TEXT,
    secado                TEXT,
    precio                REAL,
    unidadMedida          TEXT,
    moneda                TEXT,
    stock                 INTEGER,
    imagen                TEXT,
    descripcion           TEXT,
    fichaTecnica          TEXT,
    archivoInstalacion    TEXT,
    isActive              INTEGER NOT NULL DEFAULT 1,
    createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_md_sku    ON maderas (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_md_active ON maderas (isActive)`,

  // ── 8. Accesorios ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS accesorios (
    id            TEXT PRIMARY KEY,
    sku           TEXT UNIQUE NOT NULL,
    tipoProducto  TEXT,
    subtipo       TEXT,
    nombre        TEXT NOT NULL,
    espesor       TEXT,
    dimensiones   TEXT,
    colores       TEXT,
    stock         INTEGER,
    imagen        TEXT,
    descripcion   TEXT,
    isActive      INTEGER NOT NULL DEFAULT 1,
    createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ac_sku    ON accesorios (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_ac_active ON accesorios (isActive)`,
];

async function main() {
  loadEnv();
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  let ok = 0;
  let fail = 0;
  for (const sql of STATEMENTS) {
    const label = sql.trim().slice(0, 60).replace(/\s+/g, " ");
    try {
      await client.execute(sql);
      console.log(`✅  ${label}`);
      ok++;
    } catch (e) {
      console.error(`❌  ${label}\n    ${e.message}`);
      fail++;
    }
  }

  console.log(`\n✔ Completado: ${ok} OK, ${fail} errores`);
}

main().catch(console.error);
