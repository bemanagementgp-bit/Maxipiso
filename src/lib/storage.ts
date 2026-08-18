import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
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

/** Nombre aleatorio: nunca se usa el nombre original que mando el cliente. */
function randomName(ext: string): string {
  return `${randomBytes(16).toString("hex")}.${ext}`;
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
    const filename = randomName(opts.ext);
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
      const { secureUrl, publicId } = await uploadToCloudinary(
        buffer,
        {
          folder: `${CLOUDINARY_FOLDER_ROOT}/${opts.folder}`,
          contentType: opts.contentType,
          filename: randomName(opts.ext),
        },
        config,
      );
      return { url: secureUrl, pathname: publicId };
    } catch (err) {
      // El detalle real (firma, cuota, formato) va al log del servidor; al
      // admin le llega algo accionable sin filtrar nada de la cuenta.
      throw new StorageError(
        `upload a Cloudinary falló: ${err instanceof Error ? err.message : String(err)}`,
        "No se pudo subir la imagen al almacenamiento. Revisá el log del servidor.",
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
