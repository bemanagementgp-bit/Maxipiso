"use client";

import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";

interface HistorialEntry {
  id: string;
  productId: string;
  usuarioId: string;
  campo: string;
  valorAnterior?: string;
  valorNuevo?: string;
  tipo: "CREATE" | "UPDATE" | "DELETE";
  fechaCambio: string;
  usuario: {
    email: string;
    name?: string;
  };
}

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
}

export function HistorialModal({
  isOpen,
  onClose,
  productId,
}: HistorialModalProps) {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistorial();
    }
  }, [isOpen, productId]);

  const fetchHistorial = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/productos/${productId}/historial`);

      if (!res.ok) {
        throw new Error("Error al obtener historial");
      }

      const data = await res.json();
      setHistorial(data.data.historial);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CREATE":
        return "Creado";
      case "UPDATE":
        return "Actualizado";
      case "DELETE":
        return "Eliminado";
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Historial de Cambios</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando historial...
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay cambios registrados
            </div>
          ) : (
            <div className="space-y-4">
              {historial.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                          entry.tipo
                        )}`}
                      >
                        {getTypeLabel(entry.tipo)}
                      </span>
                      <span className="font-medium text-gray-900">
                        {entry.campo}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.fechaCambio).toLocaleString("es-ES")}
                    </span>
                  </div>

                  {entry.tipo !== "CREATE" && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs text-gray-600 font-medium mb-1">
                          Anterior
                        </p>
                        <p className="text-sm text-gray-900 break-words">
                          {entry.valorAnterior || "-"}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs text-gray-600 font-medium mb-1">
                          Nuevo
                        </p>
                        <p className="text-sm text-gray-900 break-words">
                          {entry.valorNuevo || "-"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500 border-t pt-3">
                    Por: <span className="font-medium">{entry.usuario.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
