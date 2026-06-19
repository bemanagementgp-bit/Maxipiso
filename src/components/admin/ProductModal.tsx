"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { FiX } from "react-icons/fi";

const CATALOG_STRUCTURE = [
  {
    value: "Pisos",
    label: "Pisos",
    subs: ["Laminados HDF", "Laminados WTR", "O.R.C.A Vinil Pro", "Vinílico", "Porcelanato", "Madera", "Ingeniería"],
  },
  {
    value: "Maderas",
    label: "Maderas",
    subs: [],
  },
  {
    value: "Decks",
    label: "Decks",
    subs: ["Madera", "WPC"],
  },
  {
    value: "Revestimientos",
    label: "Revestimientos",
    subs: [
      "Exterior - Acanalado Vertical",
      "Exterior - Siding",
      "Exterior - Perfiles WPC",
      "Interior - EPS",
      "Interior - Laqueados",
      "Interior - Acústico",
      "Interior - Placas",
      "Madera",
    ],
  },
  {
    value: "Accesorios",
    label: "Accesorios",
    subs: [
      "ACC PISOS - Zócalos Flotante",
      "ACC PISOS - Zócalos Vinílico",
      "ACC PISOS - Zócalos Madera",
      "ACC PISOS - Terminaciones de Aluminio",
      "ACC PISOS - Mantos",
      "ACC DECK",
      "ACC REVEST",
    ],
  },
  {
    value: "Otros",
    label: "Otros",
    subs: ["Adhesivos", "Lacas", "Selladores"],
  },
];

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => void;
  product?: Product | null;
  isLoading?: boolean;
}

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  isLoading = false,
}: ProductModalProps) {
  const [formData, setFormData] = useState({
    sku: "",
    nombre: "",
    marca: "",
    descripcion: "",
    precio: 0,
    imagen: "",
    categoria: "",
    subcategoria: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        nombre: product.nombre,
        marca: product.marca,
        descripcion: product.descripcion || "",
        precio: product.precio,
        imagen: product.imagen || "",
        categoria: product.categoria || "",
        subcategoria: product.subcategoria || "",
      });
      if (product.imagen) {
        setImagePreview(product.imagen);
      }
    } else {
      setFormData({
        sku: "",
        nombre: "",
        marca: "",
        descripcion: "",
        precio: 0,
        imagen: "",
        categoria: "",
        subcategoria: "",
      });
      setImagePreview("");
    }
    setError("");
    setImageFile(null);
  }, [product, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "precio" ? parseFloat(value) || 0 : value,
      // Reset subcategoria when categoria changes
      ...(name === "categoria" ? { subcategoria: "" } : {}),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.sku || !formData.nombre || !formData.marca) {
      setError("SKU, Nombre y Marca son requeridos");
      return;
    }

    // Upload image if new file selected
    let imagenUrl = formData.imagen;
    if (imageFile) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", imageFile);
      if (product) {
        uploadFormData.append("productId", product.id);
      }

      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          throw new Error("Error al subir imagen");
        }

        const uploadData = await uploadRes.json();
        imagenUrl = uploadData.data.url;
      } catch (err: any) {
        setError(err.message || "Error al subir imagen");
        return;
      }
    }

    onSave({
      ...formData,
      imagen: imagenUrl,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {product ? "Editar Producto" : "Crear Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
              SKU *
            </label>
            <input
              id="sku"
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              disabled={!!product}
              placeholder="SKU-001"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              required
            />
          </div>

          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre *
            </label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre del producto"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700">
              Marca *
            </label>
            <input
              id="marca"
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Marca"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción del producto"
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700">
              Precio *
            </label>
            <input
              id="precio"
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="imagen" className="block text-sm font-medium text-gray-700">
              Imagen
            </label>
            <input
              id="imagen"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {imagePreview && (
              <div className="mt-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Sin categoría --</option>
              {CATALOG_STRUCTURE.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Subcategoría */}
          {formData.categoria && CATALOG_STRUCTURE.find(c => c.value === formData.categoria)?.subs.length ? (
            <div>
              <label htmlFor="subcategoria" className="block text-sm font-medium text-gray-700">
                Subcategoría
              </label>
              <select
                id="subcategoria"
                name="subcategoria"
                value={formData.subcategoria}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Sin subcategoría --</option>
                {CATALOG_STRUCTURE.find(c => c.value === formData.categoria)?.subs.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
