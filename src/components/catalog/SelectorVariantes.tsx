import Link from "next/link";
import SafeImage from "./SafeImage";
import type { EjeVariante } from "@/lib/variantes";

/**
 * El selector de variantes de la ficha.
 *
 * **Una fila de botones por tipo**: Color arriba, Medidas abajo. Si en cambio
 * se listaran las combinaciones sueltas, un producto de tres colores por dos
 * medidas mostraría seis botones y el cliente tendría que leerlos todos para
 * entender qué se puede elegir.
 *
 * Cada botón es un link a la variante que corresponde, no un control con
 * estado: así cada combinación conserva su propia URL, se puede compartir y
 * Google la indexa. Con `<Link prefetch>` el cambio es navegación del lado del
 * cliente —no recarga la página— así que se siente como el selector de una
 * tienda, que es lo que es.
 *
 * La miniatura sólo va en el eje que la hace distinta: en pisos, la diferencia
 * entre "Roble" y "Nogal" se ve, pero poner la misma foto al lado de "120x20" y
 * "190x20" no aporta nada y ensucia.
 */
export default function SelectorVariantes({ ejes }: { ejes: EjeVariante[] }) {
  if (ejes.length === 0) return null;

  return (
    <div className="mb-5 space-y-3">
      {ejes.map((eje) => {
        // Si todos los valores del eje llevan fotos distintas, la miniatura
        // ayuda; si son todas la misma, es ruido.
        const conFoto = new Set(eje.valores.map((v) => v.imagen ?? "")).size > 1;

        return (
          <div key={eje.tipo}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#111111] mb-1.5">
              {eje.tipo}
              <span className="ml-1.5 font-normal text-gray-400 normal-case tracking-normal">
                {eje.valores.find((v) => v.elegido)?.valor}
              </span>
            </p>

            <div className="flex flex-wrap gap-2">
              {eje.valores.map((v) =>
                v.elegido ? (
                  // La elegida no es un link: llevaría a la misma página.
                  <span
                    key={v.valor}
                    aria-current="true"
                    className={`flex items-center gap-2 py-1 border-2 border-[#DF8635] bg-[#DF8635]/5 rounded-lg ${
                      conFoto ? "pl-1 pr-3" : "px-3"
                    }`}
                  >
                    {conFoto && <Miniatura src={v.imagen} />}
                    <span className="text-[12px] font-semibold text-[#DF8635]">{v.valor}</span>
                  </span>
                ) : (
                  <Link
                    key={v.valor}
                    href={`/catalogo/${v.id}`}
                    prefetch
                    className={`flex items-center gap-2 py-1 border-2 border-gray-200 rounded-lg hover:border-[#DF8635]/60 transition-colors ${
                      conFoto ? "pl-1 pr-3" : "px-3"
                    }`}
                  >
                    {conFoto && <Miniatura src={v.imagen} />}
                    <span className="text-[12px] font-medium text-[#111111]">{v.valor}</span>
                  </Link>
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Miniatura({ src }: { src: string | null }) {
  return (
    <span className="relative block w-8 h-8 rounded-md overflow-hidden bg-[#F0EEE8] shrink-0">
      {src && <SafeImage src={src} alt="" fill sizes="32px" className="object-cover" />}
    </span>
  );
}
