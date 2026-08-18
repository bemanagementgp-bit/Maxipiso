import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearCatalogCache } from "@/lib/catalog-cache";
import { detectImageMime, verifyOrigin } from "@/lib/security";
import { getStorage, StorageError } from "@/lib/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { findProductById, getDelegate } from "@/lib/all-products";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const CUID_RE = /^c[a-z0-9]{20,30}$/i;

// POST: Upload de imagen de producto
export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, {
    key: "upload",
    limit: 30,
    windowMs: 5 * 60 * 1000,
  });
  if (rateErr) return rateErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para subir imágenes" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const productIdRaw = formData.get("productId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo no provisto" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Archivo demasiado grande. Máximo 5MB" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo JPG, PNG o WEBP" },
        { status: 400 },
      );
    }

    // Validar productId si vino
    let productId: string | null = null;
    let foundProduct: Awaited<ReturnType<typeof findProductById>> | null = null;
    if (typeof productIdRaw === "string" && productIdRaw.length > 0) {
      if (!CUID_RE.test(productIdRaw)) {
        return NextResponse.json({ error: "productId inv\u00e1lido" }, { status: 400 });
      }
      foundProduct = await findProductById(productIdRaw);
      if (!foundProduct) {
        return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      }
      productId = productIdRaw;
    }

    // Validar magic bytes reales — no confiar en file.type
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime || !ALLOWED_MIME.has(detectedMime)) {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con una imagen válida" },
        { status: 400 },
      );
    }

    const { url } = await getStorage().save(buffer, {
      folder: "productos",
      ext: EXT_BY_MIME[detectedMime],
      contentType: detectedMime,
    });

    if (productId && foundProduct) {
      const delegate = getDelegate(foundProduct.tableKey);
      const existing: string[] = (() => {
        const rawValue = String(foundProduct.raw.imagenes ?? "").trim();
        if (!rawValue) return [];
        try {
          const parsed = JSON.parse(rawValue);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [String(parsed)];
        } catch {
          return [rawValue];
        }
      })();

      const nextImages = existing.includes(url) ? existing : [...existing, url];
      await delegate.update({ where: { id: productId }, data: { imagenes: JSON.stringify(nextImages) } });
    }

    clearCatalogCache();
    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageError) {
      console.error("[upload] storage:", error.message);
      return NextResponse.json({ error: error.userMessage }, { status: error.status });
    }
    console.error("[upload] error:", error);
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
  }
}

