"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import SafeImage from "@/components/catalog/SafeImage";
import { MdVerifiedUser, MdWarehouse, MdOutlineLocalShipping } from "react-icons/md";
import { FaWhatsapp, FaGlobe } from "react-icons/fa";
import { FiArrowRight, FiCheck, FiMail, FiMapPin, FiPackage, FiSettings, FiGrid, FiLayers, FiTool, FiSun, FiLayout, FiSquare, FiColumns, FiBox } from "react-icons/fi";
import HeroCarousel from "@/components/home/HeroCarousel";
import { articles as novedadesArticles } from "@/data/novedades";
import type { IconType } from "react-icons";
import { hrefDeLinea, type LineaHome } from "@/lib/lineas-home";
import { useT } from "@/components/providers/IdiomaProvider";
import type { Diccionario } from "@/lib/i18n";

const novedadesLandings = [
  { slug: "ofertas-mayoristas", title: "Ofertas imperdibles — hasta 30% OFF", excerpt: "Descuentos exclusivos en pisos y revestimientos. Packs por cantidad, envío inmediato y stock actualizado.", image: "/maderas.jpg", category: "Ofertas", date: "Actualizado permanentemente" },
  { slug: "trabaja-con-maxipiso", title: "¿Por qué trabajar con Maxipiso?", excerpt: "Stock garantizado, precios de mayorista, logística propia y más de 1.000 productos.", image: "/equipo.jpg", category: "Para comercios", date: "Para revendedores" },
  { slug: "proyectos-y-obras", title: "Soluciones para grandes proyectos", excerpt: "Abastecemos obras de cualquier escala. Stock permanente, precios por volumen y asesoramiento técnico.", image: "/obras-construccion.jpg", category: "Obras & Proyectos", date: "Para constructoras" },
];
const allNovedades = [...novedadesLandings, ...novedadesArticles];

// ── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, active: boolean, duration = 2000, startDelay = 0) {
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
    }, startDelay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, active, duration, startDelay]);
  return val;
}

// ── Data ─────────────────────────────────────────────────────────────────────

// El ícono de cada línea es un componente de React: no puede vivir en la base,
// así que se busca acá por el slug de la fila. Un slug sin ícono cae en FiGrid
// antes que romper el home.
const ICONOS_POR_SLUG: Record<string, IconType> = {
  "pisos-flotantes": FiGrid,
  "pisos-vinilicos": FiLayers,
  "porcellanatos": FiSquare,
  "pisos-madera": FiColumns,
  "decks": FiSun,
  "revestimientos": FiLayout,
  "maderas": FiBox,
  "accesorios": FiTool,
};

const statsDe = (t: Diccionario) => [
  { value: 1300,    label: t.home.statsClientes },
  { value: 1500000, label: t.home.statsStock },
  { value: 60,      label: t.home.statsAnios },
  { value: 20000,   label: t.home.statsDeposito },
];

const featuresDe = (t: Diccionario) => [
  { title: t.home.beneficios.importacion.titulo,   description: t.home.beneficios.importacion.texto,   Icon: MdVerifiedUser },
  { title: t.home.beneficios.cobertura.titulo,     description: t.home.beneficios.cobertura.texto,     Icon: FiMapPin },
  { title: t.home.beneficios.variedad.titulo,      description: t.home.beneficios.variedad.texto,      Icon: FiPackage },
  { title: t.home.beneficios.asesoramiento.titulo, description: t.home.beneficios.asesoramiento.texto, Icon: FiSettings },
]


const CDN = "https://cdn.shopify.com/s/files/1/0656/7251/1711";

const ROW1_IMGS = [
  `${CDN}/products/acacia-white.jpg`,
  `${CDN}/products/avinon-honey.jpg`,
  `${CDN}/products/Arendal-Autum-amb.jpg`,
  `${CDN}/products/ATELIERBEIGE.jpg`,
  `${CDN}/products/TROPICAL2.jpg`,
  `${CDN}/products/avinon-gris.jpg`,
  `${CDN}/products/Arendal-Summer-amb.jpg`,
  `${CDN}/products/ATELIERNATURAL.jpg`,
];

