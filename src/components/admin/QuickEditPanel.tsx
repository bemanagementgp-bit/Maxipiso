"use client";

import { useState, useEffect, useRef } from "react";
import { FiX, FiUpload, FiLoader, FiPackage, FiArrowLeft, FiArrowRight, FiTrash2, FiAlertCircle, FiStar } from "react-icons/fi";
import { CATEGORY_CONFIGS } from "@/lib/category-fields";
import { ALLOWED_IMAGE_HOSTS, validateImageRef } from "@/lib/image-hosts";
import { MetadataEditor } from "./MetadataEditor";
import Combobox from "./Combobox";

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

/** Una imagen ya guardada (URL) o un archivo elegido que todavia no se subio. */
type ImagenItem =
  | { tipo: "url"; clave: string; url: string }
  | { tipo: "archivo"; clave: string; file: File; preview: string };

/** URL para mostrar en la grilla, venga de donde venga. */
function previewDe(item: ImagenItem): string {
  return item.tipo === "url" ? item.url : item.preview;
}

const HIDDEN_FIELDS = new Set(["id", "imagenes", "metadatos", "isActive", "createdAt", "updatedAt", "_tabla", "_tablaLabel"]);

interface QuickEditPanelProps {
  isOpen: boolean;
  productId: string | null;
  isNew: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
}

const fieldClass = "w-full px-3 py-2 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc] rounded-sm";
const labelClass = "block text-[9px] uppercase tracking-[0.08em] text-[#aaa] mb-1";

