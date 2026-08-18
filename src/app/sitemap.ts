import type { MetadataRoute } from "next";
import { articles } from "@/data/novedades";

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://maxipiso.com.ar").replace(/\/$/, "");

/**
 * Sitemap de las paginas publicas estables.
 *
 * A proposito NO incluye las fichas de producto (`/catalogo/[id]`): son miles,
 * cambian seguido y obligarian a consultar las 8 tablas en cada build. Si se
 * quieren indexar, conviene un sitemap paginado aparte.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/catalogo", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/empresa", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/distribuidores", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/novedades", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/novedades/ofertas-mayoristas", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/novedades/trabaja-con-maxipiso", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/novedades/proyectos-y-obras", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  const articleRoutes = articles.map((article) => ({
    path: `/novedades/${article.slug}`,
    priority: 0.5,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...articleRoutes].map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
