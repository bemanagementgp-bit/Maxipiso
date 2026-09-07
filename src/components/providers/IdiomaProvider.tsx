"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { diccionarioDe, type Diccionario } from "@/lib/i18n";
import { COOKIE_IDIOMA, IDIOMA_POR_DEFECTO, type Idioma } from "@/lib/i18n/idiomas";

/**
 * Idioma del sitio publico.
 *
 * El idioma se guarda en una **cookie** y no en la URL. La alternativa estandar
 * —`/en/catalogo`, `/de/catalogo`— es mejor para Google, pero obliga a mover
 * todas las rutas bajo `app/[locale]/`, y eso toca la navegacion del catalogo,
 * que es la parte mas delicada del sitio. Si mas adelante hace falta el SEO por
 * idioma, se puede sumar encima de esto sin tirar nada.
 *
 * El valor inicial lo calcula el servidor (cookie, o `Accept-Language` en la
 * primera visita) y baja por prop, asi el HTML ya llega en el idioma correcto y
 * no hay un parpadeo de espanol a aleman al hidratar.
 */

type Contexto = {
  idioma: Idioma;
  t: Diccionario;
  cambiarIdioma: (nuevo: Idioma) => void;
};

const IdiomaContext = createContext<Contexto | null>(null);

/** Un ano: la eleccion de idioma no es algo que convenga volver a preguntar. */
const UN_ANIO = 60 * 60 * 24 * 365;

export function IdiomaProvider({
  inicial,
  children,
}: {
  inicial: Idioma;
  children: React.ReactNode;
}) {
  const [idioma, setIdioma] = useState<Idioma>(inicial);

  const cambiarIdioma = useCallback((nuevo: Idioma) => {
    setIdioma(nuevo);
    // `SameSite=Lax` alcanza: la cookie no lleva nada sensible, solo hace falta
    // que viaje en la navegacion normal para que el servidor renderice igual.
    document.cookie = `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=${UN_ANIO}; SameSite=Lax`;
    // `lang` importa para los lectores de pantalla y para el corrector del
    // navegador; no se actualiza solo porque lo pone el layout del servidor.
    document.documentElement.lang = nuevo;
  }, []);

  const valor = useMemo<Contexto>(
    () => ({ idioma, t: diccionarioDe(idioma), cambiarIdioma }),
    [idioma, cambiarIdioma],
  );

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

/**
 * Los textos del idioma actual.
 *
 * Fuera del provider devuelve el espanol en vez de lanzar: un componente que se
 * renderice suelto —en un test, o en una parte del panel— tiene que mostrar
 * texto, no romper la pagina.
 */
export function useT(): Diccionario {
  return useContext(IdiomaContext)?.t ?? diccionarioDe(IDIOMA_POR_DEFECTO);
}

export function useIdioma(): Contexto {
  return (
    useContext(IdiomaContext) ?? {
      idioma: IDIOMA_POR_DEFECTO,
      t: diccionarioDe(IDIOMA_POR_DEFECTO),
      cambiarIdioma: () => {},
    }
  );
}
