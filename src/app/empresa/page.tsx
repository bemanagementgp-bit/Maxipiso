import Link from "next/link";

const valores = [
  {
    titulo: "Liderazgo",
    descripcion:
      "Somos el N°1 en Argentina en importación y distribución de pisos y revestimientos. Ese liderazgo se construye día a día con trabajo y compromiso.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
  {
    titulo: "Calidad de importación",
    descripcion:
      "Importamos directamente desde los mejores orígenes del mundo. Cada producto pasa por un proceso de selección riguroso antes de llegar a nuestra red.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    titulo: "Compromiso con el cliente",
    descripcion:
      "Distribuidores y profesionales confían en Maxipiso porque cumplimos: stock garantizado, precios estables y atención personalizada.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
  },
  {
    titulo: "Innovación constante",
    descripcion:
      "Incorporamos permanentemente nuevas líneas, tendencias y materiales del mercado internacional para mantenernos siempre un paso adelante.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
];

const hitos = [
  { año: "1965", hecho: "Fundación de Maxipiso en La Plata, Buenos Aires. Primeros pasos en la comercialización de pisos cerámicos nacionales." },
  { año: "1978", hecho: "Apertura del primer depósito propio en La Plata. Consolidación como referente regional en el rubro." },
  { año: "1989", hecho: "Expansión comercial hacia el interior de la provincia de Buenos Aires. Primeros distribuidores exclusivos." },
  { año: "1997", hecho: "Inicio de las primeras importaciones directas desde España e Italia, marcando un antes y un después en la propuesta de valor." },
  { año: "2005", hecho: "Incorporación de porcelanato rectificado importado. Lanzamiento de las líneas simil madera y simil piedra." },
  { año: "2012", hecho: "Apertura de la red de distribuidores a nivel nacional. Cobertura en más de 15 provincias." },
  { año: "2018", hecho: "Inauguración del nuevo centro de distribución con más de 20.000 m² de depósito. Lanzamiento de la línea Swan Timber de maderas macizas." },
  { año: "2024", hecho: "Más de 1.300 clientes activos, presencia en las 24 provincias y consolidación como el mayorista N°1 en Argentina." },
];

export default function EmpresaPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="bg-[#111111] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-[#DF8635] text-sm font-semibold uppercase tracking-widest mb-6">
                <span className="w-8 h-px bg-[#DF8635]" />
                Nuestra historia
              </span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                Más de 30 años siendo
                <span className="text-[#DF8635]"> el N°1 en Argentina.</span>
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed">
                Maxipiso nació con una visión clara: acercar los mejores pisos y revestimientos del mundo
                a distribuidores y profesionales argentinos, con el mejor precio y el mayor stock del país.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Equipo + Instagram — combinado */}
      <section className="py-16 bg-[#F9F8F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Video vertical logistica */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[9/16] max-w-xs mx-auto lg:mx-0 bg-black">
              <video
                src="/logistica.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span className="text-white text-xs font-semibold drop-shadow">@maxipiso</span>
              </div>
            </div>
            {/* Texto */}
            <div>
              <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">
                Las personas detrás de Maxipiso
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111111] leading-tight mb-6">
                Un equipo que mueve al país
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                Más de 60 años de historia se sostienen gracias a las personas. Logística, equipo y el día a día de Maxipiso. Seguinos en Instagram y enterate de todo lo que pasa en el N°1 de Argentina.
              </p>
              <div className="flex gap-10 mb-10">
                {[
                  { n: "+60", l: "años de historia" },
                  { n: "+1.300", l: "clientes activos" },
                  { n: "24", l: "provincias" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-4xl font-bold text-[#DF8635]">{s.n}</p>
                    <p className="text-gray-400 text-sm mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
              <a
                href="https://www.instagram.com/maxipiso"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Seguinos en Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Logística propia */}
      <section className="py-16 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Foto flota */}
            <div className="relative h-[420px] lg:h-[480px] overflow-hidden rounded-2xl">
              <img
                src="/flota.jpg"
                alt="Flota de camiones Maxipiso"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
            {/* Texto */}
            <div className="flex flex-col justify-center px-8 py-16 lg:px-16">
              <span className="text-[#DF8635] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">
                Distribución nacional
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
                Flota propia.<br />Llegamos a donde estés.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Contamos con nuestra propia flota de camiones para garantizar entregas a todo el país. Sin terceros, sin demoras. Desde La Plata hasta la Patagonia, el stock llega donde lo necesitás.
              </p>
              <ul className="space-y-4">
                {[
                  "Entregas en las 24 provincias",
                  "Flota propia — sin intermediarios",
                  "Despacho inmediato desde stock",
                  "Seguimiento de tu pedido",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#DF8635]/20 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-[#DF8635]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* Nuestros valores */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-sm font-semibold uppercase tracking-widest">
              Lo que nos define
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mt-3">
              Nuestros valores
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valores.map((v) => (
              <div
                key={v.titulo}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-[#DF8635] hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#DF8635]/10 flex items-center justify-center text-[#DF8635] mb-4 group-hover:bg-[#DF8635] group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {v.icon}
                  </svg>
                </div>
                <h3 className="font-bold text-[#111111] mb-2">{v.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[#DF8635] text-sm font-semibold uppercase tracking-widest">
              Trayectoria
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] mt-3">
              Una historia de crecimiento
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-[60px] top-0 bottom-0 w-px bg-[#DF8635]/20" />
              <div className="space-y-8">
                {hitos.map((h, i) => (
                  <div key={i} className="flex gap-8 items-start">
                    <div className="w-[60px] shrink-0 text-right">
                      <span className="text-[#DF8635] font-bold text-sm">{h.año}</span>
                    </div>
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[#DF8635] ring-4 ring-gray-50" />
                      <p className="text-gray-700 leading-relaxed">{h.hecho}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#111111] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Querés trabajar con el N°1?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Sumate como distribuidor o contactá a nuestro equipo de ventas para conocer todas las opciones.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/distribuidores#ser-distribuidor"
              className="bg-[#DF8635] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#c97220] transition-colors"
            >
              Quiero ser distribuidor
            </Link>
            <a
              href="https://wa.me/542214400536?text=Hola%2C%20quiero%20información%20sobre%20Maxipiso"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/30 text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactar Asesor
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
