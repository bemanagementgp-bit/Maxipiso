"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiLogOut, FiBox, FiUploadCloud, FiBarChart2, FiDollarSign, FiTag, FiImage, FiActivity } from "react-icons/fi";
import Link from "next/link";

const NAV = [
  { href: "/panel", label: "Productos", icon: FiBox },
  { href: "/panel/precios", label: "Precios y stock", icon: FiDollarSign },
  { href: "/panel/stickers", label: "Stickers", icon: FiTag },
  { href: "/panel/portadas", label: "Portadas", icon: FiImage },
  { href: "/panel/importacion", label: "Importación", icon: FiUploadCloud },
  { href: "/panel/reportes", label: "Reportes", icon: FiBarChart2 },
  { href: "/panel/diagnostico", label: "Estado de la base", icon: FiActivity },
];

type Theme = "warm" | "dark";

/**
 * Claro y oscuro, nada más.
 *
 * Hubo un tercer tema de grises que apagaba el naranja de la marca y dejaba
 * todo en la misma escala: no resolvía nada que no resolviera el claro y era
 * una tercera variante que mantener en cada pantalla nueva.
 */
const THEMES: { id: Theme; label: string; preview: string }[] = [
  { id: "warm", label: "Claro",  preview: "#FAFAF8" },
  { id: "dark", label: "Oscuro", preview: "#17181A" },
];

/**
 * Cambia el tema.
 *
 * Los colores van en clases y no en `style` inline: el tema se aplica con CSS
 * que reasigna esas clases, y un `style` inline le gana a todo, así que un
 * color escrito ahí se quedaba claro en modo oscuro. La única excepción es el
 * punto de color de cada opción, que justamente muestra el color del tema.
 */
function ThemeSwitcher({ current, onChange }: { current: Theme; onChange: (t: Theme) => void }) {
  const [open, setOpen] = useState(false);
  const cur = THEMES.find((t) => t.id === current)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-7 px-2.5 border border-[#E0DED8] hover:border-[#bbb] transition-colors text-[#aaa] hover:text-[#555] rounded-sm"
        title="Cambiar tema"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="w-3 h-3 rounded-full border border-[#E0DED8] shrink-0"
          style={{ background: cur.preview }}
        />
        <span className="text-[10px] uppercase tracking-[0.08em] hidden sm:block">{cur.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#E0DED8] shadow-lg overflow-hidden w-32 rounded-sm"
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="option"
                aria-selected={t.id === current}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] transition-colors hover:bg-[#FAFAF8] ${
                  t.id === current ? "text-[#111] font-medium" : "text-[#777]"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-[#E0DED8] shrink-0"
                  style={{ background: t.preview }}
                />
                {t.label}
                {t.id === current && <span className="ml-auto text-[10px] text-[#DF8635]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("warm");

  useEffect(() => {
    // Lo guardado puede ser "gray", el tema que ya no existe, o cualquier cosa
    // si alguien tocó el storage: lo que no sea un tema válido vuelve a claro,
    // y se reescribe para no quedar arrastrando un valor muerto.
    const saved = localStorage.getItem("admin_theme");
    const valido: Theme = saved === "dark" ? "dark" : "warm";
    setTheme(valido);
    if (saved !== valido) localStorage.setItem("admin_theme", valido);
  }, []);

  // El atributo vive en <html>, puesto a mano y no renderizado por React: el
  // script del layout raíz ya lo dejó escrito antes de hidratar, y si además
  // saliera del JSX el HTML del servidor diría "warm" contra un DOM que dice
  // "dark". Eso es un desajuste de hidratación, y React no lo corrige.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Al salir del panel se quita: el tema oscuro reasigna clases que el sitio
  // público también usa, y quedaría el catálogo en negro.
  useEffect(() => () => { delete document.documentElement.dataset.theme; }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("admin_theme", t);
  };

  if (status === "loading") {
    return (
      <div className="admin-page flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="admin-page min-h-screen flex">
      {/* Sidebar */}
      <aside className="admin-sidebar w-[200px] shrink-0 flex flex-col sticky top-0 h-screen">
        <div className="flex items-center px-5 h-[52px] shrink-0 border-b border-white/5">
          <span className="text-[18px] font-bold tracking-tight shrink-0"><span style={{ color: "#ffffff" }}>MAXI</span><span style={{ color: "#DF8635" }}>PISO</span></span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/panel" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[12px] font-medium transition-all duration-150"
                style={{
                  color: active ? "#ffffff" : "rgba(255,255,255,0.4)",
                  backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
                }}
              >
                <Icon size={15} style={{ opacity: active ? 1 : 0.5 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <div className="px-3 mb-3">
            <p className="text-[10px] text-white/30 truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-white/40 hover:text-white/70 transition-colors rounded-md hover:bg-white/5"
          >
            <FiLogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="admin-header flex items-center justify-end px-6 lg:px-10 shrink-0 sticky top-0 z-30"
          style={{ height: "52px" }}
        >
          <div className="flex items-center gap-4">
            <ThemeSwitcher current={theme} onChange={handleThemeChange} />
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
