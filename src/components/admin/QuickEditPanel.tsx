"use client";

import { useState, useEffect } from "react";
import { FiX, FiUpload } from "react-icons/fi";
import { Product } from "@/types";

const CATALOG_STRUCTURE = [
  { value: "Pisos", subs: ["Laminados HDF", "Laminados WTR", "O.R.C.A Vinil Pro", "Vinílico", "Porcelanato", "Madera", "Ingeniería"] },
  { value: "Maderas", subs: [] },
  { value: "Decks", subs: ["Madera", "WPC"] },
  { value: "Revestimientos", subs: ["Exterior - Acanalado Vertical", "Exterior - Siding", "Exterior - Perfiles WPC", "Interior - EPS", "Interior - Laqueados", "Interior - Acústico", "Interior - Placas", "Madera"] },
  { value: "Accesorios", subs: ["ACC PISOS - Zócalos Flotante", "ACC PISOS - Zócalos Vinílico", "ACC PISOS - Zócalos Madera", "ACC PISOS - Terminaciones de Aluminio", "ACC PISOS - Mantos", "ACC DECK", "ACC REVEST"] },
  { value: "Otros", subs: ["Adhesivos", "Lacas", "Selladores"] },
];

interface QuickEditPanelProps {
  isOpen: boolean;
  product: Product | null;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const fieldClass = "w-full px-3 py-2 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc] rounded-sm";
const labelClass = "block text-[9px] uppercase tracking-[0.08em] text-[#aaa] mb-1.5";

export function QuickEditPanel({ isOpen, product, isLoading = false, onClose, onSave }: QuickEditPanelProps) {
  const [form, setForm] = useState({
    sku: "", nombre: "", marca: "", descripcion: "",
    precio: 0, imagen: "", categoria: "", subcategoria: "", isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku,
        nombre: product.nombre,
        marca: product.marca,
        descripcion: product.descripcion || "",
        precio: product.precio,
        imagen: product.imagen || "",
        categoria: product.categoria || "",
        subcategoria: product.subcategoria || "",
        isActive: product.isActive,
      });
      setImagePreview(product.imagen || "");
    } else {
      setForm({ sku: "", nombre: "", marca: "", descripcion: "", precio: 0, imagen: "", categoria: "", subcategoria: "", isActive: true });
      setImagePreview("");
    }
    setError("");
    setImageFile(null);
  }, [product, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "precio" ? parseFloat(value) || 0 : type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      ...(name === "categoria" ? { subcategoria: "" } : {}),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.sku || !form.nombre || !form.marca) {
      setError("SKU, Nombre y Marca son requeridos");
      return;
    }

    let imagenUrl = form.imagen;
    if (imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      if (product) fd.append("productId", product.id);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Error al subir imagen");
        const data = await res.json();
        imagenUrl = data.data.url;
      } catch (err: any) {
        setError(err.message);
        return;
      }
    }

    onSave({ ...form, imagen: imagenUrl });
  };

  const currentSubs = CATALOG_STRUCTURE.find((c) => c.value === form.categoria)?.subs ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-[400px] bg-white border-l border-[#E0DED8] flex flex-col shadow-xl transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DED8] shrink-0">
          <div>
            <h2 className="text-[13px] font-medium text-[#111]">
              {product ? "Edición rápida" : "Nuevo producto"}
            </h2>
            {product && (
              <p className="text-[10px] text-[#aaa] font-mono mt-0.5">{product.sku}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-[#ccc] hover:text-[#777] transition-colors">
            <FiX size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          {/* SKU */}
          <div>
            <label className={labelClass}>SKU *</label>
            <input name="sku" value={form.sku} onChange={handleChange} disabled={!!product}
              placeholder="MP-0001" className={`${fieldClass} ${product ? "bg-[#FAFAF8] text-[#aaa]" : ""}`} />
          </div>

          {/* Nombre */}
          <div>
            <label className={labelClass}>Nombre del producto *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange}
              placeholder="Nombre completo del producto" className={fieldClass} />
          </div>

          {/* Marca + Precio en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Marca *</label>
              <input name="marca" value={form.marca} onChange={handleChange}
                placeholder="Marca" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">$</span>
                <input name="precio" type="number" value={form.precio} onChange={handleChange}
                  step="0.01" min="0" placeholder="0.00"
                  className={`${fieldClass} pl-6`} />
              </div>
            </div>
          </div>

          {/* Categoría + Subcategoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoría</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} className={fieldClass}>
                <option value="">Sin categoría</option>
                {CATALOG_STRUCTURE.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subcategoría</label>
              <select name="subcategoria" value={form.subcategoria} onChange={handleChange}
                className={fieldClass} disabled={!currentSubs.length}>
                <option value="">—</option>
                {currentSubs.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className={labelClass}>Estado</label>
            <div className="flex gap-2">
              {[{ v: true, l: "Activo" }, { v: false, l: "Inactivo" }].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isActive: v }))}
                  className={`flex-1 py-2 text-[11px] font-medium border rounded-sm transition-all ${
                    form.isActive === v
                      ? v ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-[#F0EEE8] border-[#E0DED8] text-[#777]"
                      : "border-[#E0DED8] text-[#ccc] hover:border-[#bbb]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
              placeholder="Descripción del producto" rows={3}
              className={`${fieldClass} resize-none`} />
          </div>

          {/* Imagen */}
          <div>
            <label className={labelClass}>Imagen</label>
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="preview" className="w-14 h-14 object-cover border border-[#E0DED8] rounded-sm" referrerPolicy="no-referrer" />
                <label className="flex items-center gap-1.5 text-[11px] text-[#888] hover:text-[#111] cursor-pointer transition-colors">
                  <FiUpload size={12} />
                  Cambiar imagen
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 w-full h-20 border border-dashed border-[#E0DED8] rounded-sm hover:border-[#aaa] cursor-pointer transition-colors">
                <FiUpload size={16} className="text-[#ccc]" />
                <span className="text-[10px] text-[#ccc] uppercase tracking-[0.06em]">Seleccionar archivo</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E0DED8] flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-[11px] font-medium text-[#888] hover:text-[#444] transition-colors rounded-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={isLoading}
            className="flex-1 py-2 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm transition-colors"
          >
            {isLoading ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </>
  );
}
