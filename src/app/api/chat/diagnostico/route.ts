import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Diagnóstico del chatbot.
 *
 * Nace de un caso concreto: Groq dio de baja los dos modelos que usaba el chat
 * y todo el mundo recibía "Error al procesar tu consulta", sin forma de saber
 * desde afuera si el problema era la credencial, el modelo o la red. La lista
 * de modelos disponibles depende de la cuenta, así que la única respuesta
 * confiable es preguntársela a Groq con la key de producción.
 *
 * **Nunca devuelve la API key.** Sólo si está presente y su largo.
 */

const MODELOS_CONFIGURADOS = (
  process.env.GROQ_MODELS ?? "openai/gpt-oss-120b,openai/gpt-oss-20b,llama-3.1-8b-instant"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export async function GET(req: NextRequest) {
  const rateErr = enforceRateLimit(req, { key: "chat-diag", limit: 20, windowMs: 5 * 60 * 1000 });
  if (rateErr) return rateErr;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      apiKeyPresente: false,
      modelosConfigurados: MODELOS_CONFIGURADOS,
      diagnostico:
        "Falta GROQ_API_KEY. El chat responde 503 y el widget queda inactivo; el resto del sitio no se ve afectado.",
    });
  }

  let disponibles: string[] = [];
  let respuesta = "";
  let ok = false;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const texto = await res.text();
    ok = res.ok;
    if (res.ok) {
      try {
        const json = JSON.parse(texto) as { data?: { id?: string }[] };
        disponibles = (json.data ?? []).map((m) => String(m.id)).filter(Boolean).sort();
      } catch {
        respuesta = texto.slice(0, 200);
      }
    } else {
      respuesta = `${res.status} ${texto.slice(0, 200)}`;
    }
  } catch (err) {
    respuesta = err instanceof Error ? err.message : String(err);
  }

  // Lo que realmente importa: de los que el código va a probar, cuáles existen.
  const configuradosQueExisten = MODELOS_CONFIGURADOS.filter((m) => disponibles.includes(m));

  return NextResponse.json({
    apiKeyPresente: true,
    apiKeyLargo: apiKey.length,
    modelosConfigurados: MODELOS_CONFIGURADOS,
    configuradosQueExisten,
    modelosDisponibles: disponibles,
    respuesta: respuesta || `${disponibles.length} modelos`,
    diagnostico: !ok
      ? "No se pudo consultar la lista de modelos. Si el código es 401, la GROQ_API_KEY es inválida."
      : configuradosQueExisten.length > 0
        ? "Hay al menos un modelo configurado que existe. Si el chat igual falla, el problema no es el modelo."
        : "NINGUNO de los modelos configurados existe en esta cuenta: por eso el chat devuelve error. Elegí uno de `modelosDisponibles` y ponelo en la variable GROQ_MODELS.",
  });
}
