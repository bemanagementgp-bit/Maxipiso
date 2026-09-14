import Link from "next/link";
import SafeImage from "./SafeImage";
import type { Variante } from "@/lib/variantes";

/**
 * Las variantes del producto, para elegir dentro de la ficha.
 *
 * Cada variante es un producto con su propia página, así que el selector son
 * links y no botones con estado: la que se elige queda con su URL propia, se
 * puede compartir y Google la indexa. Con `<Link>` el cambio es navegación del
 * lado del cliente —no recarga la página— así que se siente como el selector de
 * una tienda, que es lo que es.
 *
 * `prefetch` es lo que lo hace instantáneo: son pocas y el cliente va a tocar
 * varias, así que se traen mientras mira.
 */
export default function SelectorVariantes({
  variantes,
  titulo,
}: {
  variantes: Variante[];
  titulo: string;
}) {
  if (variantes.length < 2) return null;

  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#111111] mb-2">
        {titulo}
        <span className="ml-1.5 font-normal text-gray-400 normal-case tracking-normal">
          ({variantes.length})
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        {variantes.map((v) =>
          v.actual ? (
            // La que se está viendo no es un link: llevaría a la misma página.
            <span
              key={v.id}
              aria-current="true"
              className="flex items-center gap-2 pl-1 pr-3 py-1 border-2 border-[#DF8635] bg-[#DF8635]/5 rounded-lg"
            >
              <Miniatura variante={v} />
              <span className="text-[12px] font-semibold text-[#DF8635]">{v.etiqueta}</span>
            </span>
          ) : (
            <Link
              key={v.id}
              href={`/catalogo/${v.id}`}
              prefetch
              title={`${v.etiqueta} — ${v.sku}`}
              className="flex items-center gap-2 pl-1 pr-3 py-1 border-2 border-gray-200 rounded-lg hover:border-[#DF8635]/60 transition-colors"
            >
              <Miniatura variante={v} />
              <span className="text-[12px] font-medium text-[#111111]">{v.etiqueta}</span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * La foto de la variante, chiquita.
 *
 * Es lo que hace útil al selector: en pisos, la diferencia entre "Roble" y
 * "Nogal" se ve, no se lee. Sin foto queda el cuadrito gris y el rótulo solo.
 */
function Miniatura({ variante }: { variante: Variante }) {
  return (
    <span className="relative block w-8 h-8 rounded-md overflow-hidden bg-[#F0EEE8] shrink-0">
      {variante.imagen && (
        <SafeImage src={variante.imagen} alt="" fill sizes="32px" className="object-cover" />
      )}
    </span>
  );
}
