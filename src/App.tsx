// ============================================================
// Componente raíz de la aplicación.
// Coordina los controles (fecha y país), lanza el cálculo de los
// eclipses y organiza la visualización en dos pestañas: Saros y
// Besselianos.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import Controls from './components/Controls' // Selector de fecha + país + botón de calcular
import SarosPanel from './components/SarosPanel' // Pestaña "Ciclo de Saros"
import BesselianPanel from './components/BesselianPanel' // Pestaña "Elementos Besselianos"
import EclipseTimeline from './components/EclipseTimeline' // Línea de tiempo de eclipses
import { TableSkeleton, CardsSkeleton } from './components/Skeleton' // Cargas provisionales (esqueletos)
import { computeEclipsesAsync, type EngineResult } from './core/engine' // Motor de cálculo (fallback si no hay Worker)
import { COUNTRIES, DEFAULT_COUNTRY_CODE, type Country } from './data/countries'
import type { WorkerResponse } from './core/eclipse.worker'

// Identifica cada pestaña de la interfaz.
type TabId = 'saros' | 'besselian'

// Claves usadas para guardar la fecha y el país elegidos en localStorage,
// de modo que la próxima visita recuerde la configuración del usuario.
const LS_DATE = 'esc:date'
const LS_COUNTRY = 'esc:country'

// Devuelve la fecha de hoy en formato "aaaa-mm-dd" (formato de los <input type="date">).
function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Lee la fecha guardada en localStorage. Si no existe o tiene un formato
// inválido, se usa la fecha de hoy. Protegido contra modo privado / SSR.
function loadDate(): string {
  try {
    const v = localStorage.getItem(LS_DATE)
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : todayISO()
  } catch {
    return todayISO()
  }
}

// Lee el país guardado en localStorage. Si no existe, se usa el país
// por defecto (España). La lista COUNTRIES está ordenada alfabéticamente.
function loadCountry(): Country {
  try {
    const code = localStorage.getItem(LS_COUNTRY)
    const found = code ? COUNTRIES.find((c) => c.code === code) : undefined
    return found ?? COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE) ?? COUNTRIES[0]
  } catch {
    return COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE) ?? COUNTRIES[0]
  }
}

