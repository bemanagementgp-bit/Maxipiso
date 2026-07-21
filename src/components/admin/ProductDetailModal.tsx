// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { FiX, FiPackage, FiLoader } from "react-icons/fi";

const TABLA_LABELS: Record<string, string> = {
  pisos_flotantes: "Pisos Flotantes",
  porcellanatos: "Porcelanatos",
  revestimientos: "Revestimientos",
  pisos_vinilicos: "Pisos Vinílicos",
  pisos_madera: "Pisos Madera e Ingeniería",
  decks: "Decks",
  maderas: "Maderas",
  accesorios: "Accesorios",
};

const FIELD_LABELS: Record<string, string> = {
  sku: "SKU",
  nombre: "Nombre",
  marca: "Marca",
  descripcion: "Descripción",
  categoriaPrincipal: "Categoría principal",
  categoriaSecundaria: "Categoría secundaria",
  categoriaTerciaria: "Categoría terciaria",
  tipoProducto: "Tipo de producto",
  subtipo: "Subtipo",
  subtipo2: "Subtipo 2",
  origen: "Origen",
  codigo: "Código",
  linea: "Línea",
  especie: "Especie",
  acabado: "Acabado",
  terminacion: "Terminación",
  material: "Material",
  uso: "Uso",
  tipoDeUso: "Tipo de uso",
  espesor: "Espesor",
  espesorUm: "Unidad espesor",
  espesorTotal: "Espesor total",
  espesorTotalUm: "Unidad espesor total",
  espesorComposicion: "Espesor composición",
  espesorComposicionUm: "Unidad espesor composición",
  espesorLamina: "Espesor lámina",
  espesorLaminaUm: "Unidad espesor lámina",
  capaDeUso: "Capa de uso",
  abrasion: "Abrasión",
  mantoIncorporado: "Manto incorporado",
  bisel: "Bisel",
  ancho: "Ancho",
  anchoUm: "Unidad ancho",
  largo: "Largo",
  largoUm: "Unidad largo",
  base: "Base",
  baseUm: "Unidad base",
  baseTabla: "Base tabla",
  baseTablUm: "Unidad base tabla",
  dimensiones: "Dimensiones",
  colores: "Colores",
  medidas: "Medidas",
  secado: "Secado",
  espesoresDisponibles: "Espesores disponibles",
  tablasPorCaja: "Tablas por caja",
  precioM2: "Precio por m²",
  precio: "Precio",
  precioTabla: "Precio por tabla",
  precioMLineal: "Precio por m lineal",
  precioMl: "Precio por ml",
  moneda: "Moneda",
  precioCaja: "Precio por caja",
  unidadMedida: "Unidad de medida",
  pesoCaja: "Peso por caja",
  cajasPallet: "Cajas por pallet",
  pesoPallet: "Peso por pallet",
  precioEnvioCaja: "Precio envío por caja",
  flete: "Flete",
  stock: "Stock",
  garantia: "Garantía",
  fichaTecnica: "Ficha técnica",
  archivoInstalacion: "Archivo de instalación",
  isActive: "Estado",
  createdAt: "Fecha de creación",
  updatedAt: "Última actualización",
};

const HIDDEN_FIELDS = new Set(["id", "_tabla", "_tablaLabel", "imagenes", "imagen", "metadatos"]);

const SECTIONS: { title: string; keys: string[] }[] = [
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
  {
    title: "Sistema",
    keys: ["isActive", "createdAt", "updatedAt"],
  },
];

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "isActive") return value ? "Activo" : "Inactivo";
  if (key === "createdAt" || key === "updatedAt") {
    try {
      return new Date(value as string).toLocaleDateString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return String(value); }
  }
  if (typeof value === "number") {
    return value.toLocaleString("es-AR", { minimumFractionDigits: value % 1 === 0 ? 0 : 2 });
  }
  return String(value);
}

interface Props {
  isOpen: boolean;
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailModal({ isOpen, productId, onClose }: Props) {
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !productId) { setProduct(null); return; }
    setLoading(true);
    setError("");
    fetch(`/api/productos/${productId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setProduct(d.data))
      .catch(() => setError("No se pudo cargar el producto"))
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  const imgSrc = product
    ? (product.imagen as string) ?? (() => { try { return JSON.parse(product.imagenes as string)[0]; } catch { return null; } })()
    : null;

  const tabla = product?._tabla as string;
  const metadatos: { clave: string; valor: string }[] = (() => {
    try { return product?.metadatos ? JSON.parse(product.metadatos as string) : []; } catch { return []; }
  })();

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
            {imgSrc ? (
              <img src={imgSrc as string} alt="" className="w-11 h-11 rounded-md object-cover border border-[#E0DED8] shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-11 h-11 rounded-md bg-[#F5F4F0] border border-[#E0DED8] flex items-center justify-center shrink-0">
                <FiPackage size={16} className="text-[#ccc]" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium text-[#111] truncate">
                {loading ? "Cargando..." : (product?.nombre as string) ?? (product?.especie as string) ?? "Producto"}
              </h2>
              {tabla && (
                <p className="text-[10px] text-[#aaa] mt-0.5">{TABLA_LABELS[tabla] ?? tabla}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#ccc] hover:text-[#777] transition-colors shrink-0">
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <FiLoader size={20} className="text-[#ccc] animate-spin" />
            </div>
          )}
          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-sm">
              {error}
            </div>
          )}
          {product && !loading && (
            <div className="space-y-5">
              {SECTIONS.map((section) => {
                const fields = section.keys.filter((k) => product[k] != null && product[k] !== "");
                if (fields.length === 0) return null;
                return (
                  <div key={section.title}>
                    <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] font-semibold mb-2.5 pb-1.5 border-b border-[#F0EEE8]">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {fields.map((key) => (
                        <div key={key} className="flex items-baseline gap-2 py-0.5">
                          <span className="text-[10px] text-[#999] shrink-0 w-[140px]">
                            {FIELD_LABELS[key] ?? key}
                          </span>
                          <span className={`text-[12px] text-[#333] font-medium truncate ${
                            key === "isActive"
                              ? product[key] ? "text-emerald-600" : "text-red-500"
                              : ""
                          }`}>
                            {formatValue(key, product[key])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Metadatos */}
              {metadatos.length > 0 && (
                <div>
                  <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] font-semibold mb-2.5 pb-1.5 border-b border-[#F0EEE8]">
                    Características adicionales
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {metadatos.map((m, i) => (
                      <div key={i} className="flex items-baseline gap-2 py-0.5">
                        <span className="text-[10px] text-[#999] shrink-0 w-[140px]">{m.clave}</span>
                        <span className="text-[12px] text-[#333] font-medium truncate">{m.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E0DED8] shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 text-[11px] font-medium text-[#888] hover:text-[#444] transition-colors rounded-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
