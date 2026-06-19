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

const beneficios = [
  {
    title: "Stock garantizado",
    desc: "Más de 1.000 productos disponibles para entrega inmediata. Sin esperas, sin incertidumbre.",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
  {
    title: "Precios de mayorista",
    desc: "Importación directa sin intermediarios. El precio más competitivo del mercado para que vos ganés más.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Logística propia",
    desc: "Flota propia que llega a las 24 provincias. Despacho inmediato desde nuestro centro de distribución.",
    icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
  },
  {
    title: "Asesoramiento técnico",
    desc: "Más de 60 años de experiencia a tu disposición. Nuestro equipo te ayuda a elegir el producto correcto para cada proyecto.",
    icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    title: "Amplia variedad",
    desc: "Pisos flotantes, porcelanato, madera, vinílicos, decks WPC, revestimientos y más. Todo en un solo proveedor.",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    title: "Respaldo de marca",
    desc: "Somos el N°1 en Argentina. Trabajar con Maxipiso te da credibilidad frente a tus propios clientes.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

const pasos = [
  {
    num: "01",
    title: "Contactanos",
    desc: "Escribinos por WhatsApp o por mail. Un asesor comercial te va a contactar en menos de 24 horas.",
  },
  {
    num: "02",
    title: "Conocemos tu negocio",
    desc: "Analizamos qué líneas de producto se adaptan mejor a tu mercado y te armamos una propuesta a medida.",
  },
  {
    num: "03",
    title: "Empezás a vender",
    desc: "Accedés al catálogo completo con precios de mayorista y comenzás a generar ventas con el respaldo del N°1.",
  },
];

const lineas = [
  { label: "Pisos Flotantes", href: "https://maxipiso.com.ar/collections/pisos-flotantes" },
  { label: "Pisos de Madera", href: "https://maxipiso.com.ar/collections/pisos-de-madera" },
  { label: "Porcelanato", href: "https://maxipiso.com.ar/collections/porcelanato" },
  { label: "Revestimientos", href: "https://maxipiso.com.ar/collections/revestimiento-de-pared" },
  { label: "Deck WPC", href: "https://maxipiso.com.ar/collections/deck-wpc" },
  { label: "Pisos Vinílicos", href: "https://maxipiso.com.ar/collections/pisos-vinilicos" },
];

const WA_URL = "https://wa.me/5422143888894?text=Hola%2C%20quiero%20información%20sobre%20cómo%20trabajar%20con%20Maxipiso";

export default function TrabajaConMaxipisoPage() {
  const stats = useInView(0.2);
  const bens = useInView(0.1);
  const steps = useInView(0.1);
  const cat = useInView(0.1);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative bg-[#111111] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(223,134,53,0.15)_0%,_transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-[#DF8635]/15 text-[#DF8635] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-[#DF8635] animate-pulse" />
              Para comercios y distribuidores
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
              Vendé los mejores pisos<br />
              <span className="text-[#DF8635]">con el respaldo del N°1.</span>
            </h1>
            <p className="text-gray-300 text-xl leading-relaxed mb-10 max-w-2xl">
              Más de 1.300 comercios en todo el país confían en Maxipiso para abastecer su negocio. Stock permanente, precios mayoristas y logística propia hasta tu puerta.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#DF8635] text-white font-bold px-8 py-4 rounded-full hover:bg-[#c97220] transition-colors text-base"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Quiero ser distribuidor
              </a>
              <a
                href="https://maxipiso.com.ar/collections/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:border-[#DF8635] hover:text-[#DF8635] transition-colors text-base"
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
            <StatCounter target={1300} suffix="+"  label="comercios activos"      active={stats.inView} delay={0}   />
            <StatCounter target={1000} suffix="+"  label="productos en catálogo"      active={stats.inView} delay={150} />
            <StatCounter target={24}   suffix=""   label="provincias con entrega"  active={stats.inView} delay={300} />
            <StatCounter target={60}   suffix="+"  label="años de trayectoria"     active={stats.inView} delay={450} />
          </div>
        </div>
      </section>

      {/* ── Por qué Maxipiso ── */}
      <section className="py-20 bg-white" ref={bens.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">Por qué elegirnos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
              Todo lo que necesita tu negocio,<br className="hidden md:block" /> en un solo proveedor
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {beneficios.map((b, i) => (
              <div
                key={b.title}
                className="group bg-[#F9F8F6] rounded-2xl p-7 border border-gray-100 hover:border-[#DF8635] hover:shadow-lg transition-all duration-300"
                style={{
                  opacity: bens.inView ? 1 : 0,
                  transform: bens.inView ? "translateY(0)" : "translateY(28px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  transitionDelay: `${i * 80}ms`,
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] mb-5 group-hover:bg-[#DF8635] group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={b.icon} />
                  </svg>
                </div>
                <h3 className="font-bold text-[#111111] text-lg mb-2">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo empezar ── */}
      <section className="py-20 bg-[#111111]" ref={steps.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">El proceso</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Empezar es simple</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Línea conectora — desktop */}
            <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-[#DF8635]/20" />

            {pasos.map((p, i) => (
              <div
                key={p.num}
                className="relative bg-[#1A1A1A] rounded-2xl p-8 border border-white/5 text-center"
                style={{
                  opacity: steps.inView ? 1 : 0,
                  transform: steps.inView ? "translateY(0)" : "translateY(32px)",
                  transition: "opacity 0.6s ease, transform 0.6s ease",
                  transitionDelay: `${i * 150}ms`,
                }}
              >
                <div className="w-14 h-14 rounded-full bg-[#DF8635] text-white font-bold text-lg flex items-center justify-center mx-auto mb-6 relative z-10">
                  {p.num}
                </div>
                <h3 className="font-bold text-white text-xl mb-3">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#DF8635] text-white font-bold px-10 py-4 rounded-full hover:bg-[#c97220] transition-colors text-base"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactar asesor ahora
            </a>
          </div>
        </div>
      </section>

      {/* ── Líneas de producto ── */}
      <section className="py-20 bg-[#F9F8F6]" ref={cat.ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">Catálogo</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
              +1.000 productos para tu local
            </h2>
            <p className="text-gray-400 mt-3 text-lg">La mayor variedad de pisos y revestimientos importados del país.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {lineas.map(({ label, href }, i) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-2xl p-5 text-center border border-gray-100 hover:border-[#DF8635] hover:shadow-md transition-all duration-300 block"
                style={{
                  opacity: cat.inView ? 1 : 0,
                  transform: cat.inView ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s",
                  transitionDelay: `${i * 70}ms`,
                }}
              >
                <p className="font-semibold text-[#111111] text-sm group-hover:text-[#DF8635] transition-colors">{label}</p>
                <p className="text-[#DF8635] text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Ver →</p>
              </a>
            ))}
          </div>
          <div className="text-center mt-10">
            <a
              href="https://maxipiso.com.ar/collections/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 hover:border-[#DF8635] hover:text-[#DF8635] text-sm font-semibold px-6 py-3 rounded-full transition-all"
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
      <section className="bg-[#DF8635] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para crecer con el N°1?
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Más de 1.300 comercios ya trabajan con Maxipiso. Sumate y empezá a ofrecer la mejor calidad a tus clientes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-[#DF8635] font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Escribinos por WhatsApp
            </a>
            <Link
              href="/novedades"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
            >
              Volver a novedades
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
