"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string; waUrl?: string; storeUrl?: string };

type ExtractedLead = {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
};

type LeadCache = { nombre: string; telefono: string; email?: string };
const LEAD_STORAGE_KEY = "maxipiso_lead_v1";

function loadLeadCache(): LeadCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeadCache;
    if (parsed && typeof parsed.nombre === "string" && typeof parsed.telefono === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveLeadCache(lead: LeadCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
  } catch {
    /* ignore */
  }
}

const QUICK_ACTIONS = [
  "¿Qué tipos de pisos tienen?",
  "Busco piso para exterior",
  "Quiero ver maderas macizas",
];

const WELCOME: Message = {
  role: "assistant",
  content: "¡Hola! Soy Nacho, tu asesor de Maxipiso 👋 Contame qué estás buscando — tipo de ambiente, estilo, m² aproximados — y te oriento con las mejores opciones.",
};

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bubble, setBubble] = useState(false);
  // Índices de mensajes cuyo waUrl ya derivó al cliente a WhatsApp (lead registrado).
  const [sentLeads, setSentLeads] = useState<Set<number>>(new Set());
  // Últimos datos del lead extraídos por Nacho (nombre/email/teléfono que el usuario mencionó en el chat).
  const [extractedLead, setExtractedLead] = useState<ExtractedLead>({
    nombre: null,
    email: null,
    telefono: null,
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setBubble(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      setBubble(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      inputRef.current?.focus();
    }
  }, [open, messages]);

  if (pathname === "/panel" || pathname.startsWith("/panel/")) {
    return null;
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || data.error || "Hubo un error. Intentá de nuevo.",
        waUrl: data.waUrl ?? undefined,
        storeUrl: data.storeUrl ?? undefined,
      };
      setMessages([...next, assistantMsg]);

      // Mergeamos cualquier dato nuevo que Nacho extrajo del mensaje del usuario,
      // manteniendo lo que ya habíamos detectado antes.
      if (data.lead && typeof data.lead === "object") {
        setExtractedLead((prev) => ({
          nombre: data.lead.nombre ?? prev.nombre,
          email: data.lead.email ?? prev.email,
          telefono: data.lead.telefono ?? prev.telefono,
        }));
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Hubo un error. Intentá de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-28 right-5 z-50 w-[420px] max-h-[640px] flex flex-col rounded-2xl overflow-hidden"
          style={{
            boxShadow: "0 8px 40px rgba(223,134,53,0.18), 0 2px 16px rgba(0,0,0,0.18)",
            border: "1.5px solid rgba(223,134,53,0.18)",
            background: "#fff",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{ background: "linear-gradient(135deg, #1a1a1a 60%, #2d1a00 100%)" }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #DF8635, #f0a44e)" }}
                >
                  N
                </div>
                {/* Online dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#1a1a1a] rounded-full" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">Nacho</p>
                <p className="text-[#DF8635] text-xs font-medium">Asesor Maxipiso · En línea</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                {m.role === "assistant" && (
                  <div className="flex items-end gap-2 mb-0.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg, #DF8635, #f0a44e)" }}
                    >
                      N
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Nacho</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#DF8635] text-white rounded-br-sm ml-6"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>

                {/* WhatsApp CTA — captura lead antes de redirigir */}
                {m.role === "assistant" && m.waUrl && (
                  <LeadHandoff
                    waUrl={m.waUrl}
                    mensajeInicial={
                      // Último mensaje del usuario previo a esta respuesta
                      [...messages.slice(0, i)].reverse().find((x) => x.role === "user")?.content ??
                      m.content
                    }
                    alreadySent={sentLeads.has(i)}
                    extractedLead={extractedLead}
                    onSent={() =>
                      setSentLeads((prev) => {
                        const next = new Set(prev);
                        next.add(i);
                        return next;
                      })
                    }
                  />
                )}

                {/* Tienda online CTA */}
                {m.role === "assistant" && m.storeUrl && (
                  <Link
                    href={m.storeUrl}
                    className="mt-2 flex items-center gap-2 bg-[#DF8635] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#c97220] transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Ver tienda online
                  </Link>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #DF8635, #f0a44e)" }}
                >
                  N
                </div>
                <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick actions — solo al inicio */}
          {messages.length === 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 bg-gray-50 border-t border-gray-100 shrink-0">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs border border-[#DF8635]/30 rounded-full px-3 py-1 text-[#DF8635] hover:bg-[#DF8635] hover:text-white transition-colors bg-white font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 items-center bg-white shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribile a Nacho..."
              disabled={loading}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DF8635] disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
              style={{ background: "linear-gradient(135deg, #DF8635, #f0a44e)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Proactive bubble */}
      {bubble && !open && (
        <div className="fixed bottom-28 right-5 z-50 flex items-end gap-2 animate-fade-up">
          <div className="relative bg-white text-[#111111] text-sm font-medium px-4 py-3 rounded-2xl rounded-br-sm max-w-[230px]"
            style={{ boxShadow: "0 4px 20px rgba(223,134,53,0.2), 0 2px 8px rgba(0,0,0,0.12)" }}>
            <p className="font-semibold text-[#DF8635] text-xs mb-0.5">Nacho · Asesor Maxipiso</p>
            Hola, soy Nacho. Estoy listo para ayudarte 👋
            <div className="absolute -bottom-2 right-4 w-3 h-3 bg-white rotate-45"
              style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.06)" }} />
          </div>
          <button
            onClick={() => setBubble(false)}
            className="mb-1 w-5 h-5 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Floating button */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir chat"
          className="relative w-16 h-16 rounded-full text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #DF8635, #f0a44e)", boxShadow: "0 4px 24px rgba(223,134,53,0.5), 0 2px 8px rgba(0,0,0,0.2)" }}
        >
          {/* Pulse ring */}
          {!open && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: "#DF8635" }}
            />
          )}
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// LeadHandoff: mini-form que captura nombre + WhatsApp antes de
// abrir WhatsApp. Solo abre wa.me si /api/crm/leads responde OK.
// ──────────────────────────────────────────────────────────────────
function LeadHandoff({
  waUrl,
  mensajeInicial,
  alreadySent,
  extractedLead,
  onSent,
}: {
  waUrl: string;
  mensajeInicial: string;
  alreadySent: boolean;
  extractedLead: ExtractedLead;
  onSent: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Precargar: prioridad cache localStorage > datos extraídos por Nacho.
  useEffect(() => {
    const cached = loadLeadCache();
    setNombre(cached?.nombre || extractedLead.nombre || "");
    setTelefono(cached?.telefono || extractedLead.telefono || "");
    setEmail(cached?.email || extractedLead.email || "");
  }, [extractedLead.nombre, extractedLead.email, extractedLead.telefono]);

  // Si ya fue enviado en esta sesión para este mensaje, solo confirmar
  if (alreadySent) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Te derivamos con un asesor. Si no se abrió WhatsApp,{" "}
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
          hacé clic acá
        </a>
        .
      </div>
    );
  }

  const cached = typeof window !== "undefined" ? loadLeadCache() : null;
  const hasCachedData = !!cached && !editing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const nombreTrim = nombre.trim();
    const telTrim = telefono.trim();
    const emailTrim = email.trim();

    if (nombreTrim.length < 2) {
      setError("Ingresá tu nombre.");
      return;
    }
    if (telTrim.replace(/\D+/g, "").length < 8) {
      setError("Ingresá un WhatsApp válido.");
      return;
    }
    if (emailTrim.length === 0) {
      setError("Ingresá tu email.");
      return;
    }
    // Validación básica de email (la del backend es estricta)
    if (!/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(emailTrim)) {
      setError("Ingresá un email válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreTrim,
          telefono: telTrim,
          email: emailTrim,
          url_origen: window.location.href,
          mensaje_inicial: mensajeInicial,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No pudimos registrar tus datos. Intentá de nuevo.");
        return;
      }

      saveLeadCache({
        nombre: nombreTrim,
        telefono: telTrim,
        email: emailTrim,
      });
      onSent();
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // Vista compacta si ya tenemos datos cacheados
  if (hasCachedData && cached) {
    return (
      <div className="mt-2 w-full max-w-[340px] bg-white border border-[#25D366]/30 rounded-xl p-3 shadow-sm">
        <p className="text-[11px] text-gray-500 mb-1">Te derivamos como:</p>
        <p className="text-sm font-semibold text-gray-800 leading-tight">{cached.nombre}</p>
        <p className="text-xs text-gray-600 mb-2">{cached.telefono}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setNombre(cached.nombre);
              setTelefono(cached.telefono);
              setEmail(cached.email ?? "");
              // Reusamos handleSubmit con un evento sintético
              await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
            }}
            disabled={submitting}
            className="flex-1 bg-[#25D366] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#1ebe5d] transition-colors disabled:opacity-60"
          >
            {submitting ? "Enviando…" : "Ir a WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-[#DF8635] font-medium px-2 hover:underline"
          >
            Usar otros datos
          </button>
        </div>
        {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 w-full max-w-[340px] bg-white border border-[#25D366]/30 rounded-xl p-3 shadow-sm space-y-2"
    >
      <p className="text-[11px] text-gray-500 leading-snug">
        Dejanos tus datos y te derivamos con un asesor por WhatsApp.
      </p>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre*"
        required
        maxLength={150}
        disabled={submitting}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 disabled:opacity-60"
      />
      <input
        type="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="WhatsApp* (ej: +54 9 221 1234567)"
        required
        maxLength={30}
        disabled={submitting}
        inputMode="tel"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 disabled:opacity-60"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email*"
        required
        maxLength={150}
        disabled={submitting}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 disabled:opacity-60"
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#1ebe5d] transition-colors disabled:opacity-60"
      >
        {submitting ? (
          "Enviando…"
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Continuar a WhatsApp
          </>
        )}
      </button>
    </form>
  );
}
