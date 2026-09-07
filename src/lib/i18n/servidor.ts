import { cookies, headers } from "next/headers";
import { diccionarioDe } from "./index";
import { COOKIE_IDIOMA, esIdioma, idiomaDesdeAcceptLanguage, type Idioma } from "./idiomas";
import type { Diccionario } from "./diccionarios/es";

/**
 * El idioma y los textos, para componentes de servidor.
 *
 * El `useT()` del provider es un hook y solo sirve en el cliente. La ficha de
 * producto y el layout son componentes de servidor, y necesitan el mismo
 * diccionario para renderizar ya traducido —sin un parpadeo de espanol al
 * hidratar— y para poner el `lang` correcto en el HTML.
 *
 * Misma prioridad que en el layout: la cookie primero, que es lo que la persona
 * eligio, y el `Accept-Language` como respaldo para la primera visita.
 */
export async function idiomaActual(): Promise<Idioma> {
  const cookieStore = await cookies();
  const guardado = cookieStore.get(COOKIE_IDIOMA)?.value;
  if (esIdioma(guardado)) return guardado;
  const headerStore = await headers();
  return idiomaDesdeAcceptLanguage(headerStore.get("accept-language"));
}

export async function textos(): Promise<Diccionario> {
  return diccionarioDe(await idiomaActual());
}
