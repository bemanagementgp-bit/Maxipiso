"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiPercent,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiSearch,
  FiX,
} from "react-icons/fi";

/**
 * Grilla de precios y stock.
 *
 * La idea de fondo: **nada toca la base hasta que apretás Guardar.** Editar una
 * celda, aplicar un aumento del 12% a media categoría o redondear todo escribe
 * en un buffer de cambios pendientes que se ve en amarillo sobre la grilla. Eso
 * permite encadenar operaciones (aumento → redondeo → ajuste a mano de tres
 * filas), revisar el resultado completo y recién ahí impactarlo en una sola
 * request. Descartar vuelve todo atrás sin haber tocado nada.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CampoPrecio = { key: string; label: string };

type Categoria = {
  tabla: string;
  label: string;
  dot: string;
  precios: CampoPrecio[];
  tieneStock: boolean;
  tieneMoneda: boolean;
};

type Fila = Record<string, unknown> & { id: string; _tabla: string };

type Pendiente = Record<string, number | string | null>;

type Props = { onNotify?: (mensaje: string, tipo?: "ok" | "error") => void };

// ─── Formato de números ──────────────────────────────────────────────────────

/**
 * Parsea lo que se tipea en una celda.
 *
 * Se aceptan las dos convenciones porque en la práctica se pega texto de
 * planillas: "14372,45" y "14372.45" son lo mismo. Con ambos separadores
 * presentes ("1.234,56") el punto es de miles.
 */
export function parsearNumero(texto: string): number | null | "invalido" {
  const limpio = texto.trim().replace(/\s/g, "");
  if (limpio === "") return null;

  let normalizado = limpio;
  if (limpio.includes(",") && limpio.includes(".")) {
    normalizado = limpio.replace(/\./g, "").replace(",", ".");
  } else if (limpio.includes(",")) {
    normalizado = limpio.replace(",", ".");
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) return "invalido";
  return n;
}

/** Cómo se muestra un importe dentro del input: coma decimal, sin miles. */
function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

const fmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCorto = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** Importe con separador de miles, para leer la grilla de un vistazo. */
function aTextoLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return fmtCorto.format(n);
}

// ─── Deteccion de moneda ─────────────────────────────────────────────────────

/**
 * Umbral para deducir la moneda a partir del precio.
 *
 * Un piso importado ronda los 20-60 dólares el m²; el mismo piso en pesos está
 * en decenas de miles. No hay zona gris real entre esas dos escalas, así que
 * alcanza con un corte: por encima de $300 es pesos, por debajo es dólares.
 */
const UMBRAL_ARS = 300;

/**
 * Qué precio mirar para deducir la moneda.
 *
 * Importa el orden: una fila puede tener `precioM2 = 50` (USD) y
 * `precioCaja = 1200` (USD, la caja rinde 24 m²). Mirando el más grande daría
 * "pesos" y sería falso. Se usa el precio unitario, que es el que está en la
 * misma escala en las 8 categorías.
 *
 * `precioEnvioCaja` queda deliberadamente afuera: es un flete, no el precio del
 * producto, y su magnitud no dice nada de la moneda.
 */
const PRIORIDAD_PRECIO = [
  "precioM2",
  "precio",
  "precioTabla",
  "precioMLineal",
  "precioMl",
  "precioCaja",
];

/** Devuelve "ARS" | "USD" | null si no hay ningún precio del cual deducirla. */
function inferirMoneda(leer: (campo: string) => unknown): "ARS" | "USD" | null {
  for (const campo of PRIORIDAD_PRECIO) {
    const valor = leer(campo);
    if (valor === null || valor === undefined || valor === "") continue;
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) continue;
    return n > UMBRAL_ARS ? "ARS" : "USD";
  }
  return null;
}

// ─── Redondeos ───────────────────────────────────────────────────────────────

type ModoRedondeo = "1" | "10" | "100" | "1000" | "99";

function redondear(valor: number, modo: ModoRedondeo): number {
  if (modo === "99") {
    // Terminación comercial: 14.372 → 14.399. Se sube a la centena y se le
    // restan 1 peso, que es como se arman las listas de precios.
    const centena = Math.ceil(valor / 100) * 100;
    return Math.max(0, centena - 1);
  }
  const paso = Number(modo);
  return Math.round(valor / paso) * paso;
}

// ─── Componente ──────────────────────────────────────────────────────────────

const TAMANOS = [50, 100, 200, 500];

