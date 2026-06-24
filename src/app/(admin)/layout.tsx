"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import Link from "next/link";

const NAV = [
  { href: "/panel", label: "Productos" },
  { href: "/panel/importacion", label: "Importación" },
  { href: "/panel/reportes", label: "Reportes" },
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
  const activeNavBorder = theme === "dark" || theme === "gray" ? "#EEEEEE" : "#111111";
  const pageBg = theme === "dark" ? "#111111" : theme === "gray" ? "#E4E4E4" : "#FAFAF8";

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: pageBg }}
    >
      <header
        className="flex items-center px-6 lg:px-10 shrink-0 sticky top-0 z-30"
        style={{ height: "52px", backgroundColor: headerBg, borderBottom: `1px solid ${headerBorder}` }}
      >
        <div className="flex items-center gap-6 flex-1">
          <img src="/logo.svg" alt="Maxipiso" className="h-6 shrink-0" style={{ filter: theme !== "warm" ? "brightness(0) invert(1)" : "none" }} />
          <span style={{ color: headerBorder }} className="select-none shrink-0">|</span>
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || (href !== "/panel" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className="h-[52px] flex items-center px-4 text-[11px] font-medium transition-colors border-b-[2px]"
                  style={{
                    color: active ? headerText : headerSubText,
                    borderBottomColor: active ? activeNavBorder : "transparent",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitcher current={theme} onChange={handleThemeChange} />
          <span className="text-[11px] hidden sm:block" style={{ color: headerSubText }}>
            {session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: headerSubText }}
          >
            <FiLogOut size={13} />
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
