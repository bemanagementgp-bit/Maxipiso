"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiShield, FiX } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const WA_HREF =
  "https://wa.me/5422143888894?text=Hola%2C%20quiero%20solicitar%20acceso%20al%20cat%C3%A1logo%20mayorista";

export default function LoginModal({ onClose }: { onClose: (loggedIn?: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        totp: needsTotp ? totp : "",
        redirect: false,
      });

      if (result?.error === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setError("");
      } else if (result?.error) {
        setError("Credenciales inválidas");
      } else if (result?.ok) {
        window.location.href = window.location.pathname + window.location.search;
        return;
      }
    } catch {
      setError("No se pudo iniciar sesión. Intentá nuevamente.");
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose()} />

      <div className="relative bg-white w-full max-w-[440px] mx-4 p-10 shadow-2xl">
        <button
          onClick={() => onClose()}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX size={20} />
        </button>

        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">
          Acceso mayorista
        </p>
        <h2 className="text-xl font-semibold text-[#111] tracking-tight mb-2">
          {needsTotp ? "Verificación" : "Iniciar sesión"}
        </h2>
        {!needsTotp && (
          <p className="text-sm text-gray-400 mb-8">
            Accedé al catálogo con precios exclusivos para distribuidores.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!needsTotp ? (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase tracking-[0.12em] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-sm text-[#111] placeholder-gray-300 focus:outline-none focus:border-[#DF8635] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase tracking-[0.12em] mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-sm text-[#111] placeholder-gray-300 focus:outline-none focus:border-[#DF8635] transition-colors"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] text-gray-400 uppercase tracking-[0.12em] mb-2">
                Código 2FA
              </label>
              <div className="relative">
                <FiShield size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-sm text-[#111] placeholder-gray-300 focus:outline-none focus:border-[#DF8635] tracking-[0.5em] transition-colors"
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#DF8635] text-white font-semibold py-3.5 text-sm transition-all duration-200 hover:bg-[#c97220] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {needsTotp ? "Verificar" : "Acceder"}
                <FiArrowRight size={14} />
              </>
            )}
          </button>

          {needsTotp && (
            <button
              type="button"
              onClick={() => { setNeedsTotp(false); setError(""); }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Volver
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-3 text-sm transition-all duration-200 hover:bg-[#1ead55]"
          >
            <FaWhatsapp size={16} />
            Solicitar acceso por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
