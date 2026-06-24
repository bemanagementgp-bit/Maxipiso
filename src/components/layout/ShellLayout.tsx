"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import ChatWidget from "./ChatWidget";

const NO_SHELL_ROUTES = ["/auth", "/panel"];

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = NO_SHELL_ROUTES.some((r) => pathname.startsWith(r));

  if (hideShell) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </>
  );
}
