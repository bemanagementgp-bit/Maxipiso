"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { FiPlus, FiX, FiLoader, FiUpload, FiAlertCircle, FiGrid } from "react-icons/fi";
import { TIPOS_SUGERIDOS, type Opcion } from "@/lib/variantes";

/**
 * Carga las variantes de un producto sin salir de su ficha.
 *
 * Antes había que crear cada color como un producto aparte y después volver a
 * cada uno a escribirle el SKU del principal: ocho pantallas para un piso que
 * viene en ocho colores. Acá se definen las opciones una vez —Color con sus
 * valores, Medidas con los suyos— y la tabla de abajo es el grupo entero.
 *
 * **Una variante sigue siendo un producto**, con su SKU, su precio y su stock.
 * Esta tabla edita los cuatro datos que cambian entre hermanas; el resto —la
 * descripción, las fichas técnicas, la galería completa— se edita abriendo esa
 * variante como cualquier otro producto.
 *
 * El guardado lo dispara el botón del panel, no uno propio: quien carga
 * completa la ficha y aprieta Guardar una vez. Por eso el componente expone
 * `guardar()` por ref en vez de tener su propio botón.
 */

export type Fila = {
  /** `null` mientras no exista en la base. */
  id: string | null;
  sku: string;
  nombre: string;
  opciones: Opcion[];
  imagen: string | null;
  precio: number | null;
  stock: number | null;
  esPrincipal: boolean;
};

type Definicion = { tipo: string; valores: string[] };

export type VariantesHandle = {
  /** Manda el grupo a la API. Devuelve los avisos que haya. */
  guardar: () => Promise<string[]>;
  hayCambios: () => boolean;
};

type Props = {
  /** `null` cuando el producto todavía no se guardó. */
  productoId: string | null;
  onDirty?: (sucio: boolean) => void;
};

const input =
  "px-2 py-1.5 text-[12px] border border-[#E0DED8] bg-white focus:outline-none focus:border-[#DF8635] rounded-sm";
const chip =
  "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[#F5F4F1] border border-[#E0DED8] rounded-sm";

