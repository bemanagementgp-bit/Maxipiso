"use client";

import { useEffect, useState } from "react";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import PriceGrid from "@/components/admin/PriceGrid";

type Aviso = { mensaje: string; tipo: "ok" | "error" } | null;

export default function PreciosPage() {
  const [aviso, setAviso] = useState<Aviso>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <div className="px-6 lg:px-10 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111] tracking-tight">Precios y stock</h1>
        <p className="text-[12px] text-[#888] mt-1">
          Editá directamente sobre la grilla o aplicá cambios en lote. Nada se guarda hasta que
          apretás Guardar.
        </p>
      </div>

      <PriceGrid onNotify={(mensaje, tipo = "ok") => setAviso({ mensaje, tipo })} />

      {aviso && (
        <div
          className={`fixed top-[68px] right-6 z-50 flex items-start gap-2 max-w-sm px-4 py-3 border text-[12px] shadow-lg ${
            aviso.tipo === "ok"
              ? "bg-white border-emerald-200 text-[#111]"
              : "bg-white border-red-200 text-red-700"
          }`}
        >
          {aviso.tipo === "ok" ? (
            <FiCheckCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <FiXCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{aviso.mensaje}</span>
        </div>
      )}
    </div>
  );
}
