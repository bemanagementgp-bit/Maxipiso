import ProductoEditor from "@/components/admin/ProductoEditor";

/**
 * Alta y edición de un producto, en página completa.
 *
 * Antes era un popup de 780px con scroll propio: los treinta campos de un piso
 * flotante entraban en dos columnas angostas y había que desplazar dentro del
 * popup, dentro de la página. Como página respira, entran tres columnas y el
 * navegador se encarga del scroll.
 *
 * `id` vale `nuevo` para el alta. Es una ruta y no dos porque el formulario es
 * el mismo: lo único que cambia es si al guardar hace POST o PUT.
 *
 * `?duplicar=<id>` carga los datos de otro producto como punto de partida.
 */

export default async function ProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const duplicar = typeof sp.duplicar === "string" ? sp.duplicar : null;
  const esNuevo = id === "nuevo";

  return (
    <ProductoEditor
      productId={esNuevo ? null : id}
      duplicateOfId={esNuevo ? duplicar : null}
    />
  );
}