export function QuickEditPanel({ isOpen, productId, isNew, isLoading = false, onClose, onSave }: QuickEditPanelProps) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [tabla, setTabla] = useState("");
  const [metadatos, setMetadatos] = useState<Meta[]>([]);
  /**
   * Imagenes del producto, guardadas y pendientes, en una sola lista ordenada.
   *
   * Antes la imagen nueva vivia en un estado aparte (`imageFile`), separada de
   * la lista de las ya guardadas. Eso traia dos limitaciones que se sentian como
   * bugs: solo se podia sumar UNA imagen por guardado, y la nueva no se podia
   * mover, asi que para dejarla como principal habia que guardar, cerrar el
   * popup, volver a abrirlo y recien ahi reordenar.
   *
   * Con la lista unificada, mover, quitar y elegir portada funcionan igual sobre
   * una imagen ya guardada que sobre uno de los archivos que todavia no se
   * subieron. El orden final es el que se ve en pantalla.
   */
  const [imagenes, setImagenes] = useState<ImagenItem[]>([]);
  const claveRef = useRef(0);
  const [error, setError] = useState("");
  /**
   * Fase del guardado, para que el botón deje de mentir.
   *
   * Antes solo existía `isLoading`, que el padre levanta recién en el `PUT`.
   * La subida de la imagen pasa ANTES y puede tardar (o fallar), así que
   * durante todo ese rato el botón seguía diciendo "Guardar cambios" y parecía
   * que el click no había hecho nada.
   */
  const [fase, setFase] = useState<"" | "subiendo" | "guardando">("");
  /** Cual de los archivos pendientes se esta subiendo, para el boton. */
  const [subiendo, setSubiendo] = useState<{ actual: number; total: number } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  /**
   * Valores ya usados en cada campo de esa categoría, para las sugerencias.
   *
   * Se piden por categoría y no de una vez: cada tabla tiene sus columnas, y
   * traer las 8 para mostrar una sería tirar el resto.
   */
  const [sugerencias, setSugerencias] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setImagenes([]);
    setUrlInput("");
    setUrlError("");

    if (isNew) {
      setForm({ isActive: true });
      setTabla("");
      setMetadatos([]);
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
        setImagenes(
          imgs.map((url: string) => ({ tipo: "url" as const, clave: `u${claveRef.current++}`, url })),
        );
        try { setMetadatos(p.metadatos ? JSON.parse(p.metadatos) : []); } catch { setMetadatos([]); }
      })
      .catch(() => setError("No se pudo cargar el producto"))
      .finally(() => setFetching(false));
  }, [isOpen, productId, isNew]);

  useEffect(() => {
    if (!isOpen || !tabla) { setSugerencias({}); return; }
    let cancelado = false;
    fetch(`/api/productos/valores?tabla=${encodeURIComponent(tabla)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelado) setSugerencias(d?.data?.valores ?? {}); })
      // Que no haya sugerencias no rompe nada: los campos quedan como texto
      // libre, que es como funcionaban antes.
      .catch(() => { if (!cancelado) setSugerencias({}); });
    return () => { cancelado = true; };
  }, [isOpen, tabla]);

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

  /** Suma los archivos elegidos al final de la lista. Acepta varios de una. */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenes((prev) => [
          ...prev,
          { tipo: "archivo", clave: `a${claveRef.current++}`, file, preview: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    }
    // Permite volver a elegir el MISMO archivo despues de quitarlo: sin esto el
    // input no dispara change porque su value no cambio.
    e.target.value = "";
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    setImagenes((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /** Manda una imagen al frente: la primera es la portada del catalogo. */
  const hacerPrincipal = (index: number) => {
    setImagenes((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  // Alta de imagen por URL o ruta.
  //
  // El upload de archivos necesita un blob store configurado: en Vercel el
  // filesystem de las funciones es de solo lectura, asi que /api/upload
  // responde 503. Cargar la referencia a mano no depende de nada de eso y es,
  // de hecho, como estan cargadas las imagenes actuales del catalogo (rutas de
  // public/ y URLs de cdn.shopify.com).
  const addImageUrl = () => {
    const res = validateImageRef(urlInput);
    if (!res.ok) { setUrlError(res.error); return; }
    if (imagenes.some((i) => i.tipo === "url" && i.url === res.url)) {
      setUrlError("Esa imagen ya está en la lista");
      return;
    }
    setImagenes((prev) => [...prev, { tipo: "url", clave: `u${claveRef.current++}`, url: res.url }]);
    setUrlInput("");
    setUrlError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (fase) return; // ya hay un guardado en curso

    if (!tabla) { setError("Seleccioná una categoría"); return; }
    if (!form.sku || !(form.nombre || form.especie)) {
      setError("SKU y Nombre son requeridos");
      return;
    }

    // Se suben los archivos pendientes en el orden en que estan en pantalla, y
    // cada uno reemplaza su lugar en la lista. Asi el orden que se ve es el que
    // termina guardado, sin importar si una imagen venia de antes o se acaba de
    // agregar.
    const pendientes = imagenes.filter((i) => i.tipo === "archivo");
    const finalImages: string[] = [];

    if (pendientes.length > 0) setFase("subiendo");
    let subidas = 0;

    for (const item of imagenes) {
      if (item.tipo === "url") {
        if (!finalImages.includes(item.url)) finalImages.push(item.url);
        continue;
      }

      setSubiendo({ actual: subidas + 1, total: pendientes.length });
      const fd = new FormData();
      fd.append("file", item.file);
      if (productId) fd.append("productId", productId);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || `El servidor rechazó la imagen (HTTP ${res.status})`);
        }
        if (!finalImages.includes(data.data.url)) finalImages.push(data.data.url);
        subidas++;
      } catch (err: unknown) {
        const detalle = err instanceof Error ? err.message : "Error al subir imagen";
        setError(
          pendientes.length > 1
            ? `${detalle} (falló "${item.file.name}"; las anteriores no se guardaron)`
            : detalle,
        );
        setFase("");
        setSubiendo(null);
        return;
      }
    }
    setSubiendo(null);

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

    setFase("guardando");
    try {
      await onSave(payload);
    } catch (err: unknown) {
      // El padre relanza con el mensaje que devolvió la API, que es el que
      // dice qué campo falta o por qué el storage no acepta el archivo.
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto");
    } finally {
      setFase("");
    }
  };

  const renderField = (key: string) => {
    if (HIDDEN_FIELDS.has(key)) return null;
    if (!availableKeys.has(key)) return null;
    const label = FIELD_LABELS[key] ?? key;
    const isNum = NUMBER_FIELDS.has(key);
    const isTextarea = key === "descripcion";
    const val = form[key] ?? "";
    // El SKU bloqueado (edición) sigue siendo un input plano: no se toca.
    const bloqueado = key === "sku" && !isNew;
    const opciones = isNum || isTextarea || bloqueado ? [] : (sugerencias[key] ?? []);

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
        ) : opciones.length > 0 ? (
          <Combobox
            value={String(val)}
            onChange={(v) => handleChange(key, v)}
            opciones={opciones}
            className={fieldClass}
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
            {imagenes[0] ? (
              <img src={previewDe(imagenes[0])} alt="" className="w-11 h-11 rounded-md object-cover border border-[#E0DED8] shrink-0" referrerPolicy="no-referrer" />
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
                {imagenes.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {imagenes.map((item, i) => (
                      <div key={item.clave} className="relative group">
                        <img
                          src={previewDe(item)}
                          alt={`imagen ${i + 1}`}
                          className={`w-24 h-24 object-cover rounded-sm ${
                            item.tipo === "archivo"
                              ? "border border-dashed border-emerald-400"
                              : "border border-[#E0DED8]"
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        <span
                          className={`absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-medium text-white rounded-sm ${
                            i === 0 ? "bg-[#DF8635]" : "bg-black/60"
                          }`}
                        >
                          {i === 0 ? "principal" : i + 1}
                        </span>
                        {item.tipo === "archivo" && (
                          // Abajo y no arriba: en la primera miniatura chocaba
                          // con la etiqueta "principal".
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[9px] font-medium bg-emerald-600/85 text-white rounded-sm group-hover:opacity-0 transition-opacity">
                            sin subir
                          </span>
                        )}

                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 py-1 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-sm">
                          <button
                            type="button"
                            onClick={() => moveImage(i, -1)}
                            disabled={i === 0}
                            title="Mover a la izquierda"
                            className="p-1 text-white hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-white"
                          >
                            <FiArrowLeft size={12} />
                          </button>
                          {/* Atajo: mandar a la portada sin ir moviendo de a uno. */}
                          <button
                            type="button"
                            onClick={() => hacerPrincipal(i)}
                            disabled={i === 0}
                            title="Usar como principal"
                            className="p-1 text-white hover:text-[#DF8635] disabled:opacity-30 disabled:hover:text-white"
                          >
                            <FiStar size={12} />
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
                            disabled={i === imagenes.length - 1}
                            title="Mover a la derecha"
                            className="p-1 text-white hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-white"
                          >
                            <FiArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mb-2 text-[9px] text-[#bbb] leading-relaxed">
                  La primera es la portada del catálogo. Pasá el mouse por encima para moverlas,
                  quitarlas o marcar cuál va primero — también las que todavía no subiste.
                </p>
                {/* Alta por URL o ruta: no depende del blob store, y es como
                    están cargadas las imágenes actuales del catálogo. */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
                    placeholder="/imagen.jpg  o  https://cdn.shopify.com/…"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    disabled={!urlInput.trim()}
                    className="shrink-0 px-3 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:bg-gray-200 disabled:text-gray-400 rounded-sm transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                {urlError && <p className="mt-1 text-[10px] text-red-500">{urlError}</p>}
                <p className="mt-1 text-[9px] text-[#bbb] leading-relaxed">
                  Rutas de la web (<code>/14704-1.jpg</code>) o URLs https de:{" "}
                  {ALLOWED_IMAGE_HOSTS.join(", ")}
                </p>

                <label className="mt-3 flex items-center justify-center gap-1.5 w-full h-12 border border-dashed border-[#E0DED8] rounded-sm hover:border-[#aaa] cursor-pointer transition-colors">
                  <FiUpload size={13} className="text-[#ccc]" />
                  <span className="text-[10px] text-[#ccc] uppercase tracking-[0.06em]">Subir archivos</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="border-t border-[#E0DED8] shrink-0">
          {error && (
            <div className="flex items-start gap-2 px-6 pt-3 text-[11px] text-red-600">
              <FiAlertCircle size={13} className="shrink-0 mt-px" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}
        <div className="px-6 py-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-[11px] font-medium text-[#888] hover:text-[#444] transition-colors rounded-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={isLoading || fetching || fase !== ""}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-white bg-[#111] hover:bg-[#333] disabled:opacity-40 rounded-sm transition-colors"
          >
            {(fase !== "" || isLoading) && <FiLoader size={12} className="animate-spin" />}
            {fase === "subiendo"
              ? subiendo && subiendo.total > 1
                ? `Subiendo imagen ${subiendo.actual} de ${subiendo.total}...`
                : "Subiendo imagen..."
              : fase === "guardando" || isLoading
                ? "Guardando..."
                : isNew
                  ? "Crear producto"
                  : "Guardar cambios"}
          </button>
          </div>
        </div>
      </div>
    </>
  );
}
