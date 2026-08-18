// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectImageMime, verifyOrigin } from "@/lib/security";
import { getStorage, StorageError } from "@/lib/storage";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export async function GET() {
  try {
    const items = await prisma.heroMedia.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error("[hero] GET error:", err);
    return NextResponse.json({ success: false, error: "Error al obtener hero media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  const rateErr = enforceRateLimit(req, { key: "hero-upload", limit: 10, windowMs: 5 * 60 * 1000 });
  if (rateErr) return rateErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const mime = file.type;
    const isImage = IMAGE_MIME.has(mime);
    const isVideo = VIDEO_MIME.has(mime);
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Formato no soportado. Usar JPG, PNG, WEBP, MP4 o WEBM" }, { status: 400 });
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `Archivo demasiado grande (máx ${maxSize / 1024 / 1024}MB)` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Las imagenes se validan por magic bytes, igual que en /api/upload: el
    // Content-Type que manda el cliente no es prueba de nada. Los videos se
    // quedan con la validacion por MIME declarado (no hay detector propio),
    // pero igual se guardan con nombre aleatorio y se sirven con sandbox.
    if (isImage) {
      const detected = detectImageMime(buffer);
      if (!detected || detected !== mime) {
        return NextResponse.json(
          { error: "El contenido del archivo no coincide con una imagen válida" },
          { status: 400 },
        );
      }
    }

    const { url } = await getStorage().save(buffer, {
      folder: "hero",
      ext: EXT_MAP[mime],
      contentType: mime,
    });
    const alt = (formData.get("alt") as string) ?? "";

    const maxOrder = await prisma.heroMedia.aggregate({ _max: { sortOrder: true } });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const item = await prisma.heroMedia.create({
      data: {
        type: isImage ? "image" : "video",
        url,
        alt: alt.slice(0, 200),
        sortOrder: nextOrder,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof StorageError) {
      console.error("[hero] storage:", err.message);
      return NextResponse.json({ success: false, error: err.userMessage }, { status: err.status });
    }
    console.error("[hero] POST error:", err);
    return NextResponse.json({ success: false, error: "Error al subir archivo" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const { id, sortOrder, isActive, alt } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof sortOrder === "number") data.sortOrder = sortOrder;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof alt === "string") data.alt = alt.slice(0, 200);

    const item = await prisma.heroMedia.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    console.error("[hero] PUT error:", err);
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const originErr = verifyOrigin(req);
  if (originErr) return originErr;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const item = await prisma.heroMedia.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Borrar el archivo del store (no-op si ya no existe).
    await getStorage().remove(item.url);

    await prisma.heroMedia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hero] DELETE error:", err);
    return NextResponse.json({ success: false, error: "Error al eliminar" }, { status: 500 });
  }
}
