"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiLogOut, FiBox, FiUploadCloud, FiBarChart2, FiDollarSign } from "react-icons/fi";
import Link from "next/link";

const NAV = [
  { href: "/panel", label: "Productos", icon: FiBox },
  { href: "/panel/precios", label: "Precios y stock", icon: FiDollarSign },
  { href: "/panel/importacion", label: "Importación", icon: FiUploadCloud },
  { href: "/panel/reportes", label: "Reportes", icon: FiBarChart2 },
];

type Theme = "warm" | "gray" | "dark";

const THEMES: { id: Theme; label: string; preview: string }[] = [
  { id: "warm", label: "Claro",  preview: "#FAFAF8" },
  { id: "gray", label: "Grises", preview: "#BFBFBF" },
  { id: "dark", label: "Oscuro", preview: "#1C1C1C" },
];

function ThemeSwitcher({ current, onChange }: { current: Theme; onChange: (t: Theme) => void }) {
  const [open, setOpen] = useState(false);
  const cur = THEMES.find((t) => t.id === current)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-7 px-2.5 border border-[#E0DED8] hover:border-[#bbb] transition-colors text-[#aaa] hover:text-[#555]"
        title="Cambiar tema"
      >
        <span
          className="w-3 h-3 rounded-full border border-[#E0DED8] flex-shrink-0"
          style={{ background: cur.preview }}
        />
        <span className="text-[10px] uppercase tracking-[0.08em] hidden sm:block">{cur.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#E0DED8] shadow-lg overflow-hidden w-32" style={{ backgroundColor: "#ffffff", borderColor: "#E0DED8" }}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] transition-colors hover:bg-[#FAFAF8] ${
                  t.id === current ? "text-[#111] font-medium" : "text-[#777]"
                }`}
                style={{ color: t.id === current ? "#111111" : "#777777" }}
              >
                <span
                  className="w-3 h-3 rounded-full border border-[#E0DED8] shrink-0"
                  style={{ background: t.preview, borderColor: "#E0DED8" }}
                />
                {t.label}
                {t.id === current && <span className="ml-auto text-[10px]" style={{ color: "#DF8635" }}>✓</span>}
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
    const saved = (localStorage.getItem("admin_theme") as Theme) ?? "warm";
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("admin_theme", t);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]">
        <div className="w-5 h-5 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const headerBg = theme === "dark" ? "#0A0A0A" : theme === "gray" ? "#1E1E1E" : "#ffffff";
  const headerBorder = theme === "dark" ? "#1E1E1E" : theme === "gray" ? "#333333" : "#E0DED8";
  const headerText = theme === "dark" || theme === "gray" ? "#EEEEEE" : "#111111";
  const headerSubText = theme === "dark" || theme === "gray" ? "#666666" : "#aaaaaa";
  const pageBg = theme === "dark" ? "#111111" : theme === "gray" ? "#E4E4E4" : "#FAFAF8";
  const sidebarBg = theme === "dark" ? "#0A0A0A" : theme === "gray" ? "#1A1A1A" : "#111111";

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex"
      style={{ backgroundColor: pageBg }}
    >
      {/* Sidebar */}
      <aside
        className="w-[200px] shrink-0 flex flex-col sticky top-0 h-screen"
        style={{ backgroundColor: sidebarBg }}
      >
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
          className="flex items-center justify-end px-6 lg:px-10 shrink-0 sticky top-0 z-30"
          style={{ height: "52px", backgroundColor: headerBg, borderBottom: `1px solid ${headerBorder}` }}
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
