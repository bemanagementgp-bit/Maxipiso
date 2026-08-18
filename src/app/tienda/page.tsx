import { redirect } from "next/navigation";

/**
 * `/tienda` nunca tuvo productos: leia un array hardcodeado que estaba vacio,
 * y su unica entrada era la derivacion del chatbot. El catalogo real vive en
 * `/catalogo` y sale de la base de datos.
 *
 * Se mantiene la ruta como redirect para no romper enlaces ya publicados.
 */
export default function TiendaPage() {
  redirect("/catalogo");
}
