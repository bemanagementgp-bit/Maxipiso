import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import {
  destroyInCloudinary,
  getCloudinaryConfig,
  publicIdFromUrl,
  uploadToCloudinary,
} from "@/lib/cloudinary";

/**
 * Capa de almacenamiento de archivos subidos.
 *
 * POR QUE EXISTE
 * --------------
 * Las rutas de upload escribian directo con `fs.writeFile` sobre `public/`.
 * Eso funciona en local, pero en Vercel el filesystem de las funciones es de
 * solo lectura salvo `/tmp`, y ademas es efimero: en produccion los uploads
 * fallaban con un 500 generico y el admin no tenia forma de saber por que.
 *
 * COMO MIGRAR A UN BLOB STORE
 * ---------------------------
 * Implementar un `StorageDriver` nuevo (ver `localDriver` como referencia) y
 * devolverlo desde `getStorage()` cuando su variable de entorno este presente.
 * El resto de la app no se entera: solo consume `save()` / `remove()`.
 */

export type StoredFile = {
  /** URL publica servible por el navegador. */
  url: string;
  /** Identificador interno del archivo dentro del store. */
  pathname: string;
};

export type SaveOptions = {
  /** Carpeta logica, sin barras (ej: "productos"). */
  folder: string;
  /** Extension sin punto (ej: "jpg"). */
  ext: string;
  contentType: string;
  /**
   * Nombre del archivo tal como lo mando el navegador.
   *
   * En este catalogo los archivos se nombran por SKU (`14704-1.jpg`), asi que
   * conservarlo hace que la imagen sea ubicable en Cloudinary por el mismo
   * codigo con el que se busca el producto. Es entrada NO confiable: pasa por
   * `nombreSeguro()` antes de tocar nada.
   */
  originalName?: string;
};

export interface StorageDriver {
  readonly name: string;
  save(buffer: Buffer, opts: SaveOptions): Promise<StoredFile>;
  remove(url: string): Promise<void>;
}

/** Error de almacenamiento con un mensaje que se le puede mostrar al admin. */
export class StorageError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

const FOLDER_RE = /^[a-z0-9-]+$/;
const EXT_RE = /^[a-z0-9]+$/;

function assertSafeOptions(opts: SaveOptions) {
  if (!FOLDER_RE.test(opts.folder)) {
    throw new StorageError(`folder inválido: ${opts.folder}`, "Destino inválido", 400);
  }
  if (!EXT_RE.test(opts.ext)) {
    throw new StorageError(`extensión inválida: ${opts.ext}`, "Formato inválido", 400);
  }
}

/**
 * Base del nombre a usar, a partir del que mando el cliente.
 *
 * Se conserva porque en este catalogo el nombre del archivo ES el SKU
 * (`14704-1.jpg`), y con eso la imagen queda ubicable en Cloudinary por el
 * mismo codigo con el que se busca el producto.
 *
 * Es entrada no confiable, asi que se lo trata como tal: se descarta cualquier
 * componente de directorio, se sacan los acentos y se reemplaza todo lo que no
 * sea letra, numero, guion o guion bajo. Eso elimina de raiz las barras (que en
 * Cloudinary crearian carpetas) y los puntos (que darian `..`).
 *
 * Si despues de limpiarlo no queda nada utilizable, se cae al hash del
 * contenido.
 */
function nombreSeguro(originalName: string | undefined, buffer: Buffer): string {
  const hashDelContenido = () => createHash("sha256").update(buffer).digest("hex").slice(0, 32);

  if (!originalName) return hashDelContenido();

  // Solo el nombre del archivo: nada de rutas.
  const base = originalName.split(/[\\/]/).pop() ?? "";
  // Sin la extension: la real se deduce de los magic bytes, no de lo que diga
  // el nombre.
  const sinExtension = base.replace(/\.[^.]*$/, "");

  const limpio = sinExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return limpio || hashDelContenido();
}

// ─── Driver local (desarrollo y hosts con disco persistente) ──────────────────

const PUBLIC_DIR = join(process.cwd(), "public");
const UPLOADS_ROOT = "uploads";

/** Errores de filesystem que significan "este entorno no acepta escrituras". */
const READONLY_CODES = new Set(["EROFS", "EACCES", "EPERM", "ENOSPC"]);

