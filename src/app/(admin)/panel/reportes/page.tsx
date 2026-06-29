"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell,
} from "recharts";
import { FiSearch, FiTrendingUp, FiTrendingDown, FiMinus } from "react-icons/fi";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function fmtDate(iso: string | number | undefined) {
  if (!iso) return "";
  return new Date(String(iso)).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });
}
function pctColor(delta: number) {
  if (delta > 0) return "text-emerald-600";
  if (delta < 0) return "text-red-500";
  return "text-[#aaa]";
}
function pctIcon(delta: number) {
  if (delta > 0) return <FiTrendingUp size={12} />;
  if (delta < 0) return <FiTrendingDown size={12} />;
  return <FiMinus size={12} />;
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none">
      <div className="text-white/50 mb-0.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="font-medium">
          {p.name === "precio" || p.name === "avgPrecio"
            ? fmt(p.value)
            : p.value + (p.name === "pct" ? "%" : "")}
        </div>
      ))}
    </div>
  );
};

// ── Sección wrapper ───────────────────────────────────────────────────────────
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[13px] font-medium text-[#111]">{title}</h2>
        {sub && <p className="text-[10px] uppercase tracking-[0.07em] text-[#aaa] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Stats editoriales ─────────────────────────────────────────────────────────
function EditorialStats({ c }: { c: any }) {
  if (!c) return null;
  const pct = c.total > 0 ? Math.round((c.activos / c.total) * 100) : 0;
  return (
    <div className="flex border border-[#E0DED8] overflow-hidden bg-white">
      <div className="flex-[1.3] px-8 py-6 border-r border-[#E0DED8]">
        <div className="font-medium text-[#111] leading-none" style={{ fontSize: "clamp(36px,4vw,52px)", letterSpacing: "-0.03em" }}>
          {c.total > 0 ? c.total.toLocaleString("es-AR") : "—"}
        </div>
        <div className="text-[9px] uppercase tracking-[0.1em] text-[#aaa] mt-3">Productos en catálogo</div>
        {c.total > 0 && <div className="text-[11px] text-[#DF8635] mt-2 font-medium">↑ {pct}% activos</div>}
      </div>
      <div className="flex-1 flex flex-col divide-y divide-[#E0DED8]">
        {[
          { label: "Activos", val: c.activos },
          { label: "Con imagen", val: c.conImagen },
          { label: "Con categoría", val: c.conCategoria },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center justify-between px-6 py-4 flex-1">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">{label}</span>
            <span className="text-[17px] font-medium text-[#111] tabular-nums">
              {val > 0 ? val.toLocaleString("es-AR") : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Salud del catálogo ────────────────────────────────────────────────────────
function CatalogHealth({ c }: { c: any }) {
  if (!c) return null;
  const items = [
    { label: "Productos activos",      val: c.activos,      total: c.total,    color: "#111" },
    { label: "Con imagen cargada",     val: c.conImagen,    total: c.total,    color: "#DF8635" },
    { label: "Con categoría asignada", val: c.conCategoria, total: c.total,    color: "#111" },
    { label: "Con stock registrado",   val: c.conStock,     total: c.total,    color: "#DF8635" },
  ];
  return (
    <div className="bg-white border border-[#E0DED8] px-6 py-5 space-y-4">
      {items.map(({ label, val, total, color }) => {
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-[#555]">{label}</span>
              <span className="text-[11px] font-medium text-[#111] tabular-nums">{val.toLocaleString("es-AR")} <span className="text-[#aaa] font-normal">({pct}%)</span></span>
            </div>
            <div className="h-1 bg-[#F0EEE8] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
      <div className="pt-2 flex gap-4 border-t border-[#F0EEE8]">
        <div className="text-center flex-1">
          <div className="text-[20px] font-medium text-[#111] tabular-nums">{c.nuevosEsteMes}</div>
          <div className="text-[9px] uppercase tracking-[0.07em] text-[#aaa] mt-0.5">Nuevos este mes</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-[20px] font-medium text-[#111] tabular-nums">{c.sinPrecio}</div>
          <div className="text-[9px] uppercase tracking-[0.07em] text-[#aaa] mt-0.5">Sin precio</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-[20px] font-medium text-[#111] tabular-nums">{c.destacados}</div>
          <div className="text-[9px] uppercase tracking-[0.07em] text-[#aaa] mt-0.5">Destacados</div>
        </div>
      </div>
    </div>
  );
}

// ── Últimas variaciones de precio ─────────────────────────────────────────────
function UltimasVariaciones({ items }: { items: any[] }) {
  if (!items?.length) return (
    <div className="bg-white border border-[#E0DED8] px-6 py-10 flex items-center justify-center">
      <p className="text-[11px] uppercase tracking-[0.07em] text-[#ccc]">Sin variaciones registradas</p>
    </div>
  );
  return (
    <div className="bg-white border border-[#E0DED8] divide-y divide-[#F0EEE8] overflow-hidden">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAFAF8] transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#111] truncate">{item.nombre}</p>
            <p className="text-[10px] text-[#aaa] font-mono mt-0.5">{item.sku}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[11px] text-[#bbb] line-through tabular-nums">{fmt(item.anterior)}</span>
              <span className="text-[12px] font-medium text-[#111] tabular-nums">{fmt(item.nuevo)}</span>
            </div>
            <div className={`flex items-center gap-0.5 justify-end mt-0.5 text-[10px] font-medium ${pctColor(item.delta)}`}>
              {pctIcon(item.delta)}
              {item.delta > 0 ? "+" : ""}{item.delta}%
              <span className="text-[#ccc] font-normal ml-1">{fmtDate(item.fecha)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Distribución de precios ───────────────────────────────────────────────────
function DistribucionPrecios({ data }: { data: any[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="bg-white border border-[#E0DED8] px-6 py-5 space-y-3">
      {data.map((d) => (
        <div key={d.rango}>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-[#555]">{d.rango}</span>
            <span className="text-[11px] font-medium text-[#111] tabular-nums">{d.count}</span>
          </div>
          <div className="h-1.5 bg-[#F0EEE8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#111] rounded-full transition-all duration-700"
              style={{ width: max > 0 ? `${(d.count / max) * 100}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Buscador de historial de precios ──────────────────────────────────────────
function PrecioHistorico() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [historial, setHistorial] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/reportes/precio-historico?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data.data?.productos ?? []);
    } catch {}
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 300);
    return () => clearTimeout(t);
  }, [query, buscar]);

  const seleccionar = async (p: any) => {
    setResultados([]);
    setQuery(p.nombre);
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/precio-historico?productId=${p.id}`);
      const data = await res.json();
      setSelected(p);
      setHistorial(data.data);
    } catch {}
    setLoading(false);
  };

  const m = historial?.metricas;
  const serie = historial?.serie ?? [];

  return (
    <div className="bg-white border border-[#E0DED8] overflow-hidden">
      {/* Búsqueda */}
      <div className="px-5 py-4 border-b border-[#E0DED8]">
        <div className="relative">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ccc]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá un producto por SKU o nombre..."
            className="w-full h-9 pl-9 pr-4 text-[12px] border border-[#E0DED8] bg-[#FAFAF8] focus:outline-none focus:border-[#aaa] transition-colors text-[#111] placeholder:text-[#ccc] rounded-sm"
          />
          {/* Dropdown de resultados */}
          {resultados.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[#E0DED8] border-t-0 shadow-lg">
              {resultados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => seleccionar(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#FAFAF8] transition-colors text-left"
                >
                  <div>
                    <span className="text-[12px] font-medium text-[#111]">{p.nombre}</span>
                    <span className="text-[10px] text-[#aaa] font-mono ml-2">{p.sku}</span>
                  </div>
                  <span className="text-[11px] text-[#777]">{fmt(p.precio)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Estado vacío */}
      {!selected && !loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <FiTrendingUp size={28} className="text-[#E0DED8]" />
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#ccc]">Buscá un producto para ver su evolución de precio</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14">
          <div className="w-5 h-5 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin" />
        </div>
      )}

      {/* Resultado */}
      {historial && !loading && (
        <>
          {/* Métricas del producto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#F0EEE8] border-b border-[#E0DED8]">
            {[
              { label: "Precio actual",    val: fmt(m.precioActual) },
              { label: "Precio inicial",   val: fmt(m.precioInicial) },
              { label: "Variación total",  val: `${m.variacionTotal > 0 ? "+" : ""}${m.variacionTotal}%`, color: pctColor(m.variacionTotal) },
              { label: "Cambios registrados", val: m.cantidadCambios },
            ].map(({ label, val, color }) => (
              <div key={label} className="px-5 py-4 text-center">
                <div className={`text-[18px] font-medium tabular-nums ${color ?? "text-[#111]"}`}>{val}</div>
                <div className="text-[9px] uppercase tracking-[0.07em] text-[#aaa] mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          {serie.length > 1 ? (
            <div className="px-5 pt-5 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(v) => fmtDate(v)}
                    tick={{ fontSize: 10, fill: "#bbb" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v)}
                    tick={{ fontSize: 10, fill: "#bbb" }}
                    axisLine={false} tickLine={false} width={52}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-[#111] text-white text-[11px] px-3 py-2 shadow-lg">
                          <div className="text-white/50 mb-0.5">{fmtDate(label)}</div>
                          <div className="font-medium">{fmt(payload[0].value as number)}</div>
                          <div className="text-white/40 text-[10px]">{payload[0]?.payload?.evento}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="precio"
                    stroke="#111"
                    strokeWidth={2}
                    dot={{ fill: "#DF8635", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#DF8635" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-[11px] text-[#aaa]">
                Solo hay {serie.length === 1 ? "un registro de precio" : "registro"} para este producto — no hay variación que mostrar aún.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<"count" | "avgPrecio">("count");

  useEffect(() => {
    fetch("/api/reportes/resumen")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const catData = (data?.porCategoria ?? []).map((c: any) => ({
    ...c,
    name: c.categoria,
  }));
  const marcaData = (data?.porMarca ?? []).slice(0, 8).map((m: any) => ({
    ...m,
    name: m.marca.length > 18 ? m.marca.slice(0, 18) + "…" : m.marca,
  }));
  const maxMarca = Math.max(...marcaData.map((m: any) => m.count), 1);

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-10">

      {/* Encabezado */}
      <div>
        <h1 className="text-[22px] font-medium text-[#111] tracking-tight leading-tight">Reportes</h1>
        <p className="text-[11px] text-[#aaa] mt-1">
          Métricas, variaciones y salud del catálogo de Maxipiso
        </p>
      </div>

      {/* 1 — Resumen general */}
      <Section title="Resumen general" sub="Estado actual del catálogo">
        <EditorialStats c={data?.catalogo} />
      </Section>

      {/* 2 — Salud + últimas variaciones */}
      <Section title="Salud del catálogo y variaciones recientes" sub="Completitud de datos y últimos cambios de precio">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CatalogHealth c={data?.catalogo} />
          <UltimasVariaciones items={data?.ultimasVariaciones ?? []} />
        </div>
      </Section>

      {/* 3 — Evolución de precio por producto */}
      <Section title="Evolución de precio por producto" sub="Ciclo de vida del precio desde el ingreso al catálogo">
        <PrecioHistorico />
      </Section>

      {/* 4 — Distribución por categoría */}
      <Section title="Distribución del catálogo" sub="Cantidad de productos y precio promedio por categoría">
        <div className="bg-white border border-[#E0DED8] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E0DED8]">
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#aaa]">Por categoría</span>
            <div className="flex border border-[#E0DED8] overflow-hidden text-[10px] font-medium">
              <button
                onClick={() => setChartView("count")}
                className={`px-3 py-1.5 transition-colors ${chartView === "count" ? "bg-[#111] text-white" : "text-[#888] hover:text-[#111]"}`}
              >
                Cantidad
              </button>
              <button
                onClick={() => setChartView("avgPrecio")}
                className={`px-3 py-1.5 border-l border-[#E0DED8] transition-colors ${chartView === "avgPrecio" ? "bg-[#111] text-white" : "text-[#888] hover:text-[#111]"}`}
              >
                Precio prom.
              </button>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-4 h-4 border-[1.5px] border-[#111]/20 border-t-[#111] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-4 py-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#bbb" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => chartView === "avgPrecio" ? "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v) : String(v)}
                    tick={{ fontSize: 10, fill: "#bbb" }} axisLine={false} tickLine={false} width={44}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "#DF8635", fillOpacity: 0.05 }} />
                  <Bar dataKey={chartView} radius={[3, 3, 0, 0]}>
                    {catData.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? "#DF8635" : "#111"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Section>

      {/* 5 — Marcas + distribución de precios */}
      <Section title="Marcas y distribución de precios" sub="Ranking de marcas por cantidad y rangos de precio del catálogo">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Ranking marcas */}
          <div className="bg-white border border-[#E0DED8] px-6 py-5 space-y-3">
            <p className="text-[9px] uppercase tracking-[0.08em] text-[#aaa] pb-1 border-b border-[#F0EEE8]">Top marcas por productos</p>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-3 bg-[#F0EEE8] rounded animate-pulse" style={{ width: `${70 - i * 8}%` }} />
                ))
              : marcaData.map((m: any, i: number) => (
                  <div key={m.marca}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-[#555] truncate flex-1 mr-3">
                        <span className="text-[9px] text-[#ccc] tabular-nums mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {m.name}
                      </span>
                      <span className="text-[11px] font-medium text-[#111] tabular-nums shrink-0">{m.count}</span>
                    </div>
                    <div className="h-1 bg-[#F0EEE8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(m.count / maxMarca) * 100}%`,
                          background: i === 0 ? "#DF8635" : "#111",
                        }}
                      />
                    </div>
                  </div>
                ))}
          </div>

          {/* Distribución de precios */}
          <div className="space-y-3">
            <div className="bg-white border border-[#E0DED8] px-5 py-3.5 border-b-0">
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#aaa]">Distribución por rango de precio</p>
            </div>
            {loading
              ? <div className="bg-white border border-[#E0DED8] px-6 py-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3 bg-[#F0EEE8] rounded animate-pulse" />)}
                </div>
              : <DistribucionPrecios data={data?.distribucionPrecios ?? []} />}
          </div>
        </div>
      </Section>

    </div>
  );
}
