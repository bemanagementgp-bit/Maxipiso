"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FiChevronRight, FiSearch, FiX, FiArrowLeft, FiChevronDown, FiUser } from "react-icons/fi";
import { BsFillGridFill } from "react-icons/bs";
import { ProductCard, EmptyState } from "@/components/catalog/ProductCard";
import type { CatalogItem } from "@/components/catalog/ProductCard";
import LoginModal from "@/components/catalog/LoginModal";

type FilterGroup = { label: string; values: string[] };
type CategoriaOption = { key: string; label: string };

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-9 bg-gray-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function CatalogoPageWrapper() {
  return (
    <Suspense>
      <CatalogoPage />
    </Suspense>
  );
}

/**
 * Cache de resultados del catalogo, en scope de modulo.
 *
 * Al volver de una ficha de producto el componente se remonta y perdia todo:
 * se veia el skeleton y se re-pedia a /api/catalogo/todos, que consulta las 8
 * tablas y puede tardar segundos. El Map vive fuera del componente, asi que
 * sobrevive al remonte y la vuelta atras pinta al instante mientras revalida
 * en silencio. Ademas, tener contenido de entrada permite que el navegador
 * restaure la posicion del scroll.
 */
type CatalogoSnapshot = {
  productos: CatalogItem[];
  total: number;
  filtros: Record<string, FilterGroup>;
  categorias: CategoriaOption[];
};
const snapshotCache = new Map<string, CatalogoSnapshot>();
const SNAPSHOT_MAX = 40;

/**
 * Construye la URL del catalogo a partir del estado.
 *
 * Vive fuera del componente porque se usa en dos lugares que TIENEN que
 * coincidir caracter por caracter: el efecto que escribe la URL y el que la
 * lee. Si difirieran (por orden de parametros, por ejemplo) cada lectura
 * dispararia una escritura y se ensuciaria el historial.
 */
type EstadoUrl = {
  search: string;
  categoria: string;
  filtros: Record<string, string>;
  orden: string;
  page: number;
};

function construirUrl({ search, categoria, filtros, orden, page }: EstadoUrl): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (categoria) params.set("categoria", categoria);
  for (const [key, val] of Object.entries(filtros)) params.set(`filtros[${key}]`, val);
  if (orden && orden !== "relevancia") params.set("orden", orden);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

/** Scroll de cada vista, para restaurarlo al volver atras. */
const scrollCache = new Map<string, number>();

/**
 * Marca si la navegacion actual vino del boton atras/adelante.
 *
 * El listener va en scope de modulo porque `popstate` dispara ANTES de que
 * React monte el componente de destino: si se registrara adentro, el evento ya
 * habria pasado. El flag se consume en el montaje.
 */
let vinoDeHistorial = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    vinoDeHistorial = true;
  });
}

function guardarSnapshot(key: string, snap: CatalogoSnapshot) {
  if (snapshotCache.size >= SNAPSHOT_MAX) {
    const primero = snapshotCache.keys().next().value;
    if (primero !== undefined) snapshotCache.delete(primero);
  }
  snapshotCache.set(key, snap);
}

