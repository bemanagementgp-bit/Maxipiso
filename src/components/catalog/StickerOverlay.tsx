import {
  COLOR_FONDO_DEFECTO,
  COLOR_TEXTO_DEFECTO,
  agruparPorPosicion,
  type PosicionSticker,
  type Sticker,
} from "@/lib/stickers";

/**
 * Dibuja los stickers de un producto encima de su foto.
 *
 * El contenedor padre TIENE que ser `position: relative` — es la foto, no la
 * card entera: los stickers son parte de la imagen, no del cuerpo del producto.
 *
 * No es interactivo (`pointer-events-none`): la foto suele estar dentro de un
 * link al producto, y un sticker que se comiera el click rompería la navegación.
 */

const CLASES_POSICION: Record<PosicionSticker, string> = {
  "arriba-izq": "top-2 left-2 items-start",
  "arriba-der": "top-2 right-2 items-end",
  "abajo-izq": "bottom-2 left-2 items-start",
  "abajo-der": "bottom-2 right-2 items-end",
};

type Props = {
  stickers: Sticker[];
  /** `sm` para la card del catálogo, `md` para la ficha del producto. */
  tamano?: "sm" | "md";
  /**
   * Clase que reemplaza el `bottom` de la esquina inferior izquierda.
   *
   * La card del catálogo ya tiene el SKU ahí abajo: sin esto, un sticker en esa
   * esquina se le montaría encima.
   */
  abajoIzq?: string;
};

export default function StickerOverlay({ stickers, tamano = "sm", abajoIzq }: Props) {
  if (stickers.length === 0) return null;

  const grupos = agruparPorPosicion(stickers);
  const altoImagen = tamano === "md" ? "h-9" : "h-6";
  const textoClase =
    tamano === "md"
      ? "text-[11px] px-2.5 py-1 rounded-md"
      : "text-[9px] px-2 py-0.5 rounded";

  return (
    <>
      {(Object.keys(grupos) as PosicionSticker[]).map((posicion) => {
        const delGrupo = grupos[posicion];
        if (delGrupo.length === 0) return null;
        return (
          <div
            key={posicion}
            className={`pointer-events-none absolute z-10 flex flex-col gap-1 ${
              posicion === "abajo-izq" && abajoIzq
                ? `${CLASES_POSICION[posicion].replace("bottom-2", abajoIzq)}`
                : CLASES_POSICION[posicion]
            }`}
          >
            {delGrupo.map((s) =>
              s.tipo === "imagen" && s.imagenUrl ? (
                // `img` crudo y no `next/image`: son PNG chicos, de tamaño
                // variable, y pasarlos por el optimizador no compensa.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.id}
                  src={s.imagenUrl}
                  alt={s.nombre}
                  className={`${altoImagen} w-auto object-contain drop-shadow-sm`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  key={s.id}
                  className={`${textoClase} font-bold uppercase tracking-wide leading-none shadow-sm whitespace-nowrap`}
                  style={{
                    backgroundColor: s.colorFondo ?? COLOR_FONDO_DEFECTO,
                    color: s.colorTexto ?? COLOR_TEXTO_DEFECTO,
                  }}
                >
                  {s.texto ?? s.nombre}
                </span>
              ),
            )}
          </div>
        );
      })}
    </>
  );
}
