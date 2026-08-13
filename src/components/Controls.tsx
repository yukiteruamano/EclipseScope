// ============================================================
// Barra de controles: selector de fecha, selector de país (combobox
// accesible con búsqueda) y botón "Calcular eclipses".
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES, flagOf, type Country } from '../data/countries'

// "Props" (propiedades): los datos que el componente recibe de su padre (App).
interface Props {
  date: string // Fecha de referencia elegida
  onDate: (d: string) => void // Avisa al padre cuando cambia la fecha
  country: Country // País seleccionado
  onCountry: (c: Country) => void // Avisa al padre cuando cambia el país
  onCalculate: () => void // Avisa al padre al pulsar "Calcular"
  loading: boolean // true mientras se calcula (desactiva el botón)
  stale?: boolean // true si hay resultados viejos pendientes de recalcular
}

// Fecha de hoy en formato "aaaa-mm-dd".
function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Identificadores fijos para el combobox (usados por aria-* para accesibilidad).
const LISTBOX_ID = 'country-listbox'
const INPUT_ID = 'country-input'

// Elimina los acentos de un texto (á→a, é→e...) para que buscar "espana"
// también encuentre "España". Se usa al filtrar la lista de países.
const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function Controls({
  date,
  onDate,
  country,
  onCountry,
  onCalculate,
  loading,
  stale = false,
}: Props) {
  const [open, setOpen] = useState(false) // ¿Lista de países abierta?
  const [value, setValue] = useState(country.name) // Texto escrito en el campo
  const [activeIdx, setActiveIdx] = useState(0) // Opción resaltada en la lista
  const boxRef = useRef<HTMLDivElement>(null) // Referencia al contenedor del combobox
  const inputRef = useRef<HTMLInputElement>(null) // Referencia al campo de texto

  // Lista de países filtrada según lo que el usuario escribe.
  const filtered = useMemo(() => {
    // Si el valor no se ha tocado (es el país seleccionado), mostrar el listado completo.
    const untouched = value === country.name
    const q = untouched ? '' : stripAccents(value.trim().toLowerCase())
    if (!q) return COUNTRIES
    // Se busca en nombre, código y capital (ignorando acentos y mayúsculas).
    return COUNTRIES.filter((c) =>
      stripAccents(`${c.name} ${c.code} ${c.capital}`.toLowerCase()).includes(q),
    )
  }, [value, country])

  // Sincroniza el valor mostrado cuando cambia el país seleccionado (p.ej. accesos rápidos).
  useEffect(() => {
    if (!open) setValue(country.name)
  }, [country, open])

  // Cierre al hacer clic fuera: si se hace clic en cualquier lugar que no sea
  // el combobox, se cierra la lista y se restaura el nombre del país elegido.
  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) {
        setOpen(false)
        setValue(country.name)
        setActiveIdx(0)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [country])

  // Selecciona un país: informa al padre, cierra la lista y muestra su nombre.
  const select = (c: Country) => {
    onCountry(c)
    setValue(c.name)
    setOpen(false)
    setActiveIdx(0)
  }

  // Manejo del teclado del combobox (patrón de lista desplegable accesible):
  // - Flechas ↑/↓ para navegar, Enter para elegir, Escape para cerrar.
  // - Escribir cualquier letra abre la lista y filtra.
  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (!open) {
      // Lista cerrada: ↓, Enter o espacio la abren.
      if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault()
        setOpen(true)
        setActiveIdx(0)
      }
      return
    }
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        ev.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        ev.preventDefault()
        setActiveIdx(0)
        break
      case 'End':
        ev.preventDefault()
        setActiveIdx(filtered.length - 1)
        break
      case 'Enter':
        ev.preventDefault()
        if (filtered[activeIdx]) select(filtered[activeIdx])
        break
      case 'Escape':
        ev.preventDefault()
        setOpen(false)
        setValue(country.name)
        setActiveIdx(0)
        break
      case 'Tab':
        setOpen(false)
        setValue(country.name)
        break
      default:
        // la escritura filtra; la lista se abre al escribir
        setOpen(true)
        setActiveIdx(0)
    }
  }

  // ID de la opción activa, para que los lectores de pantalla la anuncien
  // mediante aria-activedescendant.
  const activeId =
    open && filtered[activeIdx] ? `${LISTBOX_ID}-opt-${filtered[activeIdx].code}` : undefined

  return (
    <div className="glass-strong relative z-40 rounded-2xl p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-end">
        {/* Selector de fecha de referencia (cualquier fecha entre 1900 y 2100). */}
        <label className="block" htmlFor="ref-date">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-300">
            Fecha de referencia
          </span>
          <input
            id="ref-date"
            type="date"
            value={date}
            min="1900-01-01"
            max="2100-12-31"
            onChange={(e) => onDate(e.target.value || todayISO())}
            className="w-full rounded-xl border border-white/10 bg-space-950/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-solar-500/60 focus:ring-2 focus:ring-solar-500/20 [color-scheme:dark]"
          />
          <p className="mt-1 text-xs text-slate-400">Se calculan los próximos eclipses tras esta fecha.</p>
        </label>

        {/* Combobox de países: campo de texto + lista desplegable con búsqueda. */}
        <div ref={boxRef} className="relative">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-300">
            Ubicación · País
          </span>
          <div className="relative">
            {/* Bandera del país seleccionado, como icono decorativo. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg leading-none"
            >
              {flagOf(country.code)}
            </span>
            {/* Los atributos role="combobox" y aria-* hacen que el navegador y
                los lectores de pantalla lo traten como una lista desplegable
                accesible (WCAG). */}
            <input
              ref={inputRef}
              id={INPUT_ID}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={LISTBOX_ID}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-activedescendant={activeId}
              aria-label="País (búscalo escribiendo)"
              autoComplete="off"
              value={value}
              onFocus={(e) => {
                e.currentTarget.select()
                setOpen(true)
              }}
              onChange={(e) => {
                setValue(e.target.value)
                setOpen(true)
                setActiveIdx(0)
              }}
              onKeyDown={onKeyDown}
              className="w-full rounded-xl border border-white/10 bg-space-950/60 py-2.5 pl-10 pr-9 text-sm text-slate-100 outline-none transition focus:border-solar-500/60 focus:ring-2 focus:ring-solar-500/20"
            />
            <svg
              aria-hidden="true"
              className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Circunstancias locales calculadas en la capital ({country.capital}).
          </p>

          {/* Lista desplegable de países (visible solo si `open` es true). */}
          <ul
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Países"
            hidden={!open}
            className="glass-strong absolute z-50 mt-2 w-full overflow-hidden rounded-xl shadow-2xl shadow-black/60"
          >
            <li className="border-b border-white/5 px-3.5 py-2 text-[11px] text-slate-400" role="presentation">
              Usa ↑/↓ para navegar y Enter para elegir
            </li>
            {filtered.map((c, i) => (
              <li
                key={c.code}
                id={`${LISTBOX_ID}-opt-${c.code}`}
                role="option"
                aria-selected={i === activeIdx}
                onClick={() => select(c)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-sm transition ${
                  i === activeIdx ? 'bg-solar-500/15 text-solar-300' : 'text-slate-200'
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {flagOf(c.code)}
                </span>
                <span className="font-medium">{c.name}</span>
                <span className="ml-auto text-xs text-slate-400">{c.capital}</span>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3.5 py-3 text-sm text-slate-400">Sin resultados</li>
            )}
          </ul>
        </div>

        {/* Botón de cálculo. Mientras calcula, muestra un spinner y se desactiva. */}
        <div className="md:w-44">
          <button
            type="button"
            onClick={onCalculate}
            disabled={loading}
            aria-busy={loading}
            className="touch-target group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-solar-500 to-solar-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-solar-600/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Calculando…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Calcular eclipses
              </>
            )}
          </button>
          {stale && !loading && (
            <p className="mt-1.5 text-center text-xs text-amber-300" role="status">
              Recalculando…
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
