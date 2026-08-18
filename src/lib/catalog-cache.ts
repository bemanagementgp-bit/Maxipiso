/**
 * Cache en memoria de las respuestas del catalogo publico.
 *
 * Antes cada ruta tenia su propio `Map` en scope de modulo y nadie lo limpiaba:
 * despues de editar un producto en el panel el cambio tardaba hasta un minuto
 * en verse. Ahora las mutaciones llaman a `clearCatalogCache()`.
 *
 * LIMITACION CONOCIDA: sigue siendo memoria del proceso. En serverless cada
 * instancia tiene la suya, asi que invalidar solo afecta a la instancia que
 * atendio la escritura; el resto espera al TTL. Para invalidacion real hace
 * falta un store compartido (Redis/Upstash) — ver `rate-limit.ts`, que tiene
 * exactamente el mismo problema.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

type Entry = { expires: number; payload: unknown };

const store = new Map<string, Entry>();

export function getCached(key: string): unknown | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.payload;
}

export function setCached(key: string, payload: unknown): void {
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expires <= now) store.delete(k);
    }
    // Si sigue lleno de entradas vigentes, tirar la mas vieja.
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
  }
  store.set(key, { expires: Date.now() + TTL_MS, payload });
}

/** Invalida todo el catalogo. Llamar desde cualquier mutacion de productos. */
export function clearCatalogCache(): void {
  store.clear();
}
