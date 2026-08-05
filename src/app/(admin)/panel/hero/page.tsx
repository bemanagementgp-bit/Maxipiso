"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiUpload, FiTrash2, FiChevronUp, FiChevronDown, FiPlay, FiImage, FiFilm } from "react-icons/fi";

type HeroItem = {
  id: string;
  type: "image" | "video";
  url: string;
  alt: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function HeroAdminPage() {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/hero");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      setError("Error al cargar los elementos del hero");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/hero", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchItems();
    } catch (err) {
      setError((err as Error).message || "Error al subir archivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este elemento del hero?")) return;
    try {
      const res = await fetch("/api/hero", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      await fetchItems();
    } catch {
      setError("Error al eliminar");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx];
    const b = items[swapIdx];

    try {
      await Promise.all([
        fetch("/api/hero", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }),
        }),
        fetch("/api/hero", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }),
        }),
      ]);
      await fetchItems();
    } catch {
      setError("Error al reordenar");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch("/api/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      await fetchItems();
    } catch {
      setError("Error al actualizar");
    }
  };

  const activeCount = items.filter((i) => i.isActive).length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hero</h1>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Imágenes y videos del carrusel de la home
          </p>
        </div>
        {items.length > 0 && (
          <label
            className={`flex items-center gap-2 px-4 py-2 bg-[#111] text-white text-[12px] font-medium cursor-pointer hover:bg-[#333] transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <FiUpload size={13} />
            {uploading ? "Subiendo..." : "Subir"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-[12px] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 text-[11px]">✕</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-[var(--bg-secondary)] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed transition-colors py-12 flex flex-col items-center gap-3 ${dragging ? "border-[#DF8635] bg-orange-50/50" : "border-[var(--border)] hover:border-gray-300"}`}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
            <FiImage size={20} className="text-[var(--text-secondary)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Arrastrá un archivo o hacé click para subir</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              JPG, PNG, WEBP (máx 5MB) — MP4, WEBM (máx 50MB)
            </p>
          </div>
          <label
            className={`mt-2 flex items-center gap-2 px-4 py-2 bg-[#DF8635] text-white text-[12px] font-medium cursor-pointer hover:bg-[#c97220] transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <FiUpload size={13} />
            {uploading ? "Subiendo..." : "Seleccionar archivo"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      ) : (
        <>
          <div className="text-[11px] text-[var(--text-secondary)] mb-3 flex items-center justify-between">
            <span>{items.length} elemento{items.length !== 1 ? "s" : ""} — {activeCount} activo{activeCount !== 1 ? "s" : ""}</span>
            {activeCount > 1 && (
              <span className="text-[#DF8635]">Carrusel automático activo</span>
            )}
          </div>

          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 px-4 py-3 transition-colors ${!item.isActive ? "opacity-40" : ""}`}
              >
                <div className="w-32 h-20 bg-[#0a0a0a] flex-shrink-0 overflow-hidden relative">
                  {item.type === "video" ? (
                    <>
                      <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <FiPlay size={18} className="text-white/90" />
                      </div>
                    </>
                  ) : (
                    <img src={item.url} alt={item.alt ?? ""} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.type === "video" ? (
                      <FiFilm size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
                    ) : (
                      <FiImage size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
                    )}
                    <p className="text-[12px] font-medium truncate">
                      {item.url.split("/").pop()}
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Posición {idx + 1} de {items.length}
                  </p>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleReorder(item.id, "up")}
                    disabled={idx === 0}
                    className="p-1.5 hover:bg-[var(--bg-secondary)] disabled:opacity-20 transition-colors"
                    title="Mover arriba"
                  >
                    <FiChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleReorder(item.id, "down")}
                    disabled={idx === items.length - 1}
                    className="p-1.5 hover:bg-[var(--bg-secondary)] disabled:opacity-20 transition-colors"
                    title="Mover abajo"
                  >
                    <FiChevronDown size={14} />
                  </button>
                </div>

                <button
                  onClick={() => handleToggle(item.id, item.isActive)}
                  className={`px-2.5 py-1 text-[11px] font-medium border transition-colors ${item.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}
                >
                  {item.isActive ? "Activo" : "Inactivo"}
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mt-3 border-2 border-dashed py-4 flex items-center justify-center gap-2 text-[12px] text-[var(--text-secondary)] transition-colors cursor-pointer ${dragging ? "border-[#DF8635] bg-orange-50/50" : "border-[var(--border)] hover:border-gray-300"}`}
            onClick={() => fileRef.current?.click()}
          >
            <FiUpload size={13} />
            Arrastrá o hacé click para agregar más
          </div>
        </>
      )}
    </div>
  );
}