const ROW2_IMGS = [
  `${CDN}/products/EGO2.jpg`,
  `${CDN}/products/alamo-natural.jpg`,
  `${CDN}/products/ATELIERGRIS.jpg`,
  `${CDN}/products/IDROBLE1.jpg`,
  `${CDN}/products/avinon-smoke.jpg`,
  `${CDN}/products/VINTAGE1.jpg`,
  `${CDN}/products/ATELIERTAUPE.jpg`,
  `${CDN}/products/alisorustico_b5c83623-dd1d-442c-a658-cf5e666df667.jpg`,
];

const cadenaDe = (t: Diccionario) => [
  { step: "01", title: t.home.cadena.importacion.titulo,  desc: t.home.cadena.importacion.texto,  Icon: FaGlobe },
  { step: "02", title: t.home.cadena.stock.titulo,        desc: t.home.cadena.stock.texto,        Icon: MdWarehouse },
  { step: "03", title: t.home.cadena.distribucion.titulo, desc: t.home.cadena.distribucion.texto, Icon: MdOutlineLocalShipping },
];


// ── Ticker ────────────────────────────────────────────────────────────────────

function Ticker() {
  const t = useT();
  // Duplicado a proposito: la animacion desplaza la mitad del ancho y vuelve al
  // origen, y con una sola copia se veria el corte.
  const items = [...t.home.ticker, ...t.home.ticker];
  return (
    <div className="bg-[#111111] py-3 overflow-hidden border-t border-white/5">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 px-6">
            <span className="text-[#DF8635]">◆</span>
            <span className="text-white/80 uppercase tracking-widest text-xs font-medium">{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stats wall ────────────────────────────────────────────────────────────────

function fmtStat(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "m";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

function StatCard({ value, label, active, delay }: {
  value: number; label: string; active: boolean; delay: number;
}) {
  const count = useCounter(value, active, 1800, delay * 1000);
  return (
    <div
      className={`text-center px-2 sm:px-4 md:px-6 py-2 transition-all duration-700 ${active ? "animate-fade-up opacity-100" : "opacity-0"}`}
      style={active ? { animationDelay: `${delay}s` } : undefined}
    >
      <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#DF8635] leading-none tabular-nums">
        +{fmtStat(count)}
      </div>
      <div className="mt-3 text-white/50 text-[11px] sm:text-sm uppercase tracking-wide sm:tracking-widest font-medium">
        {label}
      </div>
    </div>
  );
}

function StatsSection() {
  const t = useT();
  const { ref, inView } = useInView(0.2);
  return (
    <section ref={ref} className="bg-[#0a0a0a] py-20 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#DF8635] to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em]">
            {t.home.statsEtiqueta}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-white/10">
          {statsDe(t).map((s, i) => (
            <StatCard
              key={s.label}
              value={s.value}
              label={s.label}
              active={inView}
              delay={0.05 + i * 0.12}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#DF8635] to-transparent" />
    </section>
  );
}

// ── Scroll reveal wrapper ─────────────────────────────────────────────────────

function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, inView } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: inView ? `${delay}s` : "0s" }}
    >
      {children}
    </div>
  );
}

// ── Novedades carousel ───────────────────────────────────────────────────────

function NovedadesCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = [...allNovedades, ...allNovedades, ...allNovedades];

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector("a")?.offsetWidth ?? 280;
    el.scrollBy({ left: dir === "left" ? -(cardW + 20) : (cardW + 20), behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const oneSetWidth = el.scrollWidth / 3;
    el.scrollLeft = oneSetWidth;

    const handleScroll = () => {
      if (el.scrollLeft < 10) {
        el.style.scrollBehavior = "auto";
        el.scrollLeft += oneSetWidth;
        el.style.scrollBehavior = "";
      } else if (el.scrollLeft >= oneSetWidth * 2 - 10) {
        el.style.scrollBehavior = "auto";
        el.scrollLeft -= oneSetWidth;
        el.style.scrollBehavior = "";
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative group/carousel">
      <button
        onClick={() => scroll("left")}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-xl border border-gray-100 flex items-center justify-center transition-all duration-300 hover:bg-[#DF8635] hover:text-white hover:border-[#DF8635] hover:scale-110"
        aria-label="Anterior"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-xl border border-gray-100 flex items-center justify-center transition-all duration-300 hover:bg-[#DF8635] hover:text-white hover:border-[#DF8635] hover:scale-110"
        aria-label="Siguiente"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto px-4 sm:px-8 lg:px-16"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {items.map((card, i) => (
          <Link
            key={`${card.slug}-${i}`}
            href={`/novedades/${card.slug}`}
            className="group block flex-shrink-0 w-[260px] snap-start"
          >
            <article className="overflow-hidden border border-gray-200 hover:border-[#DF8635] hover:shadow-xl transition-all duration-300 flex flex-col bg-white">
              <div className="relative aspect-square overflow-hidden bg-gray-100 shrink-0">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-[#DF8635] text-white text-[9px] font-semibold px-2.5 py-1 uppercase tracking-wide">
                  {card.category}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-1.5">
                <p className="text-gray-400 text-[10px] uppercase tracking-widest">{card.date}</p>
                <h3 className="font-bold text-[#111111] text-sm leading-snug group-hover:text-[#DF8635] transition-colors line-clamp-2">
                  {card.title}
                </h3>
                <span className="mt-1 text-[#DF8635] text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Leer más <FiArrowRight size={12} />
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Product gallery marquee ───────────────────────────────────────────────────

function GalleryMarquee() {
  const t = useT();
  const r1 = [...ROW1_IMGS, ...ROW1_IMGS];
  const r2 = [...ROW2_IMGS, ...ROW2_IMGS];
  return (
    <section className="bg-white py-16 overflow-hidden border-y border-gray-100">
      <Reveal className="text-center mb-10 px-4">
        <p className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-2">
          La mayor variedad del mercado
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
          +1000 productos en catálogo
        </h2>
      </Reveal>
      <div className="flex gap-3 mb-3 animate-ticker">
        {r1.map((src, i) => (
          <div key={i} className="shrink-0 w-64 h-44 rounded-2xl overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 animate-ticker-reverse">
        {r2.map((src, i) => (
          <div key={i} className="shrink-0 w-64 h-44 rounded-2xl overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
      <Reveal className="text-center mt-10 px-4">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 border border-[#111111] text-[#111111] text-sm font-semibold px-7 py-3 rounded-full hover:bg-[#111111] hover:text-white transition-colors"
        >
          {t.nav.verCatalogoCompleto}
          <FiArrowRight size={16} />
        </Link>
      </Reveal>
    </section>
  );
}

// ── Value chain ────────────────────────────────────────────────────────────────

function CadenaValor() {
  const t = useT();
  return (
    <section className="py-24 bg-[#F9F8F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Video importación */}
        <Reveal className="mt-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">{t.home.importacionEtiqueta}</span>
              <h3 className="text-2xl md:text-3xl font-bold text-[#111111] leading-tight mb-4">
                {t.home.importacion.titulo}
              </h3>
              <p className="text-gray-500 leading-relaxed mb-6">
                {t.home.importacion.texto}
              </p>
              <ul className="space-y-3">
                {t.home.importacion.puntos.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-600 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#DF8635]/15 flex items-center justify-center shrink-0 text-[#DF8635]">
                      <FiCheck size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-video bg-black">
              <video
                src="https://res.cloudinary.com/dnaom2evd/video/upload/v1779135594/Importacion_qz91dt.mp4"
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Contact section ───────────────────────────────────────────────────────────

type FormData = { nombre: string; empresa: string; telefono: string; email: string; mensaje: string };

function ContactSection() {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/contacto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { setStatus("success"); reset(); } else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <section id="contacto" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <span className="text-[#DF8635] text-sm font-semibold uppercase tracking-widest">{t.home.contactoEtiqueta}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mt-3">{t.home.contactoTitulo}</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">Completá el formulario y un asesor te responde a la brevedad. También podés escribirnos por WhatsApp.</p>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info */}
          <Reveal>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] shrink-0">
                  <FaWhatsapp size={20} />
                </div>
                <div>
                  <p className="font-semibold text-[#111111]">WhatsApp</p>
                  <a href="https://wa.me/542214388894" target="_blank" rel="noopener noreferrer" className="text-[#DF8635] hover:underline">+54 221 438-8894</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] shrink-0">
                  <FiMail size={20} />
                </div>
                <div>
                  <p className="font-semibold text-[#111111]">{t.home.emailVentas}</p>
                  <a href="mailto:ventas@maxipiso.com.ar" className="text-[#DF8635] hover:underline">ventas@maxipiso.com.ar</a>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {status === "success" ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                    <FiCheck size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold text-[#111111] mb-2">{t.home.mensajeEnviado}</h3>
                  <p className="text-gray-500 mb-6">{t.home.mensajeEnviadoDetalle}</p>
                  <button onClick={() => setStatus("idle")} className="text-[#DF8635] underline text-sm">{t.home.enviarOtro}</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">{t.home.campoNombre} *</label>
                      <input {...register("nombre", { required: "Requerido" })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" placeholder="Tu nombre" />
                      {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">{t.home.campoEmpresa}</label>
                      <input {...register("empresa")} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" placeholder="Nombre de la empresa" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">{t.home.campoTelefono} *</label>
                      <input {...register("telefono", { required: "Requerido" })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" placeholder="+54 221 ..." />
                      {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">{t.home.campoEmail} *</label>
                      <input {...register("email", { required: "Requerido", pattern: { value: /^\S+@\S+$/i, message: "Email inválido" } })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635]" placeholder="tu@email.com" />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-1">{t.home.campoMensaje} *</label>
                    <textarea {...register("mensaje", { required: "Requerido" })} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DF8635] resize-none" placeholder="Contanos en qué te podemos ayudar..." />
                    {errors.mensaje && <p className="text-red-500 text-xs mt-1">{errors.mensaje.message}</p>}
                  </div>
                  {status === "error" && <p className="text-red-500 text-sm">{t.home.errorEnvio}</p>}
                  <button type="submit" disabled={status === "loading"} className="w-full bg-[#DF8635] text-white font-semibold py-3 rounded-xl hover:bg-[#c97220] transition-colors disabled:opacity-60">
                    {status === "loading" ? t.home.enviando : t.home.enviar}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * El home entero. Recibe las líneas ya leídas de la base por el server
 * component de `page.tsx`: así llegan renderizadas en el HTML, sin salto ni
 * fetch del lado del cliente.
 */
export default function HomeClient({ lineas }: { lineas: LineaHome[] }) {
  const t = useT();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden h-[86vh] min-h-[560px] flex items-center">
        <HeroCarousel />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />

        {/* Sello — esquina superior derecha, solo desktop */}
        <div className="absolute top-8 right-10 z-10 hidden lg:block opacity-90">
          <img
            src="/sello-blanco.gif"
            alt="Maxipiso N°1"
            className="w-36 drop-shadow-lg"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center gap-2 text-[#DF8635] text-sm font-semibold uppercase tracking-widest mb-6 animate-fade-up"
              style={{ animationDelay: "0.05s" }}
            >
              <span className="w-8 h-px bg-[#DF8635]" />
              {t.home.heroEtiqueta}
            </span>

            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none mb-8 text-white text-balance animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              {t.home.heroTituloA}{" "}
              <span className="text-[#DF8635]">{t.home.heroTituloB}</span>{" "}
              {t.home.heroTituloC}
            </h1>

            <div
              className="flex flex-wrap gap-4 animate-fade-up"
              style={{ animationDelay: "0.38s" }}
            >
              <Link
                href="/catalogo"
                className="bg-[#DF8635] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#c97220] transition-colors text-base"
              >
                {t.home.verCatalogo}
              </Link>
              <a
                href="https://wa.me/542214388894?text=Hola%2C%20quiero%20información%20sobre%20productos%20Maxipiso"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-white text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white hover:text-[#111111] transition-colors text-base flex items-center gap-2"
              >
                <FaWhatsapp size={20} />
                {t.home.contactarAsesor}
              </a>
            </div>
          </div>
        </div>

      </section>

      {/* Ticker */}
      <Ticker />

      {/* Líneas de producto */}
      <section className="bg-white py-20">
        <div className="max-w-[104rem] mx-auto px-4 sm:px-6 lg:px-6">
          <Reveal className="text-center mb-12">
            <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-3 block">{t.home.lineasEtiqueta}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
              {t.home.lineasTitulo}
            </h2>
            <p className="text-gray-400 text-lg mt-3">
              {t.home.lineasSubtitulo}
            </p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {lineas.map(({ slug, label, imagenUrl }, i) => {
              const Icon = ICONOS_POR_SLUG[slug] ?? FiGrid;
              return (
              <Reveal key={slug} delay={i * 0.08}>
                <Link
                  href={hrefDeLinea(slug)}
                  className="group relative overflow-hidden rounded-3xl block bg-[#FAFAF8] border border-gray-100"
                  style={{ aspectRatio: "4/3" }}
                >
                  {/* Imagen full-background */}
                  <SafeImage
                    src={imagenUrl}
                    alt={label}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Arco blanco sobre la imagen. El viewBox acompaña el aspecto
                      4/3 de la card: sin esto la curva queda aplastada. */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <svg
                      viewBox="0 0 400 300"
                      preserveAspectRatio="none"
                      className="w-full h-full"
                      style={{ overflow: "visible" }}
                    >
                      {/* derecha ~32% (y=95), izquierda ~55% (y=165), control por
                          encima del borde alto = curva suave hacia arriba */}
                      <path
                        d="M-10,-10 L410,-10 L410,95 Q205,85 -10,165 Z"
                        fill="#FAFAF8"
                      />
                    </svg>
                  </div>

                  {/* Contenido encima del SVG */}
                  {/* `inset-x-0` en vez de `left-0`: sin un ancho definido este
                      bloque absoluto se dimensiona al contenido y en mobile los
                      labels largos ("PORCELANATOS") se desbordaban de la card. */}
                  <div className="absolute inset-x-0 top-0 z-20 px-4 sm:px-5 pt-4 sm:pt-5 flex items-start gap-2 sm:gap-3">
                    <div className="text-[#666] group-hover:text-[#DF8635] transition-colors duration-300 shrink-0">
                      <Icon className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#1a1a1a] uppercase text-[10px] sm:text-sm lg:text-base leading-tight sm:leading-snug tracking-normal sm:tracking-[0.06em] break-words">
                        {label}
                      </p>
                      <div className="w-5 h-px bg-[#DF8635] mt-1.5 sm:mt-2" />
                    </div>
                  </div>
                </Link>
              </Reveal>
              );
            })}
          </div>

          {/* Link al catálogo completo */}
          <Reveal className="text-center mt-10">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 hover:text-[#111111] hover:border-[#DF8635] text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300"
            >
              {t.nav.verCatalogoCompleto}
              <FiArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Stats wall — the surprise */}
      <StatsSection />

      {/* Novedades */}
      <section className="bg-[#fafafa] py-16 border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <p className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-2">
              {t.home.novedadesEtiqueta}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111]">
              {t.home.novedadesTitulo}
            </h2>
          </Reveal>
        </div>
        <NovedadesCarousel />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mt-8">
            <Link
              href="/novedades"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#DF8635] hover:underline"
            >
              Ver todas las novedades <FiArrowRight size={14} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Product gallery marquee */}
      <GalleryMarquee />

      {/* Value chain */}
      <CadenaValor />

      {/* Por qué Maxipiso */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <Reveal className="rounded-2xl overflow-hidden shadow-lg aspect-video w-full">
              <video
                src="https://res.cloudinary.com/dnaom2evd/video/upload/v1778512357/drone_lgjdsd.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </Reveal>

            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 text-[#DF8635] text-sm font-semibold uppercase tracking-widest mb-4">
                  <span className="w-8 h-px bg-[#DF8635]" />
                  {t.home.experienciaEtiqueta}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mb-8">
                  {t.home.porQueTitulo}
                </h2>
              </Reveal>

              <div className="space-y-6 mb-10">
                {featuresDe(t).map((f, i) => (
                  <Reveal key={f.title} delay={i * 0.08}>
                    <div className="flex gap-4 items-start group">
                      <div className="shrink-0 w-11 h-11 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] group-hover:bg-[#DF8635] group-hover:text-white transition-colors">
                        <f.Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#111111] mb-1">{f.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={0.2}>
                <Link
                  href="/empresa"
                  className="inline-flex items-center gap-2 bg-[#111111] text-white font-semibold px-7 py-3 rounded-full hover:bg-[#333] transition-colors"
                >
                  Conocé nuestra empresa
                  <FiArrowRight size={16} />
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <ContactSection />

      {/* CTA strip */}
      <section className="bg-[#DF8635] py-16">
        <Reveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Sumate a la red líder del país
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Convertite en distribuidor Maxipiso y accedé a precios exclusivos, stock garantizado y el respaldo del N°1 en Argentina.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/542214388894?text=Hola%2C%20quiero%20información%20para%20ser%20distribuidor%20de%20Maxipiso"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#DF8635] font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
              >
                Quiero ser distribuidor
              </a>
              <a
                href="#contacto"
                className="border border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                Contactar Asesor
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
