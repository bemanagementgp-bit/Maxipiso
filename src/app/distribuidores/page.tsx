"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { distributors } from "@/data/distributors";
import { useForm } from "react-hook-form";

const DistributorMap = dynamic(
  () => import("@/components/distribuidores/DistributorMap"),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" /> }
);

type FormData = {
  nombre: string;
  empresa: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  email: string;
  mensaje: string;
};

const WA_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function DistribuidoresPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const filtered = useMemo(() =>
    distributors.filter((d) =>
      search === "" ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.city.toLowerCase().includes(search.toLowerCase()) ||
      d.province.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const selectedDist = distributors.find((d) => d.id === selected);

  const onSubmit = async (data: FormData) => {
    setFormStatus("loading");
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: data.nombre,
          empresa: data.empresa,
          telefono: data.telefono,
          email: data.email,
          mensaje: `[SOLICITUD DE DISTRIBUIDOR]\nCiudad: ${data.ciudad}\nProvincia: ${data.provincia}\n\n${data.mensaje}`,
        }),
      });
      if (res.ok) { setFormStatus("success"); reset(); }
      else setFormStatus("error");
    } catch { setFormStatus("error"); }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#111111] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Distribuidores</h1>
          <p className="text-gray-300 text-lg">La red de distribución más grande del país</p>
        </div>
      </div>

      {/* Mapa izquierda · Lista derecha */}
      <div className="flex flex-col lg:flex-row h-[640px]">

        {/* Mapa */}
        <div className="lg:w-3/5 h-80 lg:h-full bg-gray-100 overflow-hidden">
          <DistributorMap
            distributors={filtered}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* Lista — scrollable */}
        <div className="lg:w-2/5 flex flex-col bg-white border-l border-gray-100 h-full overflow-hidden">
          {/* Buscador */}
          <div className="p-5 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por ciudad o provincia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DF8635]"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{filtered.length} distribuidores encontrados</p>
          </div>

          {/* Cards lista */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.map((d) => {
              const isSelected = selected === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(isSelected ? null : d.id)}
                  className={`w-full text-left px-5 py-4 transition-colors hover:bg-gray-50 ${
                    isSelected ? "bg-[#DF8635]/5 border-l-4 border-[#DF8635]" : "border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-2 h-2 rounded-full bg-[#DF8635] shrink-0" />
                        <p className="font-semibold text-[#111111] text-sm truncate">{d.name}</p>
                      </div>
                      <p className="text-xs text-gray-500 ml-4">{d.city}, {d.province}</p>
                      {d.address && <p className="text-xs text-gray-400 ml-4 mt-0.5">{d.address}</p>}
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-[#DF8635] shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>

                  {/* Detalle expandido */}
                  {isSelected && (
                    <div className="ml-4 mt-3 pt-3 border-t border-[#DF8635]/20">
                      {d.phone && (
                        <a
                          href={`https://wa.me/${d.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 text-sm font-medium text-[#DF8635] hover:underline mb-2"
                        >
                          {WA_ICON}
                          {d.phone}
                        </a>
                      )}
                      {d.email && (
                        <p className="text-xs text-gray-500">{d.email}</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Botón ser distribuidor */}
          <div className="p-5 border-t border-gray-100 bg-gray-50">
            <a
              href="#ser-distribuidor"
              className="w-full flex items-center justify-center gap-2 bg-[#111111] text-white font-semibold py-3 rounded-xl hover:bg-[#333] transition-colors text-sm"
            >
              Quiero ser distribuidor
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Ser distribuidor form */}
      <div id="ser-distribuidor" className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-8">
              <span className="inline-block bg-[#DF8635]/10 text-[#DF8635] text-sm font-semibold px-4 py-1 rounded-full mb-3">
                ¿Querés sumarte?
              </span>
              <h2 className="text-2xl font-bold text-[#111111]">Quiero ser distribuidor</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Completá el formulario y te contactamos con toda la información.
              </p>
            </div>

            {formStatus === "success" ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-[#111111] mb-2">¡Solicitud enviada!</h3>
                <p className="text-gray-500 text-sm">Te contactaremos a la brevedad.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">Nombre *</label>
                    <input {...register("nombre", { required: true })} placeholder="Tu nombre" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">Requerido</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">Empresa</label>
                    <input {...register("empresa")} placeholder="Nombre de tu negocio" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">Ciudad *</label>
                    <input {...register("ciudad", { required: true })} placeholder="Tu ciudad" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" />
                    {errors.ciudad && <p className="text-red-500 text-xs mt-1">Requerido</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">Provincia *</label>
                    <input {...register("provincia", { required: true })} placeholder="Tu provincia" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" />
                    {errors.provincia && <p className="text-red-500 text-xs mt-1">Requerido</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">Teléfono *</label>
                    <input {...register("telefono", { required: true })} placeholder="+54 221 ..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" />
                    {errors.telefono && <p className="text-red-500 text-xs mt-1">Requerido</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">Email *</label>
                    <input {...register("email", { required: true, pattern: /^\S+@\S+$/i })} placeholder="tu@email.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">Email inválido</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">¿Qué vendés actualmente?</label>
                  <textarea {...register("mensaje")} rows={3} placeholder="Contanos sobre tu negocio..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635] resize-none" />
                </div>
                {formStatus === "error" && (
                  <p className="text-red-500 text-sm">Error al enviar. Intentá por WhatsApp.</p>
                )}
                <button
                  type="submit"
                  disabled={formStatus === "loading"}
                  className="w-full bg-[#DF8635] text-white font-semibold py-3 rounded-xl hover:bg-[#c97220] transition-colors disabled:opacity-60"
                >
                  {formStatus === "loading" ? "Enviando..." : "Enviar solicitud"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
