"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiMail, FiLock, FiShield, FiArrowRight } from "react-icons/fi";

export default function LoginPage() {
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
        router.push("/panel");
      }
    } catch {
      setError("No se pudo iniciar sesión. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">

      {/* ── Lado izquierdo — imagen de marca ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="/flota.jpg"
          alt="Maxipiso"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay oscuro degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Contenido sobre la imagen */}
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Logo */}
          <div>
            <img src="/logo.svg" alt="Maxipiso" className="h-9 brightness-0 invert" />
          </div>

          {/* Tagline inferior */}
          <div>
            <p className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3">
              Panel de Administración
            </p>
            <h2 className="text-white text-4xl font-bold leading-tight mb-4">
              El N°1 en importación<br />y distribución de pisos
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              Más de 60 años liderando el mercado argentino con la mayor variedad de pisos, maderas y revestimientos.
            </p>

          </div>
        </div>
      </div>

      {/* ── Lado derecho — formulario ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden mb-10 flex justify-center">
            <img src="/logo.svg" alt="Maxipiso" className="h-8" />
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-[#111111] mb-1">
              {needsTotp ? "Verificación en dos pasos" : "Acceso al panel"}
            </h1>
            <p className="text-gray-400 text-sm">
              {needsTotp
                ? "Ingresá el código de tu app autenticadora"
                : "Ingresá tus credenciales para continuar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!needsTotp ? (
              <>
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <FiMail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="admin@maxipiso.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111] placeholder-gray-300 focus:outline-none focus:border-[#DF8635] focus:ring-2 focus:ring-[#DF8635]/10 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <FiLock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111] placeholder-gray-300 focus:outline-none focus:border-[#DF8635] focus:ring-2 focus:ring-[#DF8635]/10 transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* TOTP */
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Código 2FA
                </label>
                <div className="relative">
                  <FiShield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
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
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111] placeholder-gray-300 focus:outline-none focus:border-[#DF8635] focus:ring-2 focus:ring-[#DF8635]/10 tracking-[0.5em] text-center transition-all"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  También podés usar un código de recuperación.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#111111] hover:bg-[#DF8635] text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {needsTotp ? "Verificar" : "Ingresar"}
                  <FiArrowRight size={16} />
                </>
              )}
            </button>

            {needsTotp && (
              <button
                type="button"
                onClick={() => { setNeedsTotp(false); setError(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                ← Volver
              </button>
            )}
          </form>

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-gray-300">
            Acceso restringido — Solo personal autorizado
          </p>
        </div>
      </div>

    </div>
  );
}
