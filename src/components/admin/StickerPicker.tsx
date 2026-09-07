"use client";

import { COLOR_FONDO_DEFECTO, COLOR_TEXTO_DEFECTO, type Sticker } from "@/lib/stickers";

/**
 * Selector de stickers dentro del formulario de producto.
 *
 * Se muestran como chips con su aspecto real —la imagen o la etiqueta con sus
 * colores— y no como una lista de nombres: quien carga el producto tiene que ver
 * qué le va a aparecer al cliente encima de la foto, no leer "Bandera de
 * Alemania" e imaginárselo.
 */

type Props = {
  disponibles: Sticker[];
  elegidos: string[];
  onChange: (ids: string[]) => void;
};

export default function StickerPicker({ disponibles, elegidos, onChange }: Props) {
  if (disponibles.length === 0) {
    return (
      <p className="text-[10px] text-[#bbb] leading-relaxed">
        Todavía no hay stickers cargados. Se crean en{" "}
        <span className="text-[#777]">Panel → Stickers</span>.
      </p>
    );
  }

  const alternar = (id: string) => {
    onChange(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {disponibles.map((s) => {
          const activo = elegidos.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => alternar(s.id)}
              title={`${s.nombre} · ${s.posicion.replace("-", " ")}`}
              className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-sm transition-colors ${
                activo
                  ? "border-[#DF8635] bg-[#FFF8F1]"
                  : "border-[#E0DED8] hover:border-[#bbb] opacity-70 hover:opacity-100"
              }`}
            >
              {s.tipo === "imagen" && s.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imagenUrl} alt="" className="h-5 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span
                  className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded leading-none"
                  style={{
                    backgroundColor: s.colorFondo ?? COLOR_FONDO_DEFECTO,
                    color: s.colorTexto ?? COLOR_TEXTO_DEFECTO,
                  }}
                >
                  {s.texto ?? s.nombre}
                </span>
              )}
              <span className={`text-[11px] ${activo ? "text-[#111] font-medium" : "text-[#777]"}`}>
                {s.nombre}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[9px] text-[#bbb] leading-relaxed">
        Se dibujan encima de la foto de portada, en el catálogo y en la ficha. La esquina de
        cada uno se define al crearlo.
      </p>
    </>
  );
}
