"use client";

import { useRouter } from "next/navigation";

/**
 * El selector de variantes cuando son muchas.
 *
 * Con tres colores, una fila de botones con la foto de cada uno es lo mejor
 * que se puede mostrar: se elige mirando. Con treinta —una cuarta caña de MDF
 * viene en treinta terminaciones— esa misma fila es una pared de botones
 * iguales que ocupa la pantalla entera y no se entiende nada. A partir de
 * cierta cantidad, la lista compacta gana: se lee de un vistazo, se puede
 * buscar con el teclado y no empuja el resto de la ficha fuera de la vista.
 *
 * Es un `select` de verdad y no un menú dibujado a mano: en el teléfono abre
 * el selector nativo, que es el que la gente ya sabe usar.
 */
export default function DesplegableVariantes({
  etiqueta,
  opciones,
}: {
  etiqueta: string;
  /** `id` es el producto al que lleva. El elegido es el que se está viendo. */
  opciones: { valor: string; id: string; elegido?: boolean }[];
}) {
  const router = useRouter();
  const actual = opciones.find((o) => o.elegido)?.id ?? "";

  return (
    <select
      aria-label={etiqueta}
      value={actual}
      onChange={(e) => router.push(`/catalogo/${e.target.value}`)}
      className="w-full px-3 py-2 text-[13px] border-2 border-gray-200 rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#DF8635] transition-colors"
    >
      {/* Sin ninguna elegida —se está viendo una hermana que no entra en este
          eje— el `select` mostraría la primera como si fuera la actual. */}
      {!actual && <option value="">Elegir…</option>}
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>
          {o.valor}
        </option>
      ))}
    </select>
  );
}
