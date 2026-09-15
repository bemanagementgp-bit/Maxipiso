import {
  COLOR_FONDO_DEFECTO,
  COLOR_TEXTO_DEFECTO,
  ESCALA_DEFECTO,
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

/**
 * Medidas base, antes de aplicar la escala de cada sticker.
 *
 * Van en píxeles y como estilo inline —no como clases de Tailwind— porque la
 * escala es un número que sale de la base: `h-6` no se puede multiplicar por
 * 1.25, y una clase por cada combinación de tamaño y escala serían diez clases
 * que Tailwind además no generaría, al armarse el nombre en tiempo de ejecución.
 */
const BASE = {
  sm: { alto: 24, fuente: 9, padY: 2, padX: 8, radio: 4 },
  md: { alto: 36, fuente: 11, padY: 4, padX: 10, radio: 6 },
} as const;

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
  const base = BASE[tamano];

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
            {delGrupo.map((s) => {
              const factor = (s.escala || ESCALA_DEFECTO) / 100;
              return s.tipo === "imagen" && s.imagenUrl ? (
                // `img` crudo y no `next/image`: son PNG chicos, de tamaño
                // variable, y pasarlos por el optimizador no compensa.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.id}
                  src={s.imagenUrl}
                  alt={s.nombre}
                  className="w-auto object-contain drop-shadow-sm"
                  style={{ height: `${base.alto * factor}px` }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  key={s.id}
                  className="font-bold uppercase tracking-wide leading-none shadow-sm whitespace-nowrap"
                  style={{
                    backgroundColor: s.colorFondo ?? COLOR_FONDO_DEFECTO,
                    color: s.colorTexto ?? COLOR_TEXTO_DEFECTO,
                    fontSize: `${base.fuente * factor}px`,
                    padding: `${base.padY * factor}px ${base.padX * factor}px`,
                    borderRadius: `${base.radio * factor}px`,
                  }}
                >
                  {s.texto ?? s.nombre}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
