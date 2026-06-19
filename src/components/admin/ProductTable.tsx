"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { Product } from "@/types";
import { isRemoteImageUrl } from "@/lib/google-drive";

interface ProductTableProps {
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onViewHistory: (productId: string) => void;
  searchTerm?: string;
  marca?: string;
  refreshKey?: number;
}

export function ProductTable({
  onEdit,
  onDelete,
  onViewHistory,
  searchTerm = "",
  marca = "",
  refreshKey = 0,
}: ProductTableProps) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const router = useRouter();

  const fetchProductos = async (skip: number = 0) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: String(skip),
        take: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(marca && { marca }),
      });

      const res = await fetch(`/api/productos?${params}`);

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        throw new Error("Error al cargar productos");
      }

      const data = await res.json();
      setProductos(data.data.productos);
      setTotalPages(data.data.totalPages);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchProductos(0);
  }, [searchTerm, marca, refreshKey]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      return;
    }

    try {
      const res = await fetch(`/api/productos/${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchProductos((page - 1) * 10);
        onDelete(productId);
      } else {
        alert("Error al eliminar producto");
      }
    } catch (err) {
      alert("Error al eliminar producto");
    }
  };

  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">SKU</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Nombre</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Marca</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Categoría</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Imagen</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Precio</th>
              <th className="px-6 py-3 text-center font-medium text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Cargando productos...
                </td>
              </tr>
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              productos.map((producto) => (
                <tr key={producto.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{producto.sku}</td>
                  <td className="px-6 py-4 text-gray-700">{producto.nombre}</td>
                  <td className="px-6 py-4 text-gray-700">{producto.marca}</td>
                  <td className="px-6 py-4">
                    {producto.categoria ? (
                      <div>
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {producto.categoria}
                        </span>
                        {producto.subcategoria && (
                          <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[140px]">{producto.subcategoria}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">Sin categoría</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {producto.imagen ? (
                      <div className="relative w-10 h-10">
                        {isRemoteImageUrl(producto.imagen) ? (
                          <img
                            src={producto.imagen}
                            alt={producto.nombre}
                            className="w-10 h-10 rounded object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Image
                            src={producto.imagen}
                            alt={producto.nombre}
                            fill
                            className="rounded object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin imagen</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    ${producto.precio.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => onViewHistory(producto.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver historial"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => onEdit(producto)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Editar"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(producto.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              fetchProductos((page - 2) * 10);
            }}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              fetchProductos(page * 10);
            }}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