export default function PriceGrid({ onNotify }: Props) {
  // Datos
  const [filas, setFilas] = useState<Fila[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState({ sinPrecio: 0, sinStock: 0, sinMoneda: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [tabla, setTabla] = useState("");
  const [marca, setMarca] = useState("");
  const [estado, setEstado] = useState("todos");
  const [faltantes, setFaltantes] = useState("");
  const [take, setTake] = useState(100);
  const [page, setPage] = useState(1);

  // Edición
  const [pendientes, setPendientes] = useState<Map<string, Pendiente>>(new Map());
  const [invalidas, setInvalidas] = useState<Set<string>>(new Set());
  /**
   * Texto crudo de la celda que se está editando.
   *
   * Las celdas son inputs controlados por este mapa, no por el valor numérico:
   * mientras tipeás "1.2" el valor parseado ya cambió, y si el input se
   * renderizara desde ahí te reescribiría el texto abajo del cursor. Al aplicar
   * una operación en lote se borra la entrada de la celda, así vuelve a
   * mostrarse el valor pendiente nuevo.
   */
  const [borradores, setBorradores] = useState<Map<string, string>>(new Map());
  /**
   * Celda con el foco puesto.
   *
   * Fuera de foco los importes se muestran con separador de miles (1.250.000),
   * que es la diferencia entre poder escanear una columna de precios y no.
   * Al entrar a editar se vuelve al número crudo, porque los puntos de miles
   * dentro de un input que se está tipeando son un estorbo.
   */
  const [celdaFoco, setCeldaFoco] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  // Herramientas masivas
  const [porcentaje, setPorcentaje] = useState("");
  const [modoRedondeo, setModoRedondeo] = useState<ModoRedondeo>("100");
  const [stockLote, setStockLote] = useState("");
  const [monedaLote, setMonedaLote] = useState("");
  const [cotizacion, setCotizacion] = useState("");

  const contenedorRef = useRef<HTMLDivElement>(null);
  // `onCelda` necesita ver los pendientes del momento, no los de la última
  // render: si no, al tipear el primer precio de una fila leería una moneda
  // desactualizada.
  const pendientesRef = useRef(pendientes);
  useEffect(() => { pendientesRef.current = pendientes; }, [pendientes]);

  /**
   * Filas cuya moneda la puso la deducción y no la persona.
   *
   * Importa para poder recalcularla: si tipeás 52000 (→ ARS) y después corregís
   * a 48, la moneda tiene que pasar a USD. Una moneda elegida a mano, en
   * cambio, no se toca nunca por más que cambie el precio.
   */
  const monedasAutoRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => { setBusquedaDebounced(busqueda); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ take: String(take), skip: String((page - 1) * take) });
    if (busquedaDebounced) p.set("search", busquedaDebounced);
    if (tabla) p.set("tabla", tabla);
    if (marca) p.set("marca", marca);
    if (estado !== "todos") p.set("estado", estado);
    if (faltantes) p.set("faltantes", faltantes);
    return p.toString();
  }, [take, page, busquedaDebounced, tabla, marca, estado, faltantes]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/precios?${query}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar la grilla");
      setFilas(json.data.filas);
      setTotal(json.data.total);
      setResumen(json.data.resumen ?? { sinPrecio: 0, sinStock: 0, sinMoneda: 0 });
      setCategorias(json.data.categorias);
      setMarcas(json.data.marcas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
      setFilas([]);
      setTotal(0);
      setResumen({ sinPrecio: 0, sinStock: 0, sinMoneda: 0 });
    } finally {
      setCargando(false);
    }
  }, [query]);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Acceso a valores ──────────────────────────────────────────────────────

  const catPorTabla = useMemo(() => {
    const m = new Map<string, Categoria>();
    for (const c of categorias) m.set(c.tabla, c);
    return m;
  }, [categorias]);

  /** Columnas de precio a mostrar: la unión de las categorías presentes. */
  const columnas = useMemo(() => {
    const tablasPresentes = new Set(filas.map((f) => f._tabla));
    const vistas = new Map<string, CampoPrecio>();
    for (const c of categorias) {
      if (tablasPresentes.size > 0 && !tablasPresentes.has(c.tabla)) continue;
      for (const p of c.precios) if (!vistas.has(p.key)) vistas.set(p.key, p);
    }
    return [...vistas.values()];
  }, [filas, categorias]);

  /** Solo se muestra la columna Moneda si alguna categoría visible la usa. */
  const hayMoneda = useMemo(() => {
    const presentes = new Set(filas.map((f) => f._tabla));
    return categorias.some((c) => c.tieneMoneda && (presentes.size === 0 || presentes.has(c.tabla)));
  }, [filas, categorias]);

  const aplica = useCallback(
    (fila: Fila, campo: string) => {
      const cat = catPorTabla.get(fila._tabla);
      if (!cat) return false;
      if (campo === "stock") return cat.tieneStock;
      if (campo === "moneda") return cat.tieneMoneda;
      return cat.precios.some((p) => p.key === campo);
    },
    [catPorTabla],
  );

  /** Valor efectivo: el pendiente si lo hay, si no el guardado. */
  const valorDe = useCallback(
    (fila: Fila, campo: string): unknown => {
      const p = pendientes.get(fila.id);
      if (p && campo in p) return p[campo];
      return fila[campo];
    },
    [pendientes],
  );

  /**
   * Moneda deducida del precio, para las filas que no la tienen cargada.
   *
   * Nunca pisa una moneda ya elegida: solo completa lo que está vacío. Se
   * calcula sobre el valor EFECTIVO, así que si acabás de tipear un precio la
   * sugerencia sale de ese número y no del que había guardado.
   */
  const monedaSugerida = useCallback(
    (fila: Fila): "ARS" | "USD" | null => {
      const cat = catPorTabla.get(fila._tabla);
      if (!cat?.tieneMoneda) return null;
      const p = pendientes.get(fila.id);
      const actual = p && "moneda" in p ? p.moneda : fila.moneda;
      if (String(actual ?? "").trim()) return null;
      return inferirMoneda((campo) => {
        if (p && campo in p) return p[campo];
        return fila[campo];
      });
    },
    [catPorTabla, pendientes],
  );

  const estaPendiente = useCallback(
    (id: string, campo: string) => {
      const p = pendientes.get(id);
      return !!p && campo in p;
    },
    [pendientes],
  );

  // ─── Escritura en el buffer ────────────────────────────────────────────────

  const escribir = useCallback((id: string, tablaFila: string, campo: string, valor: number | string | null) => {
    // Si la celda tenía texto a medio tipear, la operación en lote manda: se
    // descarta el borrador para que el input muestre el valor nuevo.
    setBorradores((prev) => {
      const clave = `${id}|${campo}`;
      if (!prev.has(clave)) return prev;
      const s = new Map(prev);
      s.delete(clave);
      return s;
    });
    setPendientes((prev) => {
      const siguiente = new Map(prev);
      const actual = { ...(siguiente.get(id) ?? {}) };
      actual[campo] = valor;
      actual.__tabla = tablaFila;
      siguiente.set(id, actual);
      return siguiente;
    });
  }, []);

  /** Saca un campo del buffer; si la fila queda vacía, se quita entera. */
  const olvidar = useCallback((id: string, campo: string) => {
    setPendientes((prev) => {
      const actual = prev.get(id);
      if (!actual || !(campo in actual)) return prev;
      const siguiente = new Map(prev);
      const copia = { ...actual };
      delete copia[campo];
      const quedan = Object.keys(copia).filter((k) => k !== "__tabla");
      if (quedan.length === 0) siguiente.delete(id);
      else siguiente.set(id, copia);
      return siguiente;
    });
  }, []);

  const onCelda = useCallback(
    (fila: Fila, campo: string, texto: string) => {
      const clave = `${fila.id}|${campo}`;
      setBorradores((prev) => new Map(prev).set(clave, texto));
      const parsed = parsearNumero(texto);

      setInvalidas((prev) => {
        const s = new Set(prev);
        if (parsed === "invalido") s.add(clave);
        else s.delete(clave);
        return s;
      });
      if (parsed === "invalido") return;

      const original = fila[campo];
      const iguales =
        (original === null || original === undefined) && parsed === null
          ? true
          : Number(original) === parsed;

      if (iguales) olvidar(fila.id, campo);
      else escribir(fila.id, fila._tabla, campo, parsed);

      // Moneda deducida del precio recién tipeado. Solo completa lo vacío:
      // una moneda ya elegida no se pisa nunca.
      if (parsed !== null && PRIORIDAD_PRECIO.includes(campo) && catPorTabla.get(fila._tabla)?.tieneMoneda) {
        const p = pendientesRef.current.get(fila.id);
        const monedaActual = p && "moneda" in p ? p.moneda : fila.moneda;
        const vacia = !String(monedaActual ?? "").trim();
        if (vacia || monedasAutoRef.current.has(fila.id)) {
          escribir(fila.id, fila._tabla, "moneda", parsed > UMBRAL_ARS ? "ARS" : "USD");
          monedasAutoRef.current.add(fila.id);
        }
      }
    },
    [escribir, olvidar, catPorTabla],
  );

  // ─── Navegación con teclado ────────────────────────────────────────────────

  const onTeclaCelda = (e: React.KeyboardEvent<HTMLInputElement>, indiceFila: number, campo: string) => {
    if (e.key === "Escape") {
      const fila = filas[indiceFila];
      const clave = `${fila.id}|${campo}`;
      olvidar(fila.id, campo);
      setBorradores((prev) => { const s = new Map(prev); s.delete(clave); return s; });
      setInvalidas((prev) => { const s = new Set(prev); s.delete(clave); return s; });
      (e.target as HTMLInputElement).blur();
      return;
    }
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -1 : 1;
    const destino = document.querySelector<HTMLInputElement>(
      `[data-celda="${indiceFila + delta}|${campo}"]`,
    );
    destino?.focus();
    destino?.select();
  };

  // ─── Selección ─────────────────────────────────────────────────────────────

  const idsVisibles = useMemo(() => filas.map((f) => f.id), [filas]);
  const todosSeleccionados = idsVisibles.length > 0 && idsVisibles.every((id) => seleccion.has(id));

  const alternarTodos = () => {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (todosSeleccionados) idsVisibles.forEach((id) => s.delete(id));
      else idsVisibles.forEach((id) => s.add(id));
      return s;
    });
  };

  const filasSeleccionadas = useMemo(
    () => filas.filter((f) => seleccion.has(f.id)),
    [filas, seleccion],
  );

  // ─── Operaciones masivas ───────────────────────────────────────────────────

  const avisar = useCallback(
    (mensaje: string, tipo: "ok" | "error" = "ok") => {
      if (onNotify) onNotify(mensaje, tipo);
      else if (tipo === "error") setError(mensaje);
    },
    [onNotify],
  );

  const aplicarPorcentaje = () => {
    const pct = parsearNumero(porcentaje.replace("%", "").replace("+", ""));
    const negativo = porcentaje.trim().startsWith("-");
    if (pct === "invalido" || pct === null) { avisar("Porcentaje inválido", "error"); return; }
    const factor = 1 + (negativo ? -Math.abs(pct) : pct) / 100;
    if (factor < 0) { avisar("Ese descuento deja precios negativos", "error"); return; }

    let tocadas = 0;
    let sinPrecio = 0;
    for (const fila of filasSeleccionadas) {
      const cat = catPorTabla.get(fila._tabla);
      if (!cat || cat.precios.length === 0) { sinPrecio++; continue; }
      let algo = false;
      for (const campo of cat.precios) {
        const actual = valorDe(fila, campo.key);
        if (actual === null || actual === undefined || actual === "") continue;
        const n = Number(actual);
        if (!Number.isFinite(n)) continue;
        escribir(fila.id, fila._tabla, campo.key, Math.round(n * factor * 100) / 100);
        algo = true;
      }
      if (algo) tocadas++;
    }

    const signo = factor >= 1 ? "Aumento" : "Descuento";
    avisar(
      `${signo} aplicado a ${tocadas} producto${tocadas === 1 ? "" : "s"}` +
        (sinPrecio > 0 ? ` · ${sinPrecio} sin campos de precio, omitidos` : "") +
        ". Revisá y guardá.",
    );
  };

  const aplicarRedondeo = () => {
    let tocadas = 0;
    for (const fila of filasSeleccionadas) {
      const cat = catPorTabla.get(fila._tabla);
      if (!cat) continue;
      let algo = false;
      for (const campo of cat.precios) {
        const actual = valorDe(fila, campo.key);
        if (actual === null || actual === undefined || actual === "") continue;
        const n = Number(actual);
        if (!Number.isFinite(n)) continue;
        const nuevo = redondear(n, modoRedondeo);
        if (nuevo === Number(fila[campo.key])) olvidar(fila.id, campo.key);
        else escribir(fila.id, fila._tabla, campo.key, nuevo);
        algo = true;
      }
      if (algo) tocadas++;
    }
    avisar(`Redondeo aplicado a ${tocadas} producto${tocadas === 1 ? "" : "s"}. Revisá y guardá.`);
  };

  const aplicarStock = (modo: "set" | "sumar") => {
    const valor = parsearNumero(stockLote);
    if (valor === "invalido" || valor === null) { avisar("Cantidad inválida", "error"); return; }
    let tocadas = 0;
    for (const fila of filasSeleccionadas) {
      if (!aplica(fila, "stock")) continue;
      const actual = Number(valorDe(fila, "stock") ?? 0);
      const nuevo = modo === "set" ? valor : Math.max(0, actual + valor);
      escribir(fila.id, fila._tabla, "stock", Math.round(nuevo));
      tocadas++;
    }
    avisar(`Stock actualizado en ${tocadas} producto${tocadas === 1 ? "" : "s"}. Revisá y guardá.`);
  };

  /** Completa la moneda de las filas que no la tienen, deduciéndola del precio. */
  const completarMonedas = (objetivo: Fila[]) => {
    let completadas = 0;
    let sinDato = 0;
    for (const fila of objetivo) {
      const sugerida = monedaSugerida(fila);
      if (!sugerida) {
        // Sin precio cargado no hay de dónde deducirla; con moneda ya puesta,
        // no hay nada que completar.
        if (catPorTabla.get(fila._tabla)?.tieneMoneda && !String(valorDe(fila, "moneda") ?? "").trim()) {
          sinDato++;
        }
        continue;
      }
      escribir(fila.id, fila._tabla, "moneda", sugerida);
      completadas++;
    }
    avisar(
      completadas === 0
        ? "No hay monedas para completar en lo que estás viendo."
        : `${completadas} moneda${completadas === 1 ? "" : "s"} completada${completadas === 1 ? "" : "s"} (más de $${UMBRAL_ARS} → ARS)` +
            (sinDato > 0 ? ` · ${sinDato} sin precio, no se pudo deducir` : "") +
            ". Revisá y guardá.",
      completadas === 0 ? "error" : "ok",
    );
  };

  const aplicarMoneda = () => {
    if (!monedaLote) { avisar("Elegí una moneda", "error"); return; }
    const cot = cotizacion.trim() ? parsearNumero(cotizacion) : null;
    if (cot === "invalido" || (cotizacion.trim() && (cot === null || cot === 0))) {
      avisar("Cotización inválida", "error");
      return;
    }

    let tocadas = 0;
    let convertidas = 0;
    for (const fila of filasSeleccionadas) {
      if (!aplica(fila, "moneda")) continue;
      const monedaActual = String(valorDe(fila, "moneda") ?? "").toUpperCase();
      escribir(fila.id, fila._tabla, "moneda", monedaLote);
      tocadas++;

      // La conversión solo tiene sentido si la moneda realmente cambia y se dio
      // una cotización. Sin ella se cambia la etiqueta y nada más, que es lo
      // que se quiere cuando estaba mal cargada de origen.
      if (!cot || !monedaActual || monedaActual === monedaLote) continue;
      const cat = catPorTabla.get(fila._tabla);
      for (const campo of cat?.precios ?? []) {
        const actual = valorDe(fila, campo.key);
        if (actual === null || actual === undefined || actual === "") continue;
        const n = Number(actual);
        if (!Number.isFinite(n)) continue;
        // ARS → USD divide por la cotización; USD → ARS multiplica.
        const nuevo = monedaLote === "USD" ? n / cot : n * cot;
        escribir(fila.id, fila._tabla, campo.key, Math.round(nuevo * 100) / 100);
      }
      convertidas++;
    }
    avisar(
      `Moneda cambiada en ${tocadas} producto${tocadas === 1 ? "" : "s"}` +
        (convertidas > 0 ? ` · ${convertidas} con importes convertidos` : "") +
        ". Revisá y guardá.",
    );
  };

  // ─── Guardar ───────────────────────────────────────────────────────────────

  const cantidadCambios = useMemo(() => {
    let n = 0;
    for (const campos of pendientes.values()) n += Object.keys(campos).filter((k) => k !== "__tabla").length;
    return n;
  }, [pendientes]);

  const descartar = () => {
    setPendientes(new Map());
    setInvalidas(new Set());
    setBorradores(new Map());
    monedasAutoRef.current.clear();
  };

  const guardar = async () => {
    if (invalidas.size > 0) { avisar("Hay celdas con valores inválidos", "error"); return; }
    if (pendientes.size === 0) return;

    setGuardando(true);
    const cambios = [...pendientes.entries()].map(([id, campos]) => {
      const { __tabla, ...resto } = campos as Pendiente & { __tabla?: string };
      return { id, tabla: __tabla, campos: resto };
    });

    try {
      const res = await fetch("/api/productos/precios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cambios }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar");

      const { aplicados, errores } = json.data as { aplicados: number; errores: { id: string; error: string }[] };
      if (errores.length > 0) {
        avisar(`${aplicados} guardados · ${errores.length} con error: ${errores[0].error}`, "error");
      } else {
        avisar(`${aplicados} producto${aplicados === 1 ? "" : "s"} actualizado${aplicados === 1 ? "" : "s"}`);
      }

      // Solo se limpia lo que efectivamente entró; si algo falló queda pendiente
      // en pantalla para que se pueda corregir en vez de perderse.
      if (errores.length === 0) descartar();
      else {
        const fallados = new Set(errores.map((e) => e.id));
        setPendientes((prev) => {
          const s = new Map<string, Pendiente>();
          for (const [id, campos] of prev) if (fallados.has(id)) s.set(id, campos);
          return s;
        });
      }
      await cargar();
    } catch (err) {
      avisar(err instanceof Error ? err.message : "Error de red al guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  // Aviso del navegador si se intenta cerrar con cambios sin guardar.
  useEffect(() => {
    if (pendientes.size === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendientes.size]);

  const totalPages = Math.max(1, Math.ceil(total / take));
  const hayFiltros = !!(busqueda || tabla || marca || estado !== "todos" || faltantes);

  // ─── Render ────────────────────────────────────────────────────────────────

  // Sin `bg-transparent` acá: es una utilidad del mismo grupo que el amarillo de
  // "pendiente" y le ganaba por orden en la hoja de estilos, así que los cambios
  // sin guardar se veían blancos.
  const celdaBase =
    "w-full px-2 py-1.5 text-[12px] text-right tabular-nums outline-none rounded-sm focus:ring-1 focus:ring-[#DF8635]";
  const celdaLimpia = "bg-transparent focus:bg-white";
  const celdaPendiente = "bg-[#FDEFC8] ring-1 ring-[#DF8635] font-medium";
  const celdaInvalida = "bg-red-50 ring-1 ring-red-400";

  return (
    <div className="pb-24">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#aaa]" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="SKU, nombre o marca..."
            className="w-56 pl-8 pr-3 py-2 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
          />
        </div>

        <select
          value={tabla}
          onChange={(e) => { setTabla(e.target.value); setPage(1); }}
          className="px-2.5 py-2 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.tabla} value={c.tabla}>{c.label}</option>
          ))}
        </select>

        <select
          value={marca}
          onChange={(e) => { setMarca(e.target.value); setPage(1); }}
          className="px-2.5 py-2 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          className="px-2.5 py-2 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
        >
          <option value="todos">Activos e inactivos</option>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
        </select>

        <select
          value={faltantes}
          onChange={(e) => { setFaltantes(e.target.value); setPage(1); }}
          className="px-2.5 py-2 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
        >
          <option value="">Sin filtro de faltantes</option>
          <option value="precio">Solo sin precio cargado</option>
          <option value="stock">Solo sin stock</option>
        </select>

        {hayFiltros && (
          <button
            onClick={() => { setBusqueda(""); setTabla(""); setMarca(""); setEstado("todos"); setFaltantes(""); setPage(1); }}
            className="flex items-center gap-1 px-2.5 py-2 text-[11px] text-[#777] hover:text-[#111] border border-transparent hover:border-[#E0DED8]"
          >
            <FiX size={12} /> Limpiar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={cargar}
            disabled={cargando}
            className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] text-[#777] hover:text-[#111] border border-[#E0DED8] disabled:opacity-40"
            title="Recargar"
          >
            <FiRefreshCw size={12} className={cargando ? "animate-spin" : ""} />
          </button>
          <select
            value={take}
            onChange={(e) => { setTake(Number(e.target.value)); setPage(1); }}
            className="px-2 py-2 text-[11px] bg-white border border-[#E0DED8] focus:outline-none"
          >
            {TAMANOS.map((n) => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
      </div>

      {/* Resumen: cuántos faltan, y acceso directo a verlos */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
        <span className="text-[#888]">
          <strong className="text-[#111]">{total}</strong> producto{total === 1 ? "" : "s"}
          {hayFiltros ? " con estos filtros" : " en total"}
        </span>
        <span className="text-[#ddd]">·</span>
        {([
          { key: "precio", label: "sin precio", n: resumen.sinPrecio },
          { key: "stock", label: "sin stock", n: resumen.sinStock },
          { key: "moneda", label: "sin moneda", n: resumen.sinMoneda },
        ] as const).map(({ key, label, n }) => (
          <button
            key={key}
            onClick={() => { setFaltantes(faltantes === key ? "" : key); setPage(1); }}
            disabled={n === 0 && faltantes !== key}
            className={`px-2 py-1 border transition-colors disabled:opacity-40 disabled:cursor-default ${
              faltantes === key
                ? "border-[#DF8635] bg-[#FFF8F1] text-[#111] font-medium"
                : "border-[#E0DED8] text-[#777] hover:border-[#bbb] enabled:hover:text-[#111]"
            }`}
            title={n === 0 ? `No hay productos ${label}` : `Ver solo los ${label}`}
          >
            {n} {label}
          </button>
        ))}

        {resumen.sinMoneda > 0 && (
          <button
            onClick={() => completarMonedas(filas)}
            className="ml-auto px-2.5 py-1 border border-[#111] text-[#111] hover:bg-[#111] hover:text-white transition-colors"
            title={`Deduce la moneda del precio: más de $${UMBRAL_ARS} es ARS, menos es USD`}
          >
            Completar moneda de esta página
          </button>
        )}
      </div>

      {/* Barra de operaciones masivas */}
      {seleccion.size > 0 && (
        <div className="mb-4 border border-[#DF8635]/40 bg-[#FFF8F1] p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#111] uppercase tracking-[0.06em]">
              {seleccion.size} seleccionado{seleccion.size === 1 ? "" : "s"} · operaciones en lote
            </span>
            <button onClick={() => setSeleccion(new Set())} className="text-[11px] text-[#777] hover:text-[#111]">
              Deseleccionar
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            {/* Porcentaje */}
            <div>
              <label className="block text-[10px] text-[#888] uppercase tracking-[0.06em] mb-1">Aumento / descuento</label>
              <div className="flex items-center gap-1">
                <div className="relative">
                  <FiPercent size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#bbb]" />
                  <input
                    value={porcentaje}
                    onChange={(e) => setPorcentaje(e.target.value)}
                    placeholder="12  ó  -5"
                    className="w-24 pl-2 pr-6 py-1.5 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
                  />
                </div>
                <button
                  onClick={aplicarPorcentaje}
                  className="px-3 py-1.5 text-[11px] font-medium bg-[#111] text-white hover:bg-[#333]"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Redondeo */}
            <div>
              <label className="block text-[10px] text-[#888] uppercase tracking-[0.06em] mb-1">Redondear</label>
              <div className="flex items-center gap-1">
                <select
                  value={modoRedondeo}
                  onChange={(e) => setModoRedondeo(e.target.value as ModoRedondeo)}
                  className="px-2 py-1.5 text-[12px] bg-white border border-[#E0DED8] focus:outline-none"
                >
                  <option value="1">al entero</option>
                  <option value="10">a la decena</option>
                  <option value="100">a la centena</option>
                  <option value="1000">al millar</option>
                  <option value="99">terminación 99</option>
                </select>
                <button
                  onClick={aplicarRedondeo}
                  className="px-3 py-1.5 text-[11px] font-medium bg-[#111] text-white hover:bg-[#333]"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-[10px] text-[#888] uppercase tracking-[0.06em] mb-1">Stock</label>
              <div className="flex items-center gap-1">
                <input
                  value={stockLote}
                  onChange={(e) => setStockLote(e.target.value)}
                  placeholder="0"
                  className="w-20 px-2 py-1.5 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
                />
                <button onClick={() => aplicarStock("set")} className="px-2.5 py-1.5 text-[11px] font-medium bg-[#111] text-white hover:bg-[#333]">
                  Fijar
                </button>
                <button onClick={() => aplicarStock("sumar")} className="px-2.5 py-1.5 text-[11px] font-medium border border-[#111] text-[#111] hover:bg-[#111] hover:text-white">
                  Sumar
                </button>
              </div>
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-[10px] text-[#888] uppercase tracking-[0.06em] mb-1">Moneda</label>
              <div className="flex items-center gap-1">
                <select
                  value={monedaLote}
                  onChange={(e) => setMonedaLote(e.target.value)}
                  className="px-2 py-1.5 text-[12px] bg-white border border-[#E0DED8] focus:outline-none"
                >
                  <option value="">elegir</option>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  value={cotizacion}
                  onChange={(e) => setCotizacion(e.target.value)}
                  placeholder="cotización (opcional)"
                  className="w-36 px-2 py-1.5 text-[12px] bg-white border border-[#E0DED8] focus:outline-none focus:border-[#DF8635]"
                />
                <button onClick={aplicarMoneda} className="px-3 py-1.5 text-[11px] font-medium bg-[#111] text-white hover:bg-[#333]">
                  Aplicar
                </button>
                <button
                  onClick={() => completarMonedas(filasSeleccionadas)}
                  className="px-2.5 py-1.5 text-[11px] font-medium border border-[#111] text-[#111] hover:bg-[#111] hover:text-white"
                  title={`Solo completa las que están vacías, deduciéndolas del precio (más de $${UMBRAL_ARS} → ARS)`}
                >
                  Completar faltantes
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10.5px] text-[#8a7a68] leading-relaxed">
            Todo esto se escribe como cambio pendiente: lo ves en amarillo sobre la grilla y no impacta
            en la base hasta que apretás <strong>Guardar</strong>. Podés encadenar operaciones (aumentar,
            después redondear) y descartar todo junto si algo no cuadra.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 border border-red-200 bg-red-50 text-[12px] text-red-700">
          <FiAlertTriangle size={13} /> {error}
        </div>
      )}

      {/* Grilla */}
      <div ref={contenedorRef} className="border border-[#E0DED8] bg-white overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#FAFAF8]">
            <tr className="border-b border-[#E0DED8]">
              <th className="sticky left-0 z-20 bg-[#FAFAF8] w-9 px-2 py-2.5">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={alternarTodos}
                  className="accent-[#DF8635] cursor-pointer"
                  aria-label="Seleccionar todos los visibles"
                />
              </th>
              <th className="sticky left-9 z-20 bg-[#FAFAF8] px-2 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-[0.06em]">SKU</th>
              <th className="sticky left-[124px] z-20 bg-[#FAFAF8] px-2 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-[0.06em]">Producto</th>
              {hayMoneda && (
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-[0.06em]">Moneda</th>
              )}
              {columnas.map((c) => (
                <th key={c.key} className="px-2 py-2.5 text-right text-[10px] font-semibold text-[#888] uppercase tracking-[0.06em] whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2.5 text-right text-[10px] font-semibold text-[#888] uppercase tracking-[0.06em]">Stock</th>
            </tr>
          </thead>

          <tbody>
            {cargando && filas.length === 0 ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F0EEE9]">
                  <td colSpan={4 + (hayMoneda ? 1 : 0) + columnas.length} className="px-2 py-3">
                    <div className="h-3 bg-[#F4F2ED] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={4 + (hayMoneda ? 1 : 0) + columnas.length} className="px-4 py-16 text-center text-[12px] text-[#999]">
                  No hay productos con estos filtros.
                </td>
              </tr>
            ) : (
              filas.map((fila, i) => {
                const cat = catPorTabla.get(fila._tabla);
                const seleccionada = seleccion.has(fila.id);
                const filaPendiente = pendientes.has(fila.id);
                const nombre = String(fila.nombre ?? fila.especie ?? fila.sku ?? "");
                // Las celdas fijas se pintan aparte: al quedar sobre las que
                // scrollean necesitan fondo propio o se ve el contenido debajo.
                const fondoFila = seleccionada
                  ? "bg-[#FFF8F1]"
                  : filaPendiente
                    ? "bg-[#FFFDF3]"
                    : i % 2 === 0
                      ? "bg-white"
                      : "bg-[#FCFBF9]";
                return (
                  <tr
                    key={fila.id}
                    className={`border-b border-[#F0EEE9] transition-colors ${fondoFila}`}
                  >
                    <td className={`sticky left-0 z-10 px-2 py-1 ${fondoFila}`}>
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        onChange={() => setSeleccion((prev) => {
                          const s = new Set(prev);
                          if (s.has(fila.id)) s.delete(fila.id); else s.add(fila.id);
                          return s;
                        })}
                        className="accent-[#DF8635] cursor-pointer"
                        aria-label={`Seleccionar ${nombre}`}
                      />
                    </td>

                    <td className={`sticky left-9 z-10 w-[100px] px-2 py-1 text-[11px] text-[#777] font-mono whitespace-nowrap overflow-hidden text-ellipsis ${fondoFila}`}>
                      {String(fila.sku ?? "")}
                    </td>

                    <td className={`sticky left-[124px] z-10 px-2 py-1 max-w-[280px] ${fondoFila}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat?.dot ?? "#ccc" }} title={cat?.label} />
                        <span className="text-[12px] text-[#111] truncate" title={nombre}>{nombre}</span>
                        {fila.isActive === false && (
                          <span className="text-[9px] uppercase tracking-wide text-[#b91c1c] border border-red-200 px-1 shrink-0">inactivo</span>
                        )}
                      </div>
                      {fila.marca ? <span className="text-[10px] text-[#aaa]">{String(fila.marca)}</span> : null}
                    </td>

                    {/* Moneda */}
                    {hayMoneda && (
                    <td className="px-2 py-1">
                      {cat?.tieneMoneda ? (
                        <select
                          value={String(valorDe(fila, "moneda") ?? "")}
                          onChange={(e) => {
                            const v = e.target.value;
                            // Elegida a mano: deja de recalcularse con el precio.
                            monedasAutoRef.current.delete(fila.id);
                            if (v === String(fila.moneda ?? "")) olvidar(fila.id, "moneda");
                            else escribir(fila.id, fila._tabla, "moneda", v === "" ? null : v);
                          }}
                          className={`text-[11px] px-1 py-1 border rounded-sm bg-transparent focus:outline-none focus:border-[#DF8635] ${
                            estaPendiente(fila.id, "moneda")
                              ? "border-[#DF8635] bg-[#FDEFC8] font-medium"
                              : "border-transparent hover:border-[#E0DED8]"
                          }`}
                        >
                          <option value="">—</option>
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-[#ccc]">—</span>
                      )}
                      {/* Sugerencia deducida del precio, a un click de aplicarse.
                          Se muestra al lado, no dentro del select, para que se
                          note que todavia no es el valor guardado. */}
                      {(() => {
                        const sugerida = monedaSugerida(fila);
                        if (!sugerida) return null;
                        return (
                          <button
                            onClick={() => escribir(fila.id, fila._tabla, "moneda", sugerida)}
                            className="ml-1 px-1 py-0.5 text-[9px] uppercase tracking-wide text-[#b08040] border border-dashed border-[#DF8635]/50 hover:bg-[#FDEFC8] transition-colors"
                            title={`Deducido del precio: más de $${UMBRAL_ARS} es ARS. Click para aplicarlo.`}
                          >
                            {sugerida}?
                          </button>
                        );
                      })()}
                    </td>
                    )}

                    {/* Precios */}
                    {columnas.map((c) => {
                      const permitido = aplica(fila, c.key);
                      const clave = `${fila.id}|${c.key}`;
                      const invalida = invalidas.has(clave);
                      const pendiente = estaPendiente(fila.id, c.key);
                      return (
                        <td key={c.key} className="px-1 py-1 min-w-[110px]">
                          {permitido ? (
                            <input
                              data-celda={`${i}|${c.key}`}
                              value={
                                borradores.get(clave) ??
                                (celdaFoco === clave
                                  ? aTexto(valorDe(fila, c.key))
                                  : aTextoLegible(valorDe(fila, c.key)))
                              }
                              onChange={(e) => onCelda(fila, c.key, e.target.value)}
                              onKeyDown={(e) => onTeclaCelda(e, i, c.key)}
                              onFocus={(e) => { setCeldaFoco(clave); e.target.select(); }}
                              onBlur={() => setCeldaFoco((f) => (f === clave ? null : f))}
                              inputMode="decimal"
                              placeholder="—"
                              className={`${celdaBase} ${
                                invalida ? celdaInvalida : pendiente ? celdaPendiente : celdaLimpia
                              }`}
                              title={pendiente ? `Antes: ${aTexto(fila[c.key]) || "vacío"}` : undefined}
                            />
                          ) : (
                            <span className="block text-right text-[11px] text-[#ddd] px-2">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Stock */}
                    <td className="px-1 py-1 min-w-[80px]">
                      {cat?.tieneStock ? (
                        <input
                          data-celda={`${i}|stock`}
                          value={
                            borradores.get(`${fila.id}|stock`) ??
                            (valorDe(fila, "stock") === null || valorDe(fila, "stock") === undefined
                              ? ""
                              : String(valorDe(fila, "stock")))
                          }
                          onChange={(e) => onCelda(fila, "stock", e.target.value)}
                          onKeyDown={(e) => onTeclaCelda(e, i, "stock")}
                          onFocus={(e) => e.target.select()}
                          inputMode="numeric"
                          placeholder="—"
                          className={`${celdaBase} ${
                            invalidas.has(`${fila.id}|stock`)
                              ? celdaInvalida
                              : estaPendiente(fila.id, "stock")
                                ? celdaPendiente
                                : celdaLimpia
                          }`}
                        />
                      ) : (
                        <span className="block text-right text-[11px] text-[#ddd] px-2">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-[#888]">
        <span>
          {total > 0
            ? `${(page - 1) * take + 1}–${Math.min(page * take, total)} de ${fmt.format(total).replace(",00", "")} productos`
            : "Sin resultados"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-[#E0DED8] disabled:opacity-30 hover:border-[#DF8635]"
            >
              <FiChevronLeft size={13} />
            </button>
            <span className="px-2">página {page} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 border border-[#E0DED8] disabled:opacity-30 hover:border-[#DF8635]"
            >
              <FiChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Barra de cambios pendientes */}
      {(pendientes.size > 0 || invalidas.size > 0) && (
        <div className="fixed bottom-0 left-[200px] right-0 z-40 border-t border-[#E0DED8] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4 px-6 lg:px-10 py-3">
            {pendientes.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#DF8635]" />
                <span className="text-[12px] text-[#111]">
                  <strong>{cantidadCambios}</strong> cambio{cantidadCambios === 1 ? "" : "s"} en{" "}
                  <strong>{pendientes.size}</strong> producto{pendientes.size === 1 ? "" : "s"}
                </span>
              </div>
            ) : (
              <span className="text-[12px] text-[#777]">Sin cambios válidos para guardar</span>
            )}

            {invalidas.size > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-red-600">
                <FiAlertTriangle size={12} /> {invalidas.size} celda{invalidas.size === 1 ? "" : "s"} con valor inválido
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={descartar}
                disabled={guardando}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#777] hover:text-[#111] border border-[#E0DED8] disabled:opacity-40"
              >
                <FiRotateCcw size={12} /> Descartar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || invalidas.size > 0}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-[#DF8635] text-white hover:bg-[#c9752d] disabled:opacity-40"
              >
                {guardando ? <FiRefreshCw size={12} className="animate-spin" /> : <FiSave size={12} />}
                {guardando ? "Guardando..." : "Guardar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
