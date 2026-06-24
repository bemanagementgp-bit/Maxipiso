"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { FiTrendingUp, FiChevronDown, FiChevronUp } from "react-icons/fi";

type CatStat = { categoria: string; avgPrecio: number; count: number };
type MarcaStat = { marca: string; avgPrecio: number; count: number };

function fmt(v: number) {
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <div className="font-semibold mb-0.5">{label}</div>
      <div className="text-white/70">Precio promedio: <span className="text-[#DF8635] font-bold">{fmt(payload[0].value)}</span></div>
      <div className="text-white/50">{payload[0]?.payload?.count} productos</div>
    </div>
  );
};

export function PriceChart() {
  const [data, setData] = useState<{ categorias: CatStat[]; marcas: MarcaStat[] } | null>(null);
  const [view, setView] = useState<"categorias" | "marcas">("categorias");
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/productos/stats")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = view === "categorias"
    ? (data?.categorias ?? []).map((c) => ({ name: c.categoria, value: c.avgPrecio, count: c.count }))
    : (data?.marcas ?? []).map((m) => ({ name: m.marca, value: m.avgPrecio, count: m.count }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635]">
            <FiTrendingUp size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#111]">Variaciones de Precio</h3>
            <p className="text-xs text-gray-400">Precio promedio por {view === "categorias" ? "categoría" : "marca"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle categorias/marcas */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setView("categorias")}
              className={`px-3 py-1.5 rounded-md transition-colors ${view === "categorias" ? "bg-white text-[#111] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Categorías
            </button>
            <button
              onClick={() => setView("marcas")}
              className={`px-3 py-1.5 rounded-md transition-colors ${view === "marcas" ? "bg-white text-[#111] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Marcas
            </button>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Chart */}
      {expanded && (
        <div className="px-5 py-5">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#DF8635]/30 border-t-[#DF8635] rounded-full animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-300">
              Sin datos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v)}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#DF8635", fillOpacity: 0.06 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#DF8635" : i % 2 === 0 ? "#111111" : "#d1d5db"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
