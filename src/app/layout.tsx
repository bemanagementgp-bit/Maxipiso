import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/SessionProvider";
import ShellLayout from "@/components/layout/ShellLayout";
import { IdiomaProvider } from "@/components/providers/IdiomaProvider";
import { idiomaActual, textos } from "@/lib/i18n/servidor";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
});

/**
 * Favicon del sitio.
 *
 * Está en Cloudinary y no como archivo en `src/app/`: la imagen la subió el
 * dueño ahí y no hay copia en el repo. Sirve igual —el navegador lo pide como
 * cualquier imagen— y el host ya está permitido en el CSP (`lib/image-hosts.ts`).
 * Si algún día se quiere servir desde el mismo dominio, alcanza con dejar el
 * PNG en `src/app/icon.png` y borrar el bloque `icons` de acá abajo.
 */
const FAVICON_URL =
  "https://res.cloudinary.com/dnaom2evd/image/upload/v1787081441/favicon_sp5ild.png";

/**
 * El titulo y la descripcion tambien siguen al idioma.
 *
 * Es `generateMetadata` y no una constante porque depende de la cookie: un
 * buscador o un enlace compartido tienen que mostrar el texto en el idioma de
 * quien lo vio. Las `keywords` quedan en espanol: apuntan al mercado argentino,
 * que es donde se busca este catalogo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await textos();
  return {
    title: t.meta.titulo,
    description: t.meta.descripcion,
    keywords: "pisos mayorista, porcelanato, madera, cerámica, revestimientos, distribuidores, importación argentina",
    // El favicon vive en Cloudinary, no en `src/app/icon.png`. Esta entrada gana
    // sobre la convención de archivo de Next, que si no inyecta su propio
    // `<link rel="icon">` y el navegador se queda con el que encuentra primero.
    icons: {
      icon: [{ url: FAVICON_URL, type: "image/png" }],
      shortcut: [{ url: FAVICON_URL, type: "image/png" }],
      apple: [{ url: FAVICON_URL }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const idioma = await idiomaActual();
  return (
    <html lang={idioma} className={`${geist.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <IdiomaProvider inicial={idioma}>
          <AuthSessionProvider>
            <ShellLayout>{children}</ShellLayout>
          </AuthSessionProvider>
        </IdiomaProvider>
      </body>
    </html>
  );
}
