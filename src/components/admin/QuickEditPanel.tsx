// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { FiX, FiUpload, FiLoader, FiPackage, FiArrowLeft, FiArrowRight, FiTrash2 } from "react-icons/fi";
import { CATEGORY_CONFIGS } from "@/lib/category-fields";
import { MetadataEditor } from "./MetadataEditor";

type Meta = { clave: string; valor: string };

const TABLA_OPTIONS = CATEGORY_CONFIGS.map((c) => ({ value: c.tabla, label: c.label }));

const SECTIONS = [
  {
    title: "Información general",
    keys: ["sku", "nombre", "marca", "codigo", "linea", "especie", "acabado", "terminacion", "material", "uso", "descripcion"],
  },
  {
    title: "Clasificación",
    keys: ["categoriaPrincipal", "categoriaSecundaria", "categoriaTerciaria", "tipoProducto", "subtipo", "subtipo2", "tipoDeUso"],
  },
  {
    title: "Dimensiones",
    keys: [
      "espesor", "espesorUm", "espesorTotal", "espesorTotalUm",
      "espesorComposicion", "espesorComposicionUm", "espesorLamina", "espesorLaminaUm",
      "capaDeUso", "abrasion", "mantoIncorporado", "bisel",
      "ancho", "anchoUm", "largo", "largoUm",
      "base", "baseUm", "baseTabla", "baseTablUm",
      "dimensiones", "colores", "medidas", "secado", "espesoresDisponibles",
    ],
  },
  {
    title: "Precios y logística",
    keys: [
      "precioM2", "precio", "precioTabla", "precioMLineal", "precioMl",
      "moneda", "unidadMedida", "precioCaja", "precioEnvioCaja", "flete",
      "tablasPorCaja", "pesoCaja", "cajasPallet", "pesoPallet",
      "stock", "origen",
    ],
  },
  {
    title: "Archivos y garantía",
    keys: ["garantia", "fichaTecnica", "archivoInstalacion"],
  },
];

const FIELD_LABELS: Record<string, string> = {
  sku: "SKU", nombre: "Nombre", marca: "Marca", descripcion: "Descripción",
  categoriaPrincipal: "Cat. principal", categoriaSecundaria: "Cat. secundaria",
  categoriaTerciaria: "Cat. terciaria", tipoProducto: "Tipo producto",
  subtipo: "Subtipo", subtipo2: "Subtipo 2", origen: "Origen", codigo: "Código",
  linea: "Línea", especie: "Especie", acabado: "Acabado", terminacion: "Terminación",
  material: "Material", uso: "Uso", tipoDeUso: "Tipo de uso",
  espesor: "Espesor", espesorUm: "Ud. espesor", espesorTotal: "Espesor total",
  espesorTotalUm: "Ud. espesor total", espesorComposicion: "Espesor composición",
  espesorComposicionUm: "Ud. espesor comp.", espesorLamina: "Espesor lámina",
  espesorLaminaUm: "Ud. espesor lámina", capaDeUso: "Capa de uso",
  abrasion: "Abrasión", mantoIncorporado: "Manto incorporado", bisel: "Bisel",
  ancho: "Ancho", anchoUm: "Ud. ancho", largo: "Largo", largoUm: "Ud. largo",
  base: "Base", baseUm: "Ud. base", baseTabla: "Base tabla", baseTablUm: "Ud. base tabla",
  dimensiones: "Dimensiones", colores: "Colores", medidas: "Medidas",
  secado: "Secado", espesoresDisponibles: "Espesores disponibles",
  tablasPorCaja: "Tablas x caja", precioM2: "Precio x m²", precio: "Precio",
  precioTabla: "Precio x tabla", precioMLineal: "Precio m lineal", precioMl: "Precio x ml",
  moneda: "Moneda", unidadMedida: "Unidad medida", precioCaja: "Precio x caja",
  precioEnvioCaja: "Envío x caja", flete: "Flete", pesoCaja: "Peso x caja",
  cajasPallet: "Cajas x pallet", pesoPallet: "Peso x pallet", stock: "Stock",
  garantia: "Garantía", fichaTecnica: "Ficha técnica", archivoInstalacion: "Archivo instalación",
};

