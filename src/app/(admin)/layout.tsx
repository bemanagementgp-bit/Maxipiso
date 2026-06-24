"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { FiLogOut } from "react-icons/fi";
import Link from "next/link";

const NAV = [
  { href: "/panel", label: "Productos" },
  { href: "/panel/importacion", label: "Importación" },
  { href: "/panel/reportes", label: "Reportes" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]">
        <div className="w-5 h-5 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <header className="bg-white border-b border-[#E0DED8] flex items-center px-6 lg:px-10 shrink-0 sticky top-0 z-30" style={{ height: "52px" }}>
        <div className="flex items-center gap-6 flex-1">
          <img src="/logo.svg" alt="Maxipiso" className="h-6 shrink-0" />
          <span className="text-[#E0DED8] select-none shrink-0">|</span>
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || (href !== "/panel" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`h-[52px] flex items-center px-4 text-[11px] font-medium transition-colors border-b-[2px] ${
                    active
                      ? "text-[#111] border-[#111]"
                      : "text-[#aaa] border-transparent hover:text-[#555]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[11px] text-[#aaa] hidden sm:block">{session.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-1.5 text-[11px] text-[#aaa] hover:text-[#111] transition-colors"
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
