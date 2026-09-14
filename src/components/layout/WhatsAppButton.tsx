"use client";

import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { useT } from "@/components/providers/IdiomaProvider";

/**
 * Botón flotante de WhatsApp con mensajes armados.
 *
 * Reemplaza al chat con IA, que quedó oculto por ahora. Un botón que abre
 * WhatsApp directo es menos vistoso pero la conversación termina donde
 * realmente se vende, y no hay un bot en el medio que pueda contestar mal.
 *
 * Las dos opciones son las dos consultas que llegan: alguien mirando productos
 * y alguien que quiere distribuir. Salen con el mensaje ya escrito para que el
 * vendedor sepa de entrada de cuál se trata.
 */

const NUMERO = "542214388894";

export default function WhatsAppButton() {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alEscapar = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", alClickear);
    document.addEventListener("keydown", alEscapar);
    return () => {
      document.removeEventListener("mousedown", alClickear);
      document.removeEventListener("keydown", alEscapar);
    };
  }, [abierto]);

  /**
   * El mensaje va SIEMPRE en español, aunque el sitio esté en otro idioma: lo
   * lee el vendedor, no el cliente. Es el mismo criterio que el resto de los
   * links de WhatsApp del sitio.
   */
  const enlace = (mensaje: string) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(mensaje)}`;

  const opciones = [
    { etiqueta: t.whatsapp.consulta, mensaje: t.whatsapp.consultaMensaje },
    { etiqueta: t.whatsapp.distribuidor, mensaje: t.whatsapp.distribuidorMensaje },
  ];

  return (
    <div ref={contenedorRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {abierto && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 w-64 animate-fade-up">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
            {t.whatsapp.titulo}
          </p>
          <div className="flex flex-col gap-1.5">
            {opciones.map((o) => (
              <a
                key={o.etiqueta}
                href={enlace(o.mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAbierto(false)}
                className="text-sm text-left px-3 py-2.5 rounded-xl border border-gray-200 text-[#111111] hover:border-[#25D366] hover:bg-[#25D366]/5 transition-colors"
              >
                {o.etiqueta}
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? t.whatsapp.cerrar : t.whatsapp.abrir}
        aria-expanded={abierto}
        title={t.whatsapp.abrir}
        className="bg-[#25D366] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-110 transition-transform shrink-0"
      >
        {abierto ? (
          <FiX size={26} />
        ) : (
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        )}
      </button>
    </div>
  );
}