const NUMBER_FIELDS = new Set([
  "precioM2", "precio", "precioTabla", "precioMLineal", "precioMl",
  "precioCaja", "precioEnvioCaja", "flete", "pesoCaja", "pesoPallet",
  "tablasPorCaja", "cajasPallet", "stock",
]);

const HIDDEN_FIELDS = new Set(["id", "imagenes", "metadatos", "isActive", "createdAt", "updatedAt", "_tabla", "_tablaLabel"]);

interface QuickEditPanelProps {
  isOpen: boolean;
  productId: string | null;
  isNew: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const fieldClass = "w-full px-3 py-2 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc] rounded-sm";
const labelClass = "block text-[9px] uppercase tracking-[0.08em] text-[#aaa] mb-1";

export function QuickEditPanel({ isOpen, productId, isNew, isLoading = false, onClose, onSave }: QuickEditPanelProps) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [tabla, setTabla] = useState("");
  const [metadatos, setMetadatos] = useState<Meta[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setImageFile(null);
    setNewImagePreview("");

    if (isNew) {
      setForm({ isActive: true });
      setTabla("");
      setMetadatos([]);
      setImages([]);
      return;
    }

    if (!productId) return;
    setFetching(true);
    fetch(`/api/productos/${productId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        const p = d.data;
        setForm(p);
        setTabla(p._tabla ?? "");
        const imgs = (() => { try { const arr = JSON.parse(p.imagenes); return Array.isArray(arr) ? arr.filter(Boolean) : []; } catch { return []; } })();
        setImages(imgs);
        try { setMetadatos(p.metadatos ? JSON.parse(p.metadatos) : []); } catch { setMetadatos([]); }
      })
      .catch(() => setError("No se pudo cargar el producto"))
      .finally(() => setFetching(false));
  }, [isOpen, productId, isNew]);

  const config = CATEGORY_CONFIGS.find((c) => c.tabla === tabla);
  const availableKeys = config
    ? new Set(config.fields.map((f) => f.key))
    : new Set<string>();

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: NUMBER_FIELDS.has(key) ? (value === "" ? null : parseFloat(value) || 0) : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!tabla) { setError("Seleccioná una categoría"); return; }
    if (!form.sku || !(form.nombre || form.especie)) {
      setError("SKU y Nombre son requeridos");
      return;
    }

    let finalImages = [...images];
    if (imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      if (productId) fd.append("productId", productId);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Error al subir imagen");
        }
        if (!finalImages.includes(data.data.url)) finalImages.push(data.data.url);
      } catch (err: any) {
        setError(err.message || "Error al subir imagen");
        return;
      }
    }

    const metaFiltrados = metadatos.filter((m) => m.clave.trim() && m.valor.trim());

    const payload: Record<string, unknown> = {};
    for (const key of availableKeys) {
      if (HIDDEN_FIELDS.has(key)) continue;
      if (form[key] !== undefined && form[key] !== null && form[key] !== "") {
        payload[key] = form[key];
      }
    }
    payload.sku = form.sku;
    payload.isActive = form.isActive ?? true;
    payload._tabla = tabla;
    if (metaFiltrados.length > 0) payload.metadatos = JSON.stringify(metaFiltrados);
    if (finalImages.length > 0 || !isNew) {
      payload.imagenes = JSON.stringify(finalImages);
    }

    onSave(payload);
  };

  const renderField = (key: string) => {
    if (HIDDEN_FIELDS.has(key)) return null;
    if (!availableKeys.has(key)) return null;
    const label = FIELD_LABELS[key] ?? key;
    const isNum = NUMBER_FIELDS.has(key);
    const isTextarea = key === "descripcion";
    const val = form[key] ?? "";

    return (
      <div key={key}>
        <label className={labelClass}>{label}</label>
        {isTextarea ? (
          <textarea
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={2}
            className={`${fieldClass} resize-none`}
          />
        ) : (
          <input
            type={isNum ? "number" : "text"}
            step={isNum ? "0.01" : undefined}
            value={val}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={key === "sku" && !isNew}
            className={`${fieldClass} ${key === "sku" && !isNew ? "bg-[#FAFAF8] text-[#aaa]" : ""}`}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[780px] max-h-[85vh] bg-white border border-[#E0DED8] flex flex-col shadow-xl rounded-sm transition-all duration-200 ease-in-out ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DED8] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {images[0] || newImagePreview ? (
              <img src={images[0] || newImagePreview} alt="" className="w-11 h-11 rounded-md object-cover border border-[#E0DED8] shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-11 h-11 rounded-md bg-[#F5F4F0] border border-[#E0DED8] flex items-center justify-center shrink-0">
                <FiPackage size={16} className="text-[#ccc]" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium text-[#111] truncate">
                {fetching ? "Cargando..." : isNew ? "Nuevo producto" : (form.nombre || form.especie || "Editar producto")}
              </h2>
              {!isNew && form.sku && (
                <p className="text-[10px] text-[#aaa] font-mono mt-0.5">{form.sku}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#ccc] hover:text-[#777] transition-colors shrink-0">
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <FiLoader size={20} className="text-[#ccc] animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-sm">
                {error}
              </div>
            )}

            {/* Categoría + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Categoría *</label>
                <select
                  value={tabla}
                  onChange={(e) => setTabla(e.target.value)}
                  disabled={!isNew}
                  className={`${fieldClass} ${!isNew ? "bg-[#FAFAF8] text-[#aaa]" : ""}`}
                >
                  <option value="">Seleccionar categoría</option>
                  {TABLA_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
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
            </div>

            {/* Secciones de campos */}
            {tabla && SECTIONS.map((section) => {
              const fields = section.keys.filter((k) => availableKeys.has(k) && !HIDDEN_FIELDS.has(k));
              if (fields.length === 0) return null;
              return (
                <div key={section.title}>
                  <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] font-semibold mb-3 pb-1.5 border-b border-[#F0EEE8]">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {fields.map((key) => renderField(key))}
                  </div>
                </div>
              );
            })}

            {/* Metadatos */}
            {tabla && (
              <div className="border-t border-[#F0EEE8] pt-4">
                <MetadataEditor
                  value={metadatos}
                  onChange={setMetadatos}
                  tabla={tabla}
                />
              </div>
            )}

            {/* Imágenes */}
            {tabla && (
              <div>
                <label className={labelClass}>Imágenes</label>
                {(images.length > 0 || newImagePreview) && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {images.map((img, i) => (
                      <div key={`${img}-${i}`} className="relative group">
                        <img src={img} alt={`imagen ${i + 1}`} className="w-20 h-20 object-cover border border-[#E0DED8] rounded-sm" referrerPolicy="no-referrer" />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-medium bg-black/60 text-white rounded-sm">
                          {i + 1}{i === 0 ? " · principal" : ""}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-sm">
                          <button
                            type="button"
                            onClick={() => moveImage(i, -1)}
                            disabled={i === 0}
                            title="Mover a la izquierda"
                            className="p-1 text-white hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-white"
                          >
                            <FiArrowLeft size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            title="Quitar imagen"
                            className="p-1 text-white hover:text-red-300"
                          >
                            <FiTrash2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(i, 1)}
                            disabled={i === images.length - 1}
                            title="Mover a la derecha"
                            className="p-1 text-white hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-white"
                          >
                            <FiArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {newImagePreview && (
                      <div className="relative">
                        <img src={newImagePreview} alt="nueva imagen" className="w-20 h-20 object-cover border border-dashed border-emerald-300 rounded-sm" referrerPolicy="no-referrer" />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-medium bg-emerald-600/80 text-white rounded-sm">nueva</span>
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setNewImagePreview(""); }}
                          title="Descartar"
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-sm hover:bg-black/80"
                        >
                          <FiX size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <label className="flex items-center justify-center gap-1.5 w-full h-12 border border-dashed border-[#E0DED8] rounded-sm hover:border-[#aaa] cursor-pointer transition-colors">
                  <FiUpload size={13} className="text-[#ccc]" />
                  <span className="text-[10px] text-[#ccc] uppercase tracking-[0.06em]">Agregar imagen</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}
          </form>
        )}

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
            disabled={isLoading || fetching}
            className="flex-1 py-2 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm transition-colors"
          >
            {isLoading ? "Guardando..." : isNew ? "Crear producto" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}
