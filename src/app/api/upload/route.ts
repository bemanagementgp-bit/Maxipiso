import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomBytes } from "crypto";
import { detectImageMime, verifyOrigin } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "productos");
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
    if (typeof productIdRaw === "string" && productIdRaw.length > 0) {
      if (!CUID_RE.test(productIdRaw)) {
        return NextResponse.json({ error: "productId inválido" }, { status: 400 });
      }
      const exists = await prisma.product.findUnique({
        where: { id: productIdRaw },
        select: { id: true },
      });
      if (!exists) {
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

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = EXT_BY_MIME[detectedMime];
    const uniqueId = randomBytes(16).toString("hex");
    const filename = `${uniqueId}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Defensa adicional: asegurar que el path resultante esté dentro de UPLOAD_DIR
    if (!filepath.startsWith(UPLOAD_DIR + (process.platform === "win32" ? "\\" : "/"))) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
    }

    await writeFile(filepath, buffer);

    const url = `/uploads/productos/${filename}`;

    if (productId) {
      const imagenProducto = await prisma.imagenProducto.create({
        data: {
          productId,
          url,
          // No guardamos file.name del cliente (podría contener payload XSS)
          nombre: filename,
        },
      });
      return NextResponse.json(
        { success: true, data: { url, imagenProducto } },
        { status: 201 },
      );
    }

    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch (error) {
    console.error("[upload] error:", error);
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
  }
}
