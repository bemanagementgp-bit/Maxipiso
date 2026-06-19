import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import ChatWidget from "@/components/layout/ChatWidget";
import AuthSessionProvider from "@/components/providers/SessionProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maxipiso | Líderes en Pisos, Maderas y Revestimientos",
  description:
    "Maxipiso, el N°1 en Argentina en importación y distribución de pisos, maderas y revestimientos. Porcelanato, madera, cerámica y accesorios para distribuidores y profesionales.",
  keywords: "pisos mayorista, porcelanato, madera, cerámica, revestimientos, distribuidores, importación argentina",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
