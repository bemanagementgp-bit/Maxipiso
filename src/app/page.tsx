import { prisma } from "@/lib/prisma";
import { LINEAS_DEFECTO, normalizarLinea, type LineaHome } from "@/lib/lineas-home";
import HomeClient from "./home-client";

/**
 * Home.
 *
 * Es un server component fino: lo único que hace es leer las portadas de las
 * líneas y pasárselas al componente de cliente, que es el home de siempre. Así
 * las fotos viajan ya en el HTML —sin parpadeo ni fetch al montar— y se editan
 * desde Panel → Portadas sin deployar.
 */

// ISR: el home se sirve estático y se rearma cada 5 minutos. Editar una portada
// desde el panel llama a `revalidatePath("/")`, así que el cambio se ve al
// instante; esto es sólo la red de seguridad.
export const revalidate = 300;

async function leerLineas(): Promise<LineaHome[]> {
  try {
    const filas = await prisma.lineaHome.findMany({
      where: { isActive: true },
      orderBy: [{ orden: "asc" }, { label: "asc" }],
    });
    // Si la tabla está vacía (migración recién aplicada a mano, base de un
    // entorno nuevo) el home no se queda sin catálogo.
    if (filas.length === 0) return LINEAS_DEFECTO;
    return filas.map((f) => normalizarLinea(f as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[home] no se pudieron leer las lineas:", error);
    return LINEAS_DEFECTO;
  }
}

export default async function Home() {
  const lineas = await leerLineas();
  return <HomeClient lineas={lineas} />;
}
