import type { NextConfig } from "next";
import { ALLOWED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 * - script-src: Next.js requiere 'unsafe-inline' para sus scripts de hidratación
 *   (sin nonces). 'unsafe-eval' solo en dev (React Refresh).
 * - img-src: tiles de OpenStreetMap + CDNs de imágenes permitidos.
 * - style-src: 'unsafe-inline' requerido por styled-jsx/Tailwind inline + Leaflet CSS de cdnjs.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  // Los hosts de imagen salen de la misma lista que `images.remotePatterns`,
  // asi no puede pasar que Next permita optimizar un host que el CSP bloquea.
  `img-src 'self' data: blob: https://*.tile.openstreetmap.org ${ALLOWED_IMAGE_HOSTS.map((h) => `https://${h}`).join(" ")}`,
  "media-src 'self' https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.tile.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS: forzar HTTPS por 2 años, incluyendo subdominios (solo tiene efecto sobre HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Evitar MIME-sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking (redundante con frame-ancestors, para navegadores viejos)
  { key: "X-Frame-Options", value: "DENY" },
  // No filtrar URLs internas en el Referer hacia otros orígenes
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilitar APIs del navegador que no se usan
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // No revelar que el sitio corre Next.js (header X-Powered-By)
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@libsql/client"],
  // Solo empaqueta los íconos usados de react-icons (evita cargar todo el set)
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
  images: {
    // Derivado de src/lib/image-hosts.ts, que es lo que también valida el panel
    // al guardar una URL de imagen. Una sola lista evita que el admin pueda
    // guardar una URL que después next/image rechaza en runtime.
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    // Evitar SVG remotos (vector de XSS vía imágenes)
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Los uploads de usuarios nunca deben ejecutarse como HTML/JS
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