/** Un SKU legible a partir del principal y los valores: PF-001-ROBLE-120X20. */
function skuSugerido(base: string, valores: string[]): string {
  const cola = valores
    .map((v) =>
      v
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return cola ? `${base}-${cola}` : base;
}

/** Todas las combinaciones de valores, en el orden en que se definieron. */
function combinaciones(defs: Definicion[]): Opcion[][] {
  const utiles = defs.filter((d) => d.tipo.trim() && d.valores.length > 0);
  if (utiles.length === 0) return [];
  return utiles.reduce<Opcion[][]>(
    (acc, def) => acc.flatMap((parcial) => def.valores.map((valor) => [...parcial, { tipo: def.tipo, valor }])),
    [[]],
  );
}

/** Dos combinaciones son la misma si coinciden tipo y valor en todo. */
function mismaCombinacion(a: Opcion[], b: Opcion[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((o) =>
    b.some((x) => x.tipo.toLowerCase() === o.tipo.toLowerCase() && x.valor.toLowerCase() === o.valor.toLowerCase()),
  );
}

/** Las definiciones que se deducen de las filas ya cargadas. */
function definicionesDesde(filas: Fila[]): Definicion[] {
  const mapa = new Map<string, Definicion>();
  for (const f of filas) {
    for (const o of f.opciones) {
      const clave = o.tipo.toLowerCase();
      const def = mapa.get(clave) ?? { tipo: o.tipo, valores: [] };
      if (!def.valores.some((v) => v.toLowerCase() === o.valor.toLowerCase())) def.valores.push(o.valor);
      mapa.set(clave, def);
    }
  }
  return [...mapa.values()];
}

const VariantesEditor = forwardRef<VariantesHandle, Props>(function VariantesEditor(
  { productoId, onDirty },
  ref,
) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [defs, setDefs] = useState<Definicion[]>([]);
  const [skuPrincipal, setSkuPrincipal] = useState("");
  const [etiquetaPrecio, setEtiquetaPrecio] = useState<string | null>(null);
  const [tieneStock, setTieneStock] = useState(true);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [valorNuevo, setValorNuevo] = useState<Record<number, string>>({});
  const huellaRef = useRef("");

  const huella = useCallback(
    (fs: Fila[]) => JSON.stringify(fs.map((f) => [f.id, f.sku, f.nombre, f.opciones, f.imagen, f.precio, f.stock])),
    [],
  );

  useEffect(() => {
    if (!productoId) { setFilas([]); setDefs([]); huellaRef.current = ""; return; }
    setCargando(true);
    setError("");
    fetch(`/api/productos/${productoId}/variantes`)
      .then((r) => r.json())
      .then((j) => {
        if (!j?.success) throw new Error(j?.error ?? "No se pudieron cargar");
        const d = j.data;
        // Un producto suelto llega con una sola fila, la suya: no es un grupo
        // todavía, así que la tabla arranca vacía y aparece recién cuando se
        // define la primera opción.
        const traidas: Fila[] = d.filas;
        setFilas(traidas.length > 1 ? traidas : traidas.map((f: Fila) => ({ ...f, opciones: f.opciones })));
        setDefs(definicionesDesde(traidas));
        setSkuPrincipal(d.skuPrincipal);
        setEtiquetaPrecio(d.etiquetaPrecio);
        setTieneStock(!!d.tieneStock);
        huellaRef.current = huella(traidas);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las variantes"))
      .finally(() => setCargando(false));
  }, [productoId, huella]);

  useEffect(() => {
    onDirty?.(huellaRef.current !== "" && huella(filas) !== huellaRef.current);
  }, [filas, huella, onDirty]);

  const hayCambios = () => huellaRef.current !== "" && huella(filas) !== huellaRef.current;

  useImperativeHandle(ref, () => ({
    hayCambios,
    guardar: async () => {
      if (!productoId) return [];
      // Si nadie tocó las variantes, no se manda nada. Guardar un producto no
      // tiene por qué reescribir filas hermanas: además de trabajo al pedo,
      // esta llamada escribe la foto de portada de cada fila, así que un
      // producto con galería quedaba a merced del orden de los dos guardados.
      // Y un grupo con datos raros —una fila que se apunta a sí misma— hacía
      // fallar la edición de campos que no tienen nada que ver.
      if (!hayCambios()) return [];
      const res = await fetch(`/api/productos/${productoId}/variantes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filas }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? "No se pudieron guardar las variantes");
      huellaRef.current = huella(filas);
      return (j?.data?.errores as string[]) ?? [];
    },
  }), [productoId, filas, huella]);

  // ── Opciones ───────────────────────────────────────────────────────────────

  const editarDef = (i: number, cambios: Partial<Definicion>) =>
    setDefs((prev) => prev.map((d, j) => (j === i ? { ...d, ...cambios } : d)));

  const agregarDef = () => {
    const usados = new Set(defs.map((d) => d.tipo.toLowerCase()));
    const libre = TIPOS_SUGERIDOS.find((t) => !usados.has(t.toLowerCase())) ?? "";
    setDefs((prev) => [...prev, { tipo: libre, valores: [] }]);
  };

  const quitarDef = (i: number) => {
    const tipo = defs[i]?.tipo.toLowerCase();
    setDefs((prev) => prev.filter((_, j) => j !== i));
    // Las filas pierden ese eje, pero no se borran: la variante sigue siendo un
    // producto y sacarla de la tabla es una decisión aparte.
    setFilas((prev) => prev.map((f) => ({ ...f, opciones: f.opciones.filter((o) => o.tipo.toLowerCase() !== tipo) })));
  };

  const agregarValor = (i: number, crudo: string) => {
    const nuevos = crudo
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (nuevos.length === 0) return;
    setDefs((prev) =>
      prev.map((d, j) => {
        if (j !== i) return d;
        const valores = [...d.valores];
        for (const v of nuevos) {
          if (!valores.some((x) => x.toLowerCase() === v.toLowerCase())) valores.push(v);
        }
        return { ...d, valores };
      }),
    );
    setValorNuevo((p) => ({ ...p, [i]: "" }));
  };

  const quitarValor = (i: number, valor: string) =>
    setDefs((prev) => prev.map((d, j) => (j === i ? { ...d, valores: d.valores.filter((v) => v !== valor) } : d)));

  // ── Filas ──────────────────────────────────────────────────────────────────

  /**
   * Crea las combinaciones que faltan, sin tocar las que ya están.
   *
   * La primera se la queda el producto base si todavía no tiene opciones. El
   * base **es una variante más** —la que además hace de cabecera del grupo— y
   * dejarlo sin valores daba un grupo de siete donde el principal no aparecía
   * en ningún botón de la ficha.
   */
  const generar = () => {
    const todas = combinaciones(defs);
    setFilas((prev) => {
      const salida = [...prev];
      for (const combo of todas) {
        if (salida.some((f) => mismaCombinacion(f.opciones, combo))) continue;

        const base = salida.find((f) => f.esPrincipal);
        if (base && base.opciones.length === 0) {
          base.opciones = combo;
          continue;
        }

        salida.push({
          id: null,
          sku: skuSugerido(skuPrincipal, combo.map((o) => o.valor)),
          nombre: base?.nombre ?? "",
          opciones: combo,
          imagen: null,
          precio: base?.precio ?? null,
          stock: null,
          esPrincipal: false,
        });
      }
      // Si no había ninguna fila, la primera pasa a ser el base.
      if (salida.length > 0 && !salida.some((f) => f.esPrincipal)) salida[0].esPrincipal = true;
      return salida;
    });
  };

  const editarFila = (i: number, cambios: Partial<Fila>) =>
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  const editarValor = (i: number, tipo: string, valor: string) =>
    setFilas((prev) =>
      prev.map((f, j) => {
        if (j !== i) return f;
        const opciones = f.opciones.filter((o) => o.tipo.toLowerCase() !== tipo.toLowerCase());
        if (valor) opciones.push({ tipo, valor });
        return { ...f, opciones };
      }),
    );

  const quitarFila = (i: number) => setFilas((prev) => prev.filter((_, j) => j !== i));

  const agregarFila = () =>
    setFilas((prev) => [
      ...prev,
      {
        id: null,
        sku: "",
        nombre: prev[0]?.nombre ?? "",
        opciones: defs.filter((d) => d.tipo.trim()).map((d) => ({ tipo: d.tipo, valor: d.valores[0] ?? "" })).filter((o) => o.valor),
        imagen: null,
        precio: prev[0]?.precio ?? null,
        stock: null,
        esPrincipal: prev.length === 0,
      },
    ]);

  const subirImagen = async (i: number, file: File) => {
    setSubiendo(i);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `El servidor rechazó la imagen (HTTP ${res.status})`);
      editarFila(i, { imagen: j.data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!productoId) {
    return (
      <p className="text-[11px] text-[#999] leading-relaxed">
        Guardá el producto y volvé a abrirlo para cargarle variantes. Las variantes son productos
        que cuelgan de éste, así que primero tiene que existir.
      </p>
    );
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[#999] py-2">
        <FiLoader size={12} className="animate-spin" /> Cargando variantes...
      </div>
    );
  }

  const tiposActivos = defs.filter((d) => d.tipo.trim());
  const faltantes = combinaciones(defs).filter((c) => !filas.some((f) => mismaCombinacion(f.opciones, c))).length;

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 px-2.5 py-2 border border-red-200 bg-red-50 text-[11px] text-red-700 rounded-sm">
          <FiAlertCircle size={13} className="shrink-0 mt-px" /> {error}
        </div>
      )}
      {avisos.length > 0 && (
        <div className="px-2.5 py-2 border border-amber-200 bg-amber-50 text-[11px] text-amber-700 rounded-sm space-y-0.5">
          {avisos.map((a, i) => <p key={i}>{a}</p>)}
        </div>
      )}

      {/* Definición de las opciones */}
      <div className="border border-[#E0DED8] rounded-sm divide-y divide-[#F0EEE8]">
        {defs.length === 0 && (
          <p className="px-3 py-3 text-[11px] text-[#999]">
            Todavía no tiene opciones. Agregá una —Color, Medidas, la que necesites— y cargá sus valores.
          </p>
        )}
        {defs.map((d, i) => (
          <div key={i} className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <input
                value={d.tipo}
                onChange={(e) => editarDef(i, { tipo: e.target.value })}
                placeholder="Color"
                list="tipos-de-variante"
                className={`${input} w-32 font-medium`}
              />
              <button
                type="button"
                onClick={() => quitarDef(i)}
                title="Quitar esta opción"
                className="ml-auto p-1 text-[#ccc] hover:text-red-500 transition-colors"
              >
                <FiX size={13} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {d.valores.map((v) => (
                <span key={v} className={chip}>
                  {v}
                  <button
                    type="button"
                    onClick={() => quitarValor(i, v)}
                    className="text-[#bbb] hover:text-red-500"
                    title="Quitar"
                  >
                    <FiX size={10} />
                  </button>
                </span>
              ))}
              <input
                value={valorNuevo[i] ?? ""}
                onChange={(e) => setValorNuevo((p) => ({ ...p, [i]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    agregarValor(i, valorNuevo[i] ?? "");
                  }
                }}
                onBlur={() => agregarValor(i, valorNuevo[i] ?? "")}
                placeholder={/medida/i.test(d.tipo) ? "120x20 y Enter" : "Roble y Enter"}
                className={`${input} w-40`}
              />
            </div>
          </div>
        ))}
      </div>

      <datalist id="tipos-de-variante">
        {TIPOS_SUGERIDOS.map((t) => <option key={t} value={t} />)}
      </datalist>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={agregarDef}
          className="flex items-center gap-1 px-2 py-1 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors rounded-sm"
        >
          <FiPlus size={11} /> Agregar otra opción
        </button>
        {faltantes > 0 && (
          <button
            type="button"
            onClick={generar}
            className="flex items-center gap-1 px-2 py-1 border border-[#DF8635] text-[11px] text-[#DF8635] hover:bg-[#FFF8F1] transition-colors rounded-sm"
          >
            <FiGrid size={11} />
            Generar {faltantes} {faltantes === 1 ? "combinación" : "combinaciones"}
          </button>
        )}
      </div>

      {/* Tabla de variantes */}
      {filas.length > 0 && (
        <div className="border border-[#E0DED8] rounded-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#FAFAF8]">
              <tr className="text-[9px] uppercase tracking-[0.08em] text-[#999]">
                <th className="text-left px-2 py-2 w-[46px]">Foto</th>
                {tiposActivos.map((d) => (
                  <th key={d.tipo} className="text-left px-2 py-2">{d.tipo}</th>
                ))}
                <th className="text-left px-2 py-2">Nombre</th>
                <th className="text-left px-2 py-2">SKU</th>
                <th className="text-left px-2 py-2 w-[110px]">{etiquetaPrecio ?? "Precio"}</th>
                {tieneStock && <th className="text-left px-2 py-2 w-[80px]">Stock</th>}
                <th className="px-2 py-2 w-[30px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEE8]">
              {filas.map((f, i) => (
                <tr key={f.id ?? `n${i}`} className="bg-white">
                  <td className="px-2 py-1.5">
                    <label
                      title="Foto de portada de esta variante"
                      className="block w-9 h-9 border border-dashed border-[#E0DED8] hover:border-[#aaa] cursor-pointer rounded-sm overflow-hidden relative bg-[#FAFAF8]"
                    >
                      {subiendo === i ? (
                        <FiLoader size={12} className="animate-spin absolute inset-0 m-auto text-[#aaa]" />
                      ) : f.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.imagen} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <FiUpload size={12} className="absolute inset-0 m-auto text-[#ccc]" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) subirImagen(i, file); e.target.value = ""; }}
                      />
                    </label>
                  </td>

                  {tiposActivos.map((d) => {
                    const actual = f.opciones.find((o) => o.tipo.toLowerCase() === d.tipo.toLowerCase())?.valor ?? "";
                    return (
                      <td key={d.tipo} className="px-2 py-1.5">
                        <select
                          value={actual}
                          onChange={(e) => editarValor(i, d.tipo, e.target.value)}
                          className={`${input} w-full`}
                        >
                          <option value="">—</option>
                          {d.valores.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                    );
                  })}

                  <td className="px-2 py-1.5">
                    <input
                      value={f.nombre}
                      onChange={(e) => editarFila(i, { nombre: e.target.value })}
                      placeholder="Nombre"
                      className={`${input} w-full min-w-[130px]`}
                    />
                  </td>

                  <td className="px-2 py-1.5">
                    <input
                      value={f.sku}
                      onChange={(e) => editarFila(i, { sku: e.target.value })}
                      placeholder="SKU"
                      className={`${input} w-full font-mono min-w-[130px]`}
                    />
                  </td>

                  <td className="px-2 py-1.5">
                    <input
                      value={f.precio ?? ""}
                      onChange={(e) => editarFila(i, { precio: e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) })}
                      inputMode="decimal"
                      placeholder="—"
                      className={`${input} w-full text-right`}
                    />
                  </td>

                  {tieneStock && (
                    <td className="px-2 py-1.5">
                      <input
                        value={f.stock ?? ""}
                        onChange={(e) => editarFila(i, { stock: e.target.value === "" ? null : Number(e.target.value) })}
                        inputMode="numeric"
                        placeholder="—"
                        className={`${input} w-full text-right`}
                      />
                    </td>
                  )}

                  <td className="px-2 py-1.5">
                    {f.esPrincipal ? (
                      <span className="text-[9px] uppercase tracking-wide text-[#bbb]" title="Es el producto que estás editando">
                        base
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => quitarFila(i)}
                        title="Sacar del grupo"
                        className="p-1 text-[#ccc] hover:text-red-500 transition-colors"
                      >
                        <FiX size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={agregarFila}
          className="flex items-center gap-1 px-2 py-1 border border-[#E0DED8] hover:border-[#DF8635] text-[11px] text-[#555] transition-colors rounded-sm"
        >
          <FiPlus size={11} /> Agregar variante
        </button>
      </div>

      <p className="text-[9px] text-[#bbb] leading-relaxed">
        Cada variante es un producto con su propio SKU. Si el SKU ya existe en esta categoría, ese
        producto se engancha al grupo en vez de crearse uno nuevo: así se agrupan los que ya estaban
        cargados sueltos. La descripción, las fichas y el resto de las fotos se editan abriendo la
        variante desde la lista de productos. Sacarla del grupo con la cruz no la borra: queda
        apagada y fuera del catálogo.
      </p>
    </div>
  );
});

export default VariantesEditor;