function CatalogoPage() {
  const PAGE_SIZE = 30;
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [authTick, setAuthTick] = useState(0);

  const [productos, setProductos] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") ?? "1");
    return Number.isNaN(value) || value < 1 ? 1 : value;
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") ?? "");

  const [sortBy, setSortBy] = useState(() => searchParams.get("orden") ?? "relevancia");
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState(() => searchParams.get("categoria") ?? "");

  const [filtros, setFiltros] = useState<Record<string, FilterGroup>>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const lastPushedRef = useRef<string | null>(null);
  const estadoAnteriorRef = useRef<EstadoUrl | null>(null);
  const scrollPendienteRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isInitialSearchMount = useRef(true);
  const fetchIdRef = useRef(0);

  // URL -> estado. Corre en el montaje y en cada atras/adelante del navegador.
  useEffect(() => {
    const cat = searchParams.get("categoria") ?? "";
    const urlFilters: Record<string, string> = {};
    let pageFromUrl = 1;
    const searchFromUrl = searchParams.get("search") ?? "";
    const ordenFromUrl = searchParams.get("orden") ?? "relevancia";

    searchParams.forEach((value, k) => {
      const pageMatch = k === "page";
      if (pageMatch) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && parsed >= 1) pageFromUrl = parsed;
      }
      const match = k.match(/^filtros\[(.+)]$/);
      if (match) urlFilters[match[1]] = value;
    });

    setSelectedCategoria(cat);
    setActiveFilters(Object.keys(urlFilters).length > 0 ? urlFilters : {});
    setPage(pageFromUrl);
    setSearch(searchFromUrl);
    setDebouncedSearch(searchFromUrl);
    setSortBy(ordenFromUrl);

    // Anotar la URL que se acaba de leer para que el efecto de escritura no la
    // vuelva a empujar. Sin esto, volver atras agregaba una entrada nueva al
    // historial y el boton "adelante" quedaba inutilizable.
    const estado: EstadoUrl = {
      search: searchFromUrl,
      categoria: cat,
      filtros: urlFilters,
      orden: ordenFromUrl,
      page: pageFromUrl,
    };
    lastPushedRef.current = construirUrl(estado);
    estadoAnteriorRef.current = estado;
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      if (!isInitialSearchMount.current) {
        setPage(1);
      }
      isInitialSearchMount.current = false;
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Estado -> URL.
  //
  // Paginar, filtrar, ordenar o cambiar de categoria APILA una entrada en el
  // historial (`push`): asi el boton atras recorre las paginas del catalogo en
  // vez de saltar afuera del sitio de una. Escribir en el buscador no apila
  // nada (`replace`), porque cada tecleo dejaria una entrada basura.
  useEffect(() => {
    const estado: EstadoUrl = {
      search: debouncedSearch,
      categoria: selectedCategoria,
      filtros: activeFilters,
      orden: sortBy,
      page,
    };
    const url = construirUrl(estado);
    if (lastPushedRef.current === url) return;

    const anterior = estadoAnteriorRef.current;
    const soloCambioLaBusqueda =
      anterior !== null &&
      anterior.search !== estado.search &&
      anterior.categoria === estado.categoria &&
      anterior.orden === estado.orden &&
      JSON.stringify(anterior.filtros) === JSON.stringify(estado.filtros);

    lastPushedRef.current = url;
    estadoAnteriorRef.current = estado;

    // Se usa la History API nativa en vez de `router.push`/`router.replace`.
    // El App Router la soporta y sincroniza `useSearchParams` solo, pero sin
    // pedirle el RSC payload al servidor en cada click: la paginacion ya tiene
    // los datos por fetch propio, asi que ese viaje era puro retraso.
    if (soloCambioLaBusqueda) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
  }, [page, debouncedSearch, selectedCategoria, activeFilters, sortBy]);

  // Volver a la pagina 1 al CAMBIAR el orden, pero no en el montaje.
  //
  // Sin el guard este efecto corria en el primer render y forzaba page = 1,
  // pisando la pagina que venia en la URL: al volver desde una ficha de producto
  // siempre aterrizabas en la pagina 1.
  const sortByAnterior = useRef(sortBy);
  useEffect(() => {
    if (sortByAnterior.current === sortBy) return;
    sortByAnterior.current = sortBy;
    setPage(1);
  }, [sortBy]);

  const handleToggleFilter = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (next[key] === value || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setPage(1);
  };

  const handleRemoveFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPage(1);
  };

  const handleClearFilters = () => { setActiveFilters({}); setPage(1); };

  const handleSelectCategoria = (val: string) => {
    setSelectedCategoria(val);
    setActiveFilters({});
    setPage(1);
  };

  // Query que identifica esta vista. Es tambien la clave del cache: incluye si
  // hay sesion porque la respuesta trae o no los precios.
  const queryString = useMemo(() => {
    const skip = (page - 1) * PAGE_SIZE;
    const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(skip), sortBy });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedCategoria) params.set("categoria", selectedCategoria);
    for (const [key, val] of Object.entries(activeFilters)) {
      params.set(`filtros[${key}]`, val);
    }
    return params.toString();
  }, [page, sortBy, debouncedSearch, selectedCategoria, activeFilters]);

  const cacheKey = `${session ? "auth" : "anon"}|${queryString}`;

  const fetchData = useCallback(async () => {
    if (status === "loading") return;

    // Si ya vimos esta combinacion, se pinta al instante y se revalida callado.
    const cacheado = snapshotCache.get(cacheKey);
    if (cacheado) {
      setProductos(cacheado.productos);
      setTotal(cacheado.total);
      if (Object.keys(cacheado.filtros).length > 0) setFiltros(cacheado.filtros);
      if (cacheado.categorias.length > 0) setCategorias(cacheado.categorias);
      setLoading(false);
    } else {
      // No se blanquea la grilla: la lista anterior queda visible atenuada
      // mientras carga, en vez de saltar al skeleton en cada click.
      setLoading(true);
    }

    const currentFetchId = ++fetchIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/catalogo/todos?${queryString}`, { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (fetchIdRef.current !== currentFetchId) return;
      const data = json.data;
      const productosNuevos: CatalogItem[] = data?.productos ?? [];
      const totalNuevo: number = data?.total ?? 0;
      setProductos(productosNuevos);
      setTotal(totalNuevo);
      if (data?.filtros) setFiltros(data.filtros);
      if (data?.categorias) setCategorias(data.categorias);
      guardarSnapshot(cacheKey, {
        productos: productosNuevos,
        total: totalNuevo,
        filtros: data?.filtros ?? {},
        categorias: data?.categorias ?? [],
      });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError" && fetchIdRef.current === currentFetchId && !cacheado) {
        setProductos([]);
        setTotal(0);
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, [queryString, cacheKey, authTick, status]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Prefetch de la pagina siguiente.
   *
   * Se dispara cuando la vista actual ya termino de cargar y deja el resultado
   * en el mismo cache que consume `fetchData`, asi "Siguiente" pinta sin
   * esperar red. El delay evita gastar una consulta si el usuario esta
   * paginando rapido de corrido.
   */
  useEffect(() => {
    if (loading || productos.length === 0) return;
    const siguiente = page + 1;
    if (siguiente > Math.ceil(total / PAGE_SIZE)) return;

    const params = new URLSearchParams(queryString);
    params.set("skip", String((siguiente - 1) * PAGE_SIZE));
    const qs = params.toString();
    const key = `${session ? "auth" : "anon"}|${qs}`;
    if (snapshotCache.has(key)) return;

    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/catalogo/todos?${qs}`, { cache: "no-store", signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const data = json?.data;
          if (!data?.productos) return;
          guardarSnapshot(key, {
            productos: data.productos,
            total: data.total ?? 0,
            filtros: data.filtros ?? {},
            categorias: data.categorias ?? [],
          });
        })
        .catch(() => {});
    }, 400);

    return () => { clearTimeout(t); controller.abort(); };
  }, [loading, productos.length, page, total, queryString, session]);

  /**
   * Restauracion del scroll al volver atras.
   *
   * El navegador restaura solo, pero lo hace apenas monta el componente, cuando
   * la grilla todavia esta vacia y la pagina mide 500px: el resultado es que
   * volves arriba de todo. Por eso se guarda la altura de cada vista y se
   * reaplica recien cuando hay productos pintados.
   */
  useEffect(() => {
    let pendiente = false;
    // Al hacer click en una ficha, Next lleva la pagina al tope antes de
    // desmontar el catalogo. El evento de scroll de esa subida pisaba la altura
    // guardada con un 0, asi que se congela el guardado apenas empieza una
    // navegacion y se anota la altura del momento del click.
    let congelado = false;
    let destemporizador: ReturnType<typeof setTimeout> | null = null;

    const clave = () => window.location.pathname + window.location.search;
    const guardar = () => {
      pendiente = false;
      if (congelado) return;
      scrollCache.set(clave(), window.scrollY);
    };
    const onScroll = () => {
      if (congelado || pendiente) return;
      pendiente = true;
      requestAnimationFrame(guardar);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.("a[href]")) return;
      scrollCache.set(clave(), window.scrollY);
      congelado = true;
      // Red de seguridad: si el click no termino navegando (modificadores,
      // ancla al mismo lugar), volver a guardar el scroll normalmente.
      if (destemporizador) clearTimeout(destemporizador);
      destemporizador = setTimeout(() => { congelado = false; }, 2000);
    };
    const onPop = () => { congelado = false; };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      if (destemporizador) clearTimeout(destemporizador);
    };
  }, []);

  useEffect(() => {
    const alturaGuardada = () => scrollCache.get(window.location.pathname + window.location.search) ?? null;

    // Al montar: el popstate de la vuelta atras ya paso, lo dejo anotado el
    // listener de modulo.
    if (vinoDeHistorial) {
      vinoDeHistorial = false;
      scrollPendienteRef.current = alturaGuardada();
    }

    // Atras/adelante sin desmontar (paginar dentro del catalogo).
    const onPop = () => { scrollPendienteRef.current = alturaGuardada() ?? 0; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const y = scrollPendienteRef.current;
    if (y === null || productos.length === 0) return;
    scrollPendienteRef.current = null;

    // Se reintenta unos frames en vez de un scrollTo y listo: cuando el efecto
    // corre, la grilla recien se pinto y el documento todavia puede ser mas
    // corto que la altura objetivo, asi que el scroll quedaria recortado. Se
    // corta apenas queda en su lugar (o al tocar el fondo de la pagina).
    let frames = 0;
    let cancelado = false;
    const intentar = () => {
      if (cancelado) return;
      window.scrollTo(0, y);
      // Se insiste aunque el scroll haya quedado corto: al principio el
      // documento todavia crece (filtros, paginacion, alto de las tarjetas) y
      // el navegador recorta el valor al maximo de ese momento.
      const llego = Math.abs(window.scrollY - y) < 4;
      if (!llego && frames++ < 45) requestAnimationFrame(intentar);
    };
    requestAnimationFrame(intentar);
    return () => { cancelado = true; };
  }, [productos]);

  const activeCount = Object.keys(activeFilters).length;
  const hasFilters = Object.keys(filtros).length > 0;
  const selectedCatLabel = categorias.find((c) => c.key === selectedCategoria)?.label;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const paginationRange = useMemo(() => {
    const SIBLINGS = 5;
    const pages: (number | "...")[] = [];
    if (totalPages <= SIBLINGS * 2 + 3) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const start = Math.max(2, page - SIBLINGS);
      const end = Math.min(totalPages - 1, page + SIBLINGS);
      pages.push(1);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  const productGrid = useMemo(
    () => productos.map((item) => (
      <ProductCard key={item.id} item={item} categorySlug="catalogo" />
    )),
    [productos]
  );

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* Header negro */}
      <div className="w-full bg-[#111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Catálogo</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Explorá todo nuestro stock mayorista. Entrega en todo el país.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!session ? (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#DF8635] text-white text-sm font-semibold hover:bg-[#c97220] transition-colors shrink-0"
              >
                <FiUser size={14} />
                Acceder
              </button>
            ) : (
              <button
                onClick={async () => { await signOut({ redirect: false }); await updateSession(); setAuthTick((t) => t + 1); }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 text-sm font-semibold hover:bg-white/10 transition-colors shrink-0"
              >
                <FiUser size={14} />
                Cerrar sesión
              </button>
            )}
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full sm:w-56 pl-9 pr-4 py-2 bg-white/10 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#DF8635] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="w-56 shrink-0 hidden md:block">
            <div className="sticky top-24">
              {/* Categoría */}
              {!selectedCategoria ? (
                <div>
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">
                    Categoría
                  </h3>
                  <ul className="space-y-1 mb-6">
                    {categorias.map((cat) => (
                      <li key={cat.key}>
                        <button
                          onClick={() => handleSelectCategoria(cat.key)}
                          className="w-full text-left px-3 py-2.5 text-sm text-gray-600 rounded-xl hover:bg-[#DF8635]/10 hover:text-[#DF8635] transition-colors flex items-center justify-between group"
                        >
                          <span>{cat.label}</span>
                          <FiChevronRight size={13} className="text-gray-300 group-hover:text-[#DF8635] transition-colors" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => { handleSelectCategoria(""); handleClearFilters(); }}
                    className="flex items-center gap-1.5 text-[11px] text-[#DF8635] font-semibold mb-4 hover:underline"
                  >
                    <FiArrowLeft size={12} />
                    Todas las categorías
                  </button>

                  <div className="bg-[#DF8635]/10 rounded-xl px-3 py-2.5 mb-5">
                    <p className="text-[10px] text-[#DF8635] font-bold uppercase tracking-widest mb-0.5">Categoría</p>
                    <p className="text-sm font-bold text-[#111111]">{selectedCatLabel}</p>
                  </div>
                </div>
              )}

              {/* Filtros */}
              {hasFilters && (() => {
                const gateKey = (selectedCategoria === "pisos-flotantes" || selectedCategoria === "pisos-vinilicos") ? "categoriaTerciaria" : null;
                const gateSelected = gateKey ? !!activeFilters[gateKey] : true;
                const gateFilter = gateKey ? filtros[gateKey] : null;
                const restFilters = Object.entries(filtros).filter(([key]) => key !== gateKey);

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest">Filtros</h3>
                      {activeCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="text-[10px] text-[#DF8635] font-semibold hover:underline"
                        >
                          Limpiar ({activeCount})
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Gate filter (Tipo for pisos-flotantes) */}
                      {gateFilter && (
                        <div>
                          <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-1.5 block">
                            {gateFilter.label}
                          </label>
                          <div className="flex flex-col gap-1.5">
                            {gateFilter.values.map((val) => {
                              const active = activeFilters[gateKey!] === val;
                              return (
                                <button
                                  key={val}
                                  onClick={() => handleToggleFilter(gateKey!, val)}
                                  className={`w-full text-left px-3 py-2 rounded-xl border text-[12px] font-semibold transition-colors ${
                                    active
                                      ? "border-[#DF8635] bg-[#DF8635]/10 text-[#DF8635]"
                                      : "border-gray-200 bg-white text-gray-700 hover:border-[#DF8635]/50"
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rest of filters — only shown after gate is selected (or if no gate) */}
                      {gateSelected && restFilters.map(([key, group]) => (
                        <div key={key}>
                          <label className="text-[11px] font-bold text-[#111111] uppercase tracking-wide mb-1 block">
                            {group.label}
                          </label>
                          <div className="relative">
                            <select
                              value={activeFilters[key] ?? ""}
                              onChange={(e) => handleToggleFilter(key, e.target.value)}
                              className={`w-full pl-3 pr-8 py-2 border text-[12px] focus:outline-none focus:border-[#DF8635] appearance-none transition-colors ${
                                activeFilters[key]
                                  ? "border-[#DF8635] bg-[#DF8635]/5 text-[#DF8635] font-semibold"
                                  : "border-gray-200 bg-white text-gray-700"
                              }`}
                            >
                              <option value="">Todos</option>
                              {group.values.map((val) => (
                                <option key={val} value={val}>{val}</option>
                              ))}
                            </select>
                            <FiChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeFilters[key] ? "text-[#DF8635]" : "text-gray-400"}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Mobile filters */}
            <div className="md:hidden space-y-2 mb-4">
              <div className="relative">
                <select
                  value={selectedCategoria}
                  onChange={(e) => { handleSelectCategoria(e.target.value); handleClearFilters(); }}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#DF8635] appearance-none bg-white"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <FiChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {hasFilters && (() => {
                const gateKey = (selectedCategoria === "pisos-flotantes" || selectedCategoria === "pisos-vinilicos") ? "categoriaTerciaria" : null;
                const gateSelected = gateKey ? !!activeFilters[gateKey] : true;
                const gateFilter = gateKey ? filtros[gateKey] : null;
                const restFilters = Object.entries(filtros).filter(([k]) => k !== gateKey);

                return (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gateFilter && gateFilter.values.map((val) => {
                      const active = activeFilters[gateKey!] === val;
                      return (
                        <button
                          key={val}
                          onClick={() => handleToggleFilter(gateKey!, val)}
                          className={`shrink-0 px-3 py-2 rounded-full border text-xs font-semibold transition-colors ${
                            active
                              ? "border-[#DF8635] bg-[#DF8635]/10 text-[#DF8635]"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                    {gateSelected && restFilters.map(([key, group]) => (
                      <div key={key} className="relative shrink-0">
                        <select
                          value={activeFilters[key] ?? ""}
                          onChange={(e) => handleToggleFilter(key, e.target.value)}
                          className={`pl-2 pr-7 py-2 border text-xs focus:outline-none focus:border-[#DF8635] appearance-none transition-colors ${
                            activeFilters[key]
                              ? "border-[#DF8635] bg-[#DF8635]/5 text-[#DF8635] font-semibold"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          <option value="">{group.label}</option>
                          {group.values.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <FiChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${activeFilters[key] ? "text-[#DF8635]" : "text-gray-400"}`} />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              {!loading || productos.length > 0 ? (
                <p className="text-xs text-gray-400">{total} producto{total !== 1 ? "s" : ""}</p>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="hidden sm:inline">Ordenar por</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-transparent border border-gray-200 px-2.5 py-1.5 pr-7 text-gray-700 focus:outline-none focus:border-[#DF8635] cursor-pointer appearance-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
                >
                  <option value="relevancia">Más relevantes</option>
                  <option value="precio-menor">Menor precio</option>
                  <option value="precio-mayor">Mayor precio</option>
                  <option value="nombre-az">A → Z</option>
                  <option value="nombre-za">Z → A</option>
                  <option value="recientes">Más recientes</option>
                </select>
              </div>
            </div>

            {/* Breadcrumb */}
            {(selectedCategoria || activeCount > 0) && (
              <div className="mb-4">
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
                  <span className="text-gray-500 font-medium">Catálogo</span>
                  {selectedCategoria && (
                    <>
                      <FiChevronRight size={11} />
                      <button
                        onClick={() => { handleSelectCategoria(""); handleClearFilters(); }}
                        className="text-[#DF8635] font-semibold hover:underline flex items-center gap-1"
                      >
                        {selectedCatLabel}
                        <FiX size={10} />
                      </button>
                    </>
                  )}
                  {Object.entries(activeFilters).map(([key, val]) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <FiChevronRight size={11} />
                      <button
                        onClick={() => handleRemoveFilter(key)}
                        className="inline-flex items-center gap-1 bg-[#DF8635]/10 text-[#DF8635] text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-[#DF8635]/20 transition-colors"
                      >
                        {filtros[key]?.label}: {val}
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}
                </nav>
              </div>
            )}

            {/* Grid.
                El skeleton aparece solo cuando no hay nada que mostrar. Si ya
                habia resultados se mantienen visibles atenuados mientras llega
                la pagina nueva: cambiar de pagina o de filtro deja de parpadear. */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-200 ${
                loading && productos.length > 0 ? "opacity-50" : "opacity-100"
              }`}
              aria-busy={loading}
            >
              {loading && productos.length === 0 ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
              ) : productos.length === 0 ? (
                <EmptyState label={selectedCatLabel ?? "Catálogo"} />
              ) : (
                productGrid
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-1.5 mt-8">
                <button
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#DF8635] hover:text-[#DF8635] transition-colors"
                >
                  Anterior
                </button>
                {paginationRange.map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 py-2 text-sm text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`min-w-[36px] py-2 text-sm rounded-lg border transition-colors ${
                        p === page
                          ? "border-[#DF8635] bg-[#DF8635] text-white font-bold"
                          : "border-gray-200 hover:border-[#DF8635] hover:text-[#DF8635]"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#DF8635] hover:text-[#DF8635] transition-colors"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {showLogin && <LoginModal onClose={(loggedIn) => { setShowLogin(false); if (loggedIn) { updateSession(); setAuthTick((t) => t + 1); } }} />}
    </div>
  );
}