// Convierte el código de país ISO (ej: "ES") en su bandera emoji
// (ej: 🇪🇸). Los emojis de bandera se forman uniendo dos "letras
// indicadoras regionales", que se calculan a partir del código.
function flag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export default function App() {
  // --- Estado de la interfaz (todo lo que la aplicación recuerda) ---
  const [date, setDate] = useState(loadDate) // Fecha de referencia elegida
  const [country, setCountry] = useState<Country>(loadCountry) // País elegido
  const [tab, setTab] = useState<TabId>('saros') // Pestaña activa
  const [result, setResult] = useState<EngineResult | null>(null) // Resultados del último cálculo
  const [loading, setLoading] = useState(false) // ¿Está calculando ahora mismo?
  const [error, setError] = useState<string | null>(null) // Mensaje de error (si lo hay)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null) // Progreso del cálculo
  const [stale, setStale] = useState(false) // ¿Hay resultados viejos mientras se recalculan?
  const [helpOpen, setHelpOpen] = useState(false) // ¿Está abierto el panel "¿Cómo funciona?"?

  // calcId es un "número de ticket" para descartar cálculos antiguos si el
  // usuario cambia de fecha/país a mitad de un cálculo. Debounce: si el
  // usuario escribe rápido, se espera un instante antes de recalcular.
  const calcId = useRef(0)
  const debounceRef = useRef<number | undefined>(undefined)
  const firstRun = useRef(true) // true durante el primer render (arranque de la app)
  const workerRef = useRef<Worker | null>(null)

  // Inicializa el Worker una vez (si el navegador lo soporta). Si falla, se usa el fallback async.
  function getWorker(): Worker | null {
    if (workerRef.current) return workerRef.current
    try {
      if (typeof Worker === 'undefined') return null
      const w = new Worker(new URL('./core/eclipse.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = w
      return w
    } catch {
      return null
    }
  }

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  // P0.10 · persistencia de parámetros: cada vez que cambia la fecha o el
  // país, se guarda en localStorage para recordarlo en la próxima visita.
  useEffect(() => {
    try {
      localStorage.setItem(LS_DATE, date)
    } catch {
      /* modo privado sin storage */
    }
  }, [date])
  useEffect(() => {
    try {
      localStorage.setItem(LS_COUNTRY, country.code)
    } catch {
      /* modo privado sin storage */
    }
  }, [country])

  // Lanza el cálculo de los 15 próximos eclipses. Intenta usar Web Worker
  // (no bloquea el hilo principal); si no está disponible, usa el fallback async.
  const runCalc = useCallback(async (d: string, c: Country) => {
    const id = ++calcId.current // Nuevo ticket: cualquier cálculo anterior queda invalidado
    setLoading(true)
    setError(null)
    setProgress(null)
    setStale(false)
    const start = new Date(`${d}T12:00:00Z`)
    if (Number.isNaN(+start)) {
      setError('Fecha no válida')
      setLoading(false)
      return
    }

    const worker = getWorker()
    if (worker) {
      // Ruta Worker
      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        const data = e.data
        if (data.id !== id) return // ignorar respuestas de cálculos obsoletos
        if (data.type === 'progress') {
          setProgress({ done: data.done, total: data.total })
        } else if (data.type === 'done') {
          worker.removeEventListener('message', onMessage)
          worker.removeEventListener('error', onError)
          if (calcId.current !== id) return
          const eclipses = data.eclipses
          // Las fechas pueden venir como string tras el clone; rehidratar si hace falta
          const rehydrated = eclipses.map((ed) => ({
            ...ed,
            peak: new Date(ed.peak),
            elements: { ...ed.elements, t: new Date(ed.elements.t) },
            centralLine: ed.centralLine.map((p) => ({ ...p, t: new Date(p.t) })),
            local: {
              ...ed.local,
              contacts: {
                partialBegin: ed.local.contacts.partialBegin ? new Date(ed.local.contacts.partialBegin) : undefined,
                totalBegin: ed.local.contacts.totalBegin ? new Date(ed.local.contacts.totalBegin) : undefined,
                peak: ed.local.contacts.peak ? new Date(ed.local.contacts.peak) : undefined,
                totalEnd: ed.local.contacts.totalEnd ? new Date(ed.local.contacts.totalEnd) : undefined,
                partialEnd: ed.local.contacts.partialEnd ? new Date(ed.local.contacts.partialEnd) : undefined,
              },
              maxState: ed.local.maxState
                ? { ...ed.local.maxState, t: new Date(ed.local.maxState.t), elements: { ...ed.local.maxState.elements, t: new Date(ed.local.maxState.elements.t) } }
                : null,
            },
          }))
          setResult({ eclipses: rehydrated as EngineResult['eclipses'], startDate: new Date(data.startIso), country: data.country })
          setLoading(false)
          setProgress(null)
          setStale(false)
        } else if (data.type === 'error') {
          worker.removeEventListener('message', onMessage)
          worker.removeEventListener('error', onError)
          if (calcId.current !== id) return
          setError(data.message)
          setLoading(false)
          setProgress(null)
          setStale(false)
        }
      }
      const onError = (ev: ErrorEvent) => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        if (calcId.current !== id) return
        setError(ev.message || 'Error en el Worker')
        setLoading(false)
        setProgress(null)
        setStale(false)
      }
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      worker.postMessage({ id, startIso: start.toISOString(), country: c, count: 15 })
      return
    }

    // Fallback: cálculo en el hilo principal con cesión al event loop
    try {
      const res = await computeEclipsesAsync(start, c, 15, (done, total) => {
        if (calcId.current === id) setProgress({ done, total })
      })
      if (calcId.current !== id) return
      setResult(res)
    } catch (err) {
      if (calcId.current !== id) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (calcId.current === id) {
        setLoading(false)
        setProgress(null)
        setStale(false)
      }
    }
  }, [])

  // P1.11 · cálculo inicial + auto-cálculo con debounce: al arrancar se
  // calcula con un pequeño retardo; al cambiar fecha o país se espera un
  // poco (450 ms) por si el usuario sigue tocando, y luego se recalcula.
  useEffect(() => {
    if (!firstRun.current) setStale(true)
    const delay = firstRun.current ? 200 : 450
    firstRun.current = false
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void runCalc(date, country)
    }, delay)
    return () => window.clearTimeout(debounceRef.current)
  }, [date, country, runCalc])

  // El botón "Calcular eclipses" fuerza el cálculo sin esperar el debounce.
  const manualCalculate = () => {
    window.clearTimeout(debounceRef.current)
    void runCalc(date, country)
  }

  // P0.4 · navegación de pestañas con teclado: flechas izquierda/derecha
  // para moverse entre pestañas, Inicio/Fin para ir a la primera/última.
  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    const order: TabId[] = ['saros', 'besselian']
    const idx = order.indexOf(tab)
    let next: TabId | null = null
    if (e.key === 'ArrowRight') next = order[(idx + 1) % order.length]
    else if (e.key === 'ArrowLeft') next = order[(idx - 1 + order.length) % order.length]
    else if (e.key === 'Home') next = order[0]
    else if (e.key === 'End') next = order[order.length - 1]
    if (next) {
      e.preventDefault()
      setTab(next)
      document.getElementById(`tab-${next}`)?.focus()
    }
  }

  // Definición de las dos pestañas: su identificador, etiqueta y subtítulo.
  const tabs: { id: TabId; label: string; hint: string }[] = [
    { id: 'saros', label: 'Ciclo de Saros', hint: 'fechas aproximadas y familias' },
    { id: 'besselian', label: 'Elementos Besselianos', hint: 'cálculo completo y circunstancias' },
  ]

  // Cuenta cuántos eclipses son visibles desde el país elegido (para el resumen).
  const visibleInCountry = result?.eclipses.filter((e) => e.local.visible).length ?? 0

  // --- Interfaz visible (JSX) ---
  // El fondo con estrellas, el enlace de accesibilidad "Saltar al contenido"
  // (para que lectores de pantalla vayan directos al contenido) y la cabecera.
  return (
    <div className="starfield relative min-h-screen">
      {/* Enlace oculto que aparece solo al recibir foco (accesibilidad). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:border focus:border-solar-500/50 focus:bg-space-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-solar-300"
      >
        Saltar al contenido
      </a>
      {/* Brillo decorativo central (no interactivo). */}
      <div className="pointer-events-none fixed inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden="true" />

      <header className="relative mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-solar-500/30 to-corona-500/30 ring-1 ring-white/15">
              <div className="absolute h-9 w-9 rounded-full bg-gradient-to-br from-solar-400 to-solar-600 shadow-[0_0_30px_rgba(249,115,22,0.55)]" />
              <div className="absolute h-4 w-4 rounded-full bg-space-950" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                <span className="text-gradient-solar">EclipseScope</span>
              </h1>
              <p className="text-sm text-slate-300">
                Calculador de eclipses solares · ciclos de Saros y elementos besselianos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              {flag(country.code)} {country.name} · {country.capital}
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              aria-expanded={helpOpen}
              className="touch-target rounded-full border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:border-solar-500/50 hover:text-solar-300"
            >
              {helpOpen ? 'Ocultar ayuda' : '¿Cómo funciona?'}
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="relative mx-auto max-w-7xl space-y-5 px-4 pb-16 sm:px-6">
        {/* Controles: fecha, país y botón de calcular. */}
        <Controls
          date={date}
          onDate={setDate}
          country={country}
          onCountry={setCountry}
          onCalculate={manualCalculate}
          loading={loading}
          stale={stale && !loading}
        />

        {/* Panel de ayuda "¿Cómo funciona?" (se despliega con el botón del encabezado). */}
        {helpOpen && (
          <section
            className="glass rounded-2xl p-4 sm:p-5"
            aria-label="Cómo funciona EclipseScope"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-100">Cómo funciona</h2>
            <div className="grid gap-4 text-xs leading-relaxed text-slate-300 md:grid-cols-3">
              <div>
                <p className="mb-1 font-semibold text-solar-400">Ciclo de Saros</p>
                <p>
                  Cada ~18 años, 11 días y 8 horas (6585,32 días) un eclipse solar se repite con
                  geometría casi idéntica: es la misma <em>familia de Saros</em>. Esta vista muestra
                  los próximos eclipses con su número de Saros y, al expandir cada fila, la serie
                  completa de esa familia.
                </p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-solar-400">Elementos besselianos</p>
                <p>
                  Cálculo físico en tu navegador: efemérides del Sol y la Luna (astronomy-engine),
                  plano fundamental, conos de penumbra y umbra, y la intersección del eje de sombra
                  con el elipsoide WGS84 para dibujar la trayectoria.
                </p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-solar-400">Tu ubicación</p>
                <p>
                  Elige tu país; las circunstancias locales (contactos, magnitud, oscurecimiento,
                  altitud del Sol) se calculan para su capital. Cambia la fecha para proyectar
                  eclipses desde otro momento.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Mensaje de error (si el cálculo falló), anunciado a los lectores de pantalla. */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* P0.4 · tabs ARIA: pestañas para elegir entre "Ciclo de Saros" y "Elementos Besselianos". */}
        <div
          role="tablist"
          aria-label="Método de cálculo"
          onKeyDown={onTabsKeyDown}
          className="flex gap-1 rounded-2xl border border-white/10 bg-space-900/50 p-1.5 backdrop-blur-xl"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-left transition ${
                tab === t.id
                  ? 'bg-gradient-to-r from-solar-500/20 to-corona-500/15 ring-1 ring-solar-500/30'
                  : 'hover:bg-white/5'
              }`}
            >
              <span className={`block text-sm font-semibold ${tab === t.id ? 'text-solar-300' : 'text-slate-300'}`}>
                {t.label}
              </span>
              <span className="block text-xs text-slate-400">{t.hint}</span>
            </button>
          ))}
        </div>

        {/* P1.8/1.13 · progreso + feedback (región aria-live):
            mientras se calcula muestra una barra de progreso "eclipse X de 15";
            al terminar, un resumen con cuántos son visibles desde el país. */}
        <div
          role="status"
          aria-live="polite"
          className={loading || (result && !error) ? 'block' : 'hidden'}
        >
          {loading && (
            <div className="glass rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>
                  Calculando eclipse {progress?.done ?? 0} de {progress?.total ?? 15}…
                </span>
                <span className="num text-xs text-slate-400">
                  {progress ? Math.round((progress.done / progress.total) * 100) : 0}%
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-space-700/60"
                role="progressbar"
                aria-valuenow={progress ? Math.round((progress.done / progress.total) * 100) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso del cálculo"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-solar-500 to-corona-500 transition-all"
                  style={{ width: `${progress ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {!loading && result && (
            <p className="text-xs text-slate-400">
              Se muestran {result.eclipses.length} eclipses · {visibleInCountry} visibles desde{' '}
              {flag(country.code)} {country.name}
            </p>
          )}
        </div>

        {/* P1.9 · skeletons mientras calcula: mientras tarda, se muestran
            "huesos" (skeletons) que imitan las tablas/tarjetas finales. */}
        {loading && (
          <div role="region" aria-busy="true" aria-label="Cargando resultados">
            <div className="hidden sm:block">
              <TableSkeleton rows={6} cols={7} />
            </div>
            <div className="sm:hidden">
              <CardsSkeleton rows={5} />
            </div>
          </div>
        )}

        {/* Resultados: la línea de tiempo y las dos pestañas. Los contenedores
            de las pestañas (tabpanel) siempre existen en el HTML para que los
            lectores de pantalla puedan navegar por ellas con aria-controls. */}
        {!loading && result && <EclipseTimeline eclipses={result.eclipses} country={result.country} />}
        <div
          role="tabpanel"
          id="panel-saros"
          aria-labelledby="tab-saros"
          hidden={loading || tab !== 'saros'}
        >
          {!loading && result && tab === 'saros' && (
            <SarosPanel eclipses={result.eclipses} country={result.country} />
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-besselian"
          aria-labelledby="tab-besselian"
          hidden={loading || tab !== 'besselian'}
        >
          {!loading && result && tab === 'besselian' && (
            <BesselianPanel eclipses={result.eclipses} country={result.country} />
          )}
        </div>
      </main>

      {/* Pie de página con las notas técnicas. */}
      <footer className="relative mx-auto max-w-7xl px-4 pb-10 text-center text-xs text-slate-400 no-print sm:px-6">
        Cálculos en tu navegador con astronomy-engine (efemérides Sol/Luna) y modelo elipsoidal WGS84.
        Tiempos de contacto ~1 min frente a catálogos de la NASA. Datos de países: capital y huso IANA.
      </footer>
    </div>
  )
}
