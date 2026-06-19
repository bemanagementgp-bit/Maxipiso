"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, active: boolean, duration = 1800, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const timer = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, active, duration, delay]);
  return val;
}

function StatCounter({ target, suffix, prefix = "", label, active, delay }: { target: number; suffix: string; prefix?: string; label: string; active: boolean; delay: number }) {
  const val = useCounter(target, active, 1800, delay);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-[#DF8635]">{prefix}{val}{suffix}</p>
      <p className="text-gray-400 text-sm mt-2">{label}</p>
    </div>
  );
}

const ventajas = [
  {
    title: "Venta por volumen",
    desc: "Precios escalonados según el metraje del proyecto. A mayor volumen, mejor precio.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    title: "Precios competitivos",
    desc: "Importación directa sin intermediarios. El costo más bajo del mercado para maximizar tu margen.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Logística propia",
    desc: "Flota propia de camiones para entrega coordinada en obra, en los tiempos que necesitás.",
    icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
  },
  {
    title: "Cobertura nacional",
    desc: "Entregamos en las 24 provincias. Desde Buenos Aires hasta la Patagonia, llegamos a tu obra.",
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "Atención personalizada",
    desc: "Un asesor técnico dedicado para cada proyecto. Te ayudamos a elegir el producto correcto para cada espacio.",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    title: "Stock garantizado",
    desc: "Más de 1.000 productos disponibles para entrega inmediata. Sin riesgo de desabastecimiento en obra.",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
];

const proyectos = [
  {
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
    tipo: "Residencial",
    desc: "Torres y edificios de vivienda con pisos flotantes y porcelanato rectificado.",
  },
  {
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    tipo: "Comercial",
    desc: "Locales, oficinas y espacios de alto tránsito con materiales de máxima durabilidad.",
  },
  {
    img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    tipo: "Countries & Urbanizaciones",
    desc: "Decks WPC, revestimientos exteriores y pisos para espacios al aire libre.",
  },
];

const WA_OBRAS = "https://wa.me/5422143888894?text=Hola%2C%20tengo%20un%20proyecto%20de%20obra%20y%20quiero%20solicitar%20un%20presupuesto%20de%20Maxipiso";

export default function ProyectosObrasPage() {
  const stats = useInView(0.2);
  const vents = useInView(0.1);
  const projs = useInView(0.1);
  const cta2  = useInView(0.1);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative bg-[#111111] overflow-hidden min-h-[85vh] flex items-center">
        {/* Fondo imagen obras */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/obras-construccion.jpg"
            alt="Obras y construcción"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Acento naranja */}
        <div className="absolute top-0 left-0 w-1 h-full bg-[#DF8635]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-[#DF8635]/15 text-[#DF8635] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Constructoras · Arquitectos · Desarrolladores
            </span>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
              Soluciones para<br />
              <span className="text-[#DF8635]">grandes proyectos.</span>
            </h1>

            <p className="text-gray-300 text-xl leading-relaxed mb-10">
              Abastecemos obras de cualquier escala con stock permanente, precios por volumen y logística coordinada. El N°1 en Argentina trabaja con vos.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href={WA_OBRAS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#DF8635] text-white font-bold px-8 py-4 rounded-full hover:bg-[#c97220] transition-colors text-base shadow-lg shadow-[#DF8635]/20"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Solicitar presupuesto
              </a>
              <a
                href="https://maxipiso.com.ar/collections/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:border-[#DF8635] hover:text-[#DF8635] transition-colors"
              >
                Ver catálogo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-[#F9F8F6] py-16" ref={stats.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <StatCounter target={1300} suffix="+" label="comercios activos"      active={stats.inView} delay={0}   />
            <StatCounter target={1000} suffix="+" label="productos en catálogo"     active={stats.inView} delay={150} />
            <StatCounter target={24}   suffix=""  label="provincias con entrega" active={stats.inView} delay={300} />
            <StatCounter target={60}   suffix="+" label="años de trayectoria"    active={stats.inView} delay={450} />
          </div>
        </div>
      </section>

      {/* ── Por qué elegirnos ── */}
      <section className="py-20 bg-white" ref={vents.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">Ventajas</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
              ¿Por qué elegir Maxipiso<br className="hidden md:block" /> para tu proyecto?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ventajas.map((v, i) => (
              <div
                key={v.title}
                className="group bg-[#F9F8F6] rounded-2xl p-7 border border-gray-100 hover:border-[#DF8635] hover:shadow-lg transition-all duration-300"
                style={{
                  opacity: vents.inView ? 1 : 0,
                  transform: vents.inView ? "translateY(0)" : "translateY(28px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s",
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] mb-5 group-hover:bg-[#DF8635] group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={v.icon} />
                  </svg>
                </div>
                <h3 className="font-bold text-[#111111] text-lg mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tipos de proyecto ── */}
      <section className="py-20 bg-[#111111]" ref={projs.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">Proyectos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Trabajamos en todo tipo de obras
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proyectos.map((p, i) => (
              <div
                key={p.tipo}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3]"
                style={{
                  opacity: projs.inView ? 1 : 0,
                  transform: projs.inView ? "translateY(0)" : "translateY(32px)",
                  transition: "opacity 0.6s ease, transform 0.6s ease",
                  transitionDelay: `${i * 120}ms`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.img}
                  alt={p.tipo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block bg-[#DF8635] text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    {p.tipo}
                  </span>
                  <p className="text-white/80 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo trabajamos ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">El proceso</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">Así trabajamos con vos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: "01", title: "Enviás tu proyecto", desc: "Compartís los planos o especificaciones técnicas del proyecto." },
              { num: "02", title: "Analizamos juntos", desc: "Nuestro equipo técnico evalúa materiales, cantidades y costos." },
              { num: "03", title: "Recibís el presupuesto", desc: "En menos de 48 horas tenés una cotización detallada y a medida." },
              { num: "04", title: "Entregamos en obra", desc: "Coordinamos la entrega en los tiempos del cronograma de tu obra." },
            ].map((paso, i) => (
              <div key={paso.num} className="relative text-center">
                {i < 3 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] right-0 h-px bg-[#DF8635]/20" />
                )}
                <div className="w-14 h-14 rounded-full bg-[#DF8635] text-white font-bold text-lg flex items-center justify-center mx-auto mb-5">
                  {paso.num}
                </div>
                <h3 className="font-bold text-[#111111] mb-2">{paso.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-[#111111] py-20" ref={cta2.ref}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            style={{
              opacity: cta2.inView ? 1 : 0,
              transform: cta2.inView ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">Contacto</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Tenés un proyecto en mente?
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              Contanos los detalles y te armamos un presupuesto a medida. Sin compromiso.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={WA_OBRAS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#DF8635] text-white font-bold px-8 py-4 rounded-full hover:bg-[#c97220] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Solicitar presupuesto
              </a>
              <a
                href="mailto:ventas@maxipiso.com.ar"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:border-[#DF8635] hover:text-[#DF8635] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar proyecto por mail
              </a>
              <Link
                href="/novedades"
                className="inline-flex items-center gap-2 border border-white/10 text-white/50 font-semibold px-8 py-4 rounded-full hover:text-white hover:border-white/20 transition-colors"
              >
                Volver a novedades
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
