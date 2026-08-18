import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCloudinaryConfig, pingCloudinary } from "@/lib/cloudinary";
import { getStorage, isEphemeralStorage } from "@/lib/storage";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Diagnóstico del almacenamiento de imágenes.
 *
 * Sale de un caso concreto: un upload devolvía `Invalid Signature` y no había
 * forma de saber, desde afuera del servidor, si el problema era la credencial,
 * el formato de la variable de entorno o cómo se arma la firma. Este endpoint
 * lo responde en un paso.
 *
 * **Nunca devuelve el api_secret.** De la key sólo van los últimos 4 dígitos y
 * del secret sólo el largo, que es lo que hace falta para detectar el error más
 * común: un valor pegado a medias. Aun así es sólo para ADMIN.
 */
export async function GET(req: NextRequest) {
  const rateErr = enforceRateLimit(req, { key: "diagnostico", limit: 20, windowMs: 5 * 60 * 1000 });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const driver = getStorage().name;
  const config = getCloudinaryConfig();

  if (!config) {
    return NextResponse.json({
      driver,
      efimero: isEphemeralStorage(),
      cloudinary: {
        configurada: false,
        // Qué variables ve el proceso, sin revelar contenido: alcanza para
        // saber si el deploy tomó las variables o si falta redeployar.
        variablesPresentes: {
          CLOUDINARY_URL: Boolean(process.env.CLOUDINARY_URL?.trim()),
          CLOUDINARY_CLOUD_NAME: Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim()),
          CLOUDINARY_API_KEY: Boolean(process.env.CLOUDINARY_API_KEY?.trim()),
          CLOUDINARY_API_SECRET: Boolean(process.env.CLOUDINARY_API_SECRET?.trim()),
        },
        diagnostico:
          "Sin config de Cloudinary. Los uploads escriben en disco local, que en Vercel es de solo lectura.",
      },
    });
  }

  const ping = await pingCloudinary(config);

  return NextResponse.json({
    driver,
    efimero: isEphemeralStorage(),
    cloudinary: {
      configurada: true,
      fuente: config.fuente,
      cloudName: config.cloudName,
      apiKeyTermina: config.apiKey.slice(-4),
      apiKeyLargo: config.apiKey.length,
      apiSecretLargo: config.apiSecret.length,
      credencialesValidas: ping.ok,
      respuesta: `${ping.status} ${ping.mensaje}`,
      // Sólo el 401 prueba que la credencial está mal: es lo que devuelve el
      // Basic auth de Cloudinary. Un 0 es que la request ni salió, y cualquier
      // otro código puede venir de un proxy en el medio. En esos casos se
      // muestra la respuesta cruda en vez de inventar un diagnóstico.
      diagnostico: ping.ok
        ? "Las credenciales son válidas. Si un upload igual falla, el problema no es la credencial."
        : ping.status === 401
          ? "Cloudinary rechaza estas credenciales. El api_secret no corresponde a esa api_key, o la key es de otro cloud. Copiala de nuevo del dashboard (Settings → API Keys) y volvé a deployar."
          : ping.status === 0
            ? "La request ni salió del servidor. Es un problema de red o de salida a internet, no de la credencial."
            : "Respuesta inesperada, mirala arriba. No llegó a ser un rechazo de credenciales de Cloudinary: puede haber un proxy o un firewall en el medio.",
    },
  });
}