const localDriver: StorageDriver = {
  name: "local",

  async save(buffer, opts) {
    assertSafeOptions(opts);

    const dir = join(PUBLIC_DIR, UPLOADS_ROOT, opts.folder);
    const filename = `${nombreSeguro(opts.originalName, buffer)}.${opts.ext}`;
    const filepath = join(dir, filename);

    // Defensa en profundidad: el path final tiene que quedar dentro de public/.
    const expectedPrefix = join(PUBLIC_DIR, UPLOADS_ROOT) + (process.platform === "win32" ? "\\" : "/");
    if (!filepath.startsWith(expectedPrefix)) {
      throw new StorageError(`path fuera de uploads: ${filepath}`, "Ruta inválida", 400);
    }

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(filepath, buffer);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code ?? "";
      if (READONLY_CODES.has(code)) {
        // El caso de Vercel. Antes esto salia como un 500 sin explicacion.
        throw new StorageError(
          `filesystem de solo lectura (${code}) al escribir ${filepath}`,
          "El almacenamiento de archivos no está configurado en este entorno. " +
            "El servidor no puede escribir en disco: hay que configurar un blob store.",
          503,
        );
      }
      throw err;
    }

    const pathname = `${UPLOADS_ROOT}/${opts.folder}/${filename}`;
    return { url: `/${pathname}`, pathname };
  },

  async remove(url) {
    if (!url.startsWith(`/${UPLOADS_ROOT}/`)) return;
    const filepath = join(PUBLIC_DIR, url);
    if (!filepath.startsWith(join(PUBLIC_DIR, UPLOADS_ROOT))) return;
    try {
      await unlink(filepath);
    } catch {
      // Que el archivo ya no este no es un error: el registro igual se borra.
    }
  },
};

// ─── Driver Cloudinary (produccion) ──────────────────────────────────────────

const CLOUDINARY_FOLDER_ROOT = "maxipiso";

const cloudinaryDriver: StorageDriver = {
  name: "cloudinary",

  async save(buffer, opts) {
    assertSafeOptions(opts);
    const config = getCloudinaryConfig();
    if (!config) {
      throw new StorageError(
        "cloudinaryDriver activo sin config completa",
        "El almacenamiento de imágenes no está configurado correctamente.",
        503,
      );
    }

    try {
      const nombre = nombreSeguro(opts.originalName, buffer);
      const { secureUrl, publicId } = await uploadToCloudinary(
        buffer,
        {
          folder: `${CLOUDINARY_FOLDER_ROOT}/${opts.folder}`,
          contentType: opts.contentType,
          filename: `${nombre}.${opts.ext}`,
          // El public_id va sin extension: Cloudinary la agrega segun el
          // formato que detecta. Subir otra vez un archivo con el mismo nombre
          // REEMPLAZA la imagen anterior, que es lo esperable cuando el nombre
          // identifica al producto.
          publicId: nombre,
        },
        config,
      );
      return { url: secureUrl, pathname: publicId };
    } catch (err) {
      // El motivo que devuelve Cloudinary ("Invalid Signature", "Stale request")
      // se le muestra al admin: sin eso, un error de credenciales y uno de
      // cuota se veían exactamente igual y no había forma de saber qué tocar.
      const motivo = (err as { cloudinaryMessage?: string })?.cloudinaryMessage;
      throw new StorageError(
        `upload a Cloudinary falló: ${err instanceof Error ? err.message : String(err)}`,
        motivo
          ? `Cloudinary rechazó la imagen: ${motivo.slice(0, 200)}`
          : "No se pudo subir la imagen al almacenamiento. Revisá el log del servidor.",
        502,
      );
    }
  },

  async remove(url) {
    const config = getCloudinaryConfig();
    if (!config) return;
    const publicId = publicIdFromUrl(url);
    if (!publicId) return; // no es una URL nuestra de Cloudinary
    await destroyInCloudinary(publicId, config);
  },
};

// ─── Seleccion de driver ─────────────────────────────────────────────────────

let cached: StorageDriver | null = null;

/**
 * Devuelve el driver activo.
 *
 * Con las tres variables de Cloudinary presentes se usa Cloudinary; si falta
 * alguna, cae al disco local, que sirve para desarrollo. En Vercel el disco es
 * de solo lectura, asi que sin configurar Cloudinary los uploads responden 503
 * con un mensaje explicito en vez de un 500 mudo.
 */
export function getStorage(): StorageDriver {
  if (cached) return cached;
  cached = getCloudinaryConfig() ? cloudinaryDriver : localDriver;
  return cached;
}

/** true si el driver activo no sobrevive a un redeploy (solo disco local). */
export function isEphemeralStorage(): boolean {
  return getStorage().name === "local";
}
