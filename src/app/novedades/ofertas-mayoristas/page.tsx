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

function StatCounter({ target, suffix, label, active, delay }: { target: number; suffix: string; label: string; active: boolean; delay: number }) {
  const val = useCounter(target, active, 1800, delay);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-[#DF8635]">{val}{suffix}</p>
      <p className="text-gray-400 text-sm mt-2">{label}</p>
    </div>
  );
}

const queEncontras = [
  {
    title: "Ofertas destacadas",
    desc: "Los mejores precios del catálogo seleccionados para compra rápida y volumen.",
    icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  },
  {
    title: "Packs por cantidad",
    desc: "Precios escalonados: a mayor cantidad, mejor precio por m². Ideal para revendedores.",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    title: "Envío inmediato",
    desc: "Stock listo para despacho. Salida el mismo día para pedidos confirmados antes de las 14 hs.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "Stock actualizado",
    desc: "Precios y disponibilidad en tiempo real. Lo que ves es lo que tenemos en depósito.",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
];

const categorias = [
  { label: "Pisos Flotantes",  href: "https://maxipiso.com.ar/collections/pisos-flotantes",           badge: "Más vendido" },
  { label: "Porcelanato",      href: "https://maxipiso.com.ar/collections/porcelanato",                badge: "Oferta" },
  { label: "Pisos de Madera",  href: "https://maxipiso.com.ar/collections/pisos-de-madera",            badge: null },
  { label: "Pisos Vinílicos",  href: "https://maxipiso.com.ar/collections/pisos-vinilicos",            badge: "Nuevo" },
  { label: "Deck WPC",         href: "https://maxipiso.com.ar/collections/deck-wpc",                   badge: null },
  { label: "Revestimientos",   href: "https://maxipiso.com.ar/collections/revestimiento-de-pared",     badge: "Oferta" },
];

const WA_OFERTAS = "https://wa.me/5422143888894?text=Hola%2C%20quiero%20consultar%20las%20ofertas%20y%20precios%20mayoristas%20de%20Maxipiso";

export default function OfertasMayoristasPage() {
  const stats  = useInView(0.2);
  const que    = useInView(0.1);
  const cats   = useInView(0.1);
  const cta2   = useInView(0.1);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative bg-[#111111] overflow-hidden min-h-[85vh] flex items-center">
        {/* Fondo */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/maderas.jpg"
            alt="Depósito Maxipiso"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        </div>

        {/* Acento naranja */}
        <div className="absolute top-0 left-0 w-1 h-full bg-[#DF8635]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-[#DF8635]/15 text-[#DF8635] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Precios mayoristas · Compra rápida
            </span>

            <div className="flex items-start gap-6">
              <div className="flex-1">
                <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-4 tracking-tight">
                  OFERTAS<br />
                  <span className="text-[#DF8635]">IMPERDIBLES</span>
                </h1>
                <p className="text-gray-300 text-xl leading-relaxed mb-3 font-semibold">
                  Precios mayoristas que convienen.
                </p>
                <p className="text-gray-400 text-base leading-relaxed mb-10">
                  Descuentos exclusivos en pisos y revestimientos. Stock disponible para entrega inmediata en todo el país.
                </p>
              </div>

              {/* Badge 30% OFF */}
              <div className="shrink-0 hidden sm:flex flex-col items-center justify-center w-28 h-28 rounded-full bg-[#DF8635] shadow-2xl shadow-[#DF8635]/30 border-4 border-white/10">
                <p className="text-white text-xs font-bold uppercase leading-tight text-center">Hasta</p>
                <p className="text-white text-3xl font-black leading-none">30%</p>
                <p className="text-white text-sm font-bold">OFF</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://maxipiso.com.ar/collections/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#DF8635] text-white font-bold px-8 py-4 rounded-full hover:bg-[#c97220] transition-colors text-base shadow-lg shadow-[#DF8635]/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver ofertas
              </a>
              <a
                href={WA_OFERTAS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:border-[#DF8635] hover:text-[#DF8635] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Consultar stock
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
            <StatCounter target={1000} suffix="+" label="productos en catálogo"  active={stats.inView} delay={150} />
            <StatCounter target={24}   suffix=""  label="provincias con entrega" active={stats.inView} delay={300} />
            <StatCounter target={60}   suffix="+" label="años de trayectoria"    active={stats.inView} delay={450} />
          </div>
        </div>
      </section>

      {/* ── Qué encontrás ── */}
      <section className="py-20 bg-white" ref={que.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">Beneficios</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
              ¿Qué encontrás en esta sección?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {queEncontras.map((item, i) => (
              <div
                key={item.title}
                className="group bg-[#F9F8F6] rounded-2xl p-7 border border-gray-100 hover:border-[#DF8635] hover:shadow-lg transition-all duration-300 text-center"
                style={{
                  opacity: que.inView ? 1 : 0,
                  transform: que.inView ? "translateY(0)" : "translateY(28px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s",
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] mb-5 mx-auto group-hover:bg-[#DF8635] group-hover:text-white transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                </div>
                <h3 className="font-bold text-[#111111] text-base mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categorías con ofertas ── */}
      <section className="py-20 bg-[#111111]" ref={cats.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">Catálogo</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Explorá por categoría</h2>
            <p className="text-white/40 mt-3 text-lg">Encontrá el mejor precio en cada línea de producto.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categorias.map(({ label, href, badge }, i) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-[#1A1A1A] rounded-2xl p-5 text-center border border-white/5 hover:border-[#DF8635] hover:shadow-[0_0_20px_rgba(223,134,53,0.15)] transition-all duration-300 block aspect-square flex flex-col items-center justify-center"
                style={{
                  opacity: cats.inView ? 1 : 0,
                  transform: cats.inView ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s",
                  transitionDelay: `${i * 70}ms`,
                }}
              >
                {badge && (
                  <span className="absolute top-2 right-2 bg-[#DF8635] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
                <p className="font-semibold text-white text-sm group-hover:text-[#DF8635] transition-colors">{label}</p>
                <p className="text-[#DF8635] text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Ver →</p>
              </a>
            ))}
          </div>
          <div className="text-center mt-10">
            <a
              href="https://maxipiso.com.ar/collections/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 text-white/60 hover:text-white hover:border-[#DF8635] text-sm font-semibold px-6 py-3 rounded-full transition-all"
            >
              Ver catálogo completo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-[#DF8635] py-20" ref={cta2.ref}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            style={{
              opacity: cta2.inView ? 1 : 0,
              transform: cta2.inView ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Querés comprar al mejor precio?
            </h2>
            <p className="text-white/80 text-lg mb-10">
              Contactá a un asesor y conseguí el precio mayorista más conveniente del mercado.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://maxipiso.com.ar/collections/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-[#DF8635] font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition-colors"
              >
                Comprar ahora
              </a>
              <a
                href={WA_OFERTAS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 border-2 border-white text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Consultar stock
              </a>
              <Link
                href="/novedades"
                className="inline-flex items-center gap-2 border border-white/30 text-white/70 font-semibold px-8 py-4 rounded-full hover:text-white hover:border-white/50 transition-colors"
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
