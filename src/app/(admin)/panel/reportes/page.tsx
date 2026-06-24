"use client";

import { useEffect, useState } from "react";
import { PriceChart } from "../../../../components/admin/PriceChart";

// ── Stats editoriales ─────────────────────────────────────────────────────────
function EditorialStats({ stats }: {
  stats: { total: number; activos: number; marcas: number; categorias: number };
}) {
  const pct = stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0;

  return (
    <div className="flex border border-[#E0DED8] overflow-hidden bg-white">
      <div className="flex-[1.3] px-8 py-6 border-r border-[#E0DED8]">
        <div
          className="font-medium text-[#111] leading-none"
          style={{ fontSize: "clamp(36px, 4vw, 52px)", letterSpacing: "-0.03em" }}
        >
          {stats.total > 0 ? stats.total.toLocaleString("es-AR") : "—"}
        </div>
        <div className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mt-3">
          Productos en catálogo
        </div>
        {stats.total > 0 && (
          <div className="text-[11px] text-[#DF8635] mt-2 font-medium">
            ↑ {pct}% activos
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col divide-y divide-[#E0DED8]">
        <div className="flex items-center justify-between px-6 py-4 flex-1">
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Activos</span>
          <span className="text-[17px] font-medium text-[#111] tabular-nums">
            {stats.activos > 0 ? stats.activos.toLocaleString("es-AR") : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-6 py-4 flex-1">
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Marcas</span>
          <span className="text-[17px] font-medium text-[#111] tabular-nums">
            {stats.marcas > 0 ? stats.marcas : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-6 py-4 flex-1">
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Categorías</span>
          <span className="text-[17px] font-medium text-[#111] tabular-nums">
            {stats.categorias > 0 ? stats.categorias : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [stats, setStats] = useState({ total: 0, activos: 0, marcas: 0, categorias: 0 });

  useEffect(() => {
    fetch("/api/productos/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setStats({
            total: d.data.total,
            activos: d.data.total,
            marcas: d.data.marcas?.length ?? 0,
            categorias: d.data.categorias?.length ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Reportes</h1>
        <p className="text-[11px] text-[#aaa] mt-1">
          Métricas y variaciones del catálogo de productos
        </p>
      </div>

      {/* Stats editoriales */}
      <EditorialStats stats={stats} />

      {/* Gráfico de precios */}
      <PriceChart />

    </div>
  );
}
