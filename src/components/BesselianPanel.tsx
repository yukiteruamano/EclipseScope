import { useMemo, useState } from 'react'
import type { EclipseData } from '../core/engine'
import type { Country } from '../data/countries'
import { formatUTC, formatTimeLocal, formatLat, formatLon, formatDuration } from '../lib/time'
import { exportCsv, exportJson } from '../lib/export'
import { useEscape } from '../lib/keyboard'
import {
  TypeBadge,
  SarosChip,
  VisibleBadge,
  LocalKindBadge,
  TypeFilter,
  SortableHeader,
  type SortState,
  type TypeFilterValue,
} from './badges'

// ============================================================
// Pestaña "Elementos Besselianos": el cálculo físico completo de cada
// eclipse. Al expandir una fila se muestran las circunstancias locales
// en la capital del país, los elementos besselianos del máximo y la
// trayectoria (línea central) sobre un minimapa del mundo.
// ============================================================

function flag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

// Igual que en SarosPanel: ordena la lista según la columna elegida.
function sortEclipses(list: EclipseData[], sort: SortState): EclipseData[] {
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    switch (sort.key) {
      case 'saros':
        return (a.saros - b.saros) * dir
      case 'gamma':
        return (a.gamma - b.gamma) * dir
      case 'mag':
        return (a.local.maxMagnitude - b.local.maxMagnitude) * dir
      default:
        return (+a.peak - +b.peak) * dir
    }
  })
}

interface Props {
  eclipses: EclipseData[]
  country: Country
}

export default function BesselianPanel({ eclipses, country }: Props) {
  // Estado local: fila expandida, orden y filtro por tipo.
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [sort, setSort] = useState<SortState>({ key: 'date', dir: 'asc' })
  const [filter, setFilter] = useState<TypeFilterValue>('all')

  // Escape cierra el detalle expandido.
  useEscape(openIdx !== null, () => setOpenIdx(null))

  // Próximo eclipse visible desde el país (para el resumen superior).
  const nextVisible = eclipses.find((e) => e.local.visible)
  const nextVisiblePeak = nextVisible?.peak

  // Filas finales tras filtro + orden.
  const rows = useMemo(
    () => sortEclipses(eclipses.filter((e) => filter === 'all' || e.kind === filter), sort),
    [eclipses, filter, sort],
  )

  const onSort = (k: string) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' }))

  const toggle = (i: number) => setOpenIdx((cur) => (cur === i ? null : i))

  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="besselian-summary">
        {nextVisible ? (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Próximo eclipse en tu país
              </p>
              <p className="text-lg font-bold text-gradient-solar">{formatUTC(nextVisible.peak)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Tipo local</p>
              <div className="mt-1">
                <LocalKindBadge kind={nextVisible.local.kind} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Magnitud</p>
              <p className="num text-lg font-bold text-slate-100">{nextVisible.local.maxMagnitude.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Oscurecimiento</p>
              <p className="num text-lg font-bold text-emerald-300">
                {Math.round(nextVisible.local.obscuration * 100)}%
              </p>
            </div>
            <p className="ml-auto max-w-md text-xs leading-relaxed text-slate-400">
              Elementos besselianos calculados en cliente con{' '}
              <span className="font-semibold text-slate-100">astronomy-engine</span>: efemérides
              Sol/Luna, plano fundamental, conos de penumbra y umbra, y elipsoide WGS84. Tolerancia de
              tiempos de contacto ≈ 1 min frente a referencias NASA.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-slate-300">
              Ninguno de los próximos {eclipses.length} eclipses será visible desde{' '}
              {flag(country.code)} {country.name} ({country.capital}).
            </p>
            <p className="ml-auto max-w-md text-xs leading-relaxed text-slate-400">
              Elementos besselianos calculados en cliente con astronomy-engine (elipsoide WGS84).
              Tolerancia de tiempos de contacto ≈ 1 min frente a referencias NASA.
            </p>
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TypeFilter value={filter} onChange={setFilter} />
          <div className="flex items-center gap-2 no-print">
            <span className="text-xs text-slate-400" aria-live="polite">
              {rows.length} de {eclipses.length}
            </span>
            <button
              type="button"
              onClick={() => exportCsv(rows)}
              className="touch-target rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:border-corona-500/50 hover:text-corona-300"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportJson(rows)}
              className="touch-target rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:border-corona-500/50 hover:text-corona-300"
            >
              JSON
            </button>
          </div>
        </div>
      </section>

      {/* Vista móvil: tarjetas apiladas (solo en pantallas pequeñas). */}
      <div className="space-y-3 sm:hidden" aria-label="Lista de eclipses">
        {rows.map((e, i) => {
          const open = openIdx === i
          const isNext = nextVisiblePeak && +e.peak === +nextVisiblePeak
          const { local } = e
          return (
            <article
              key={e.peak.getTime()}
              className={`glass rounded-2xl p-4 ${isNext ? 'ring-1 ring-emerald-500/40' : ''}`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {isNext && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                        Próximo
                      </span>
                    )}
                    <span className="font-semibold text-slate-100">{formatUTC(e.peak)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatTimeLocal(e.peak, country.tz)} local
                  </div>
                </div>
                <TypeBadge kind={e.kind} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[11px] text-slate-400">Saros</div>
                  <SarosChip saros={e.saros} />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">γ · punto máx.</div>
                  <div className="num text-slate-200">
                    {e.gamma.toFixed(3)} · {formatLat(e.greatestLat)} {formatLon(e.greatestLon)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Local</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <LocalKindBadge kind={local.kind} />
                    <VisibleBadge visible={local.visible} />
                  </div>
                </div>
                {local.kind !== 'none' && (
                  <div>
                    <div className="text-[11px] text-slate-400">Magnitud / osc.</div>
                    <div className="num text-slate-200">
                      {local.maxMagnitude.toFixed(3)} ·{' '}
                      <span className="text-emerald-300">{Math.round(local.obscuration * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={open}
                aria-controls={`bess-card-detail-${i}`}
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-corona-500/50 hover:text-corona-300"
              >
                {open ? 'Cerrar detalle' : 'Ver detalle besseliano'}
                <Chevron open={open} />
              </button>
              {open && (
                <div id={`bess-card-detail-${i}`} className="mt-3">
                  <BesselianDetail e={e} country={country} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Vista de escritorio: tabla clásica (≥sm). */}
      <div className="glass hidden overflow-hidden rounded-2xl sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-space-950/40 text-[11px] uppercase tracking-wider">
                <SortableHeader label="Máxima global" sortKey="date" sort={sort} onSort={onSort} />
                <th scope="col" className="px-4 py-3 font-semibold text-slate-400">Tipo</th>
                <SortableHeader label="Saros" sortKey="saros" sort={sort} onSort={onSort} />
                <SortableHeader label="γ" sortKey="gamma" sort={sort} onSort={onSort} align="right" />
                <th scope="col" className="px-4 py-3 font-semibold text-slate-400">Punto máximo</th>
                <SortableHeader label="En país" sortKey="mag" sort={sort} onSort={onSort} />
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => {
                const open = openIdx === i
                const isNext = nextVisiblePeak && +e.peak === +nextVisiblePeak
                return (
                  <EclipseRow
                    key={e.peak.getTime()}
                    e={e}
                    country={country}
                    open={open}
                    isNext={!!isNext}
                    toggle={() => toggle(i)}
                    detailId={`bess-table-detail-${i}`}
                    colSpan={7}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function EclipseRow({
  e,
  country,
  open,
  isNext,
  toggle,
  detailId,
  colSpan,
}: {
  e: EclipseData
  country: Country
  open: boolean
  isNext: boolean
  toggle: () => void
  detailId: string
  colSpan: number
}) {
  const { local } = e
  return (
    <>
      <tr
        onClick={toggle}
        className={`cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03] ${isNext ? 'bg-emerald-500/[0.04]' : ''}`}
      >
        <td className="px-4 py-3 align-top">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            {isNext && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                Próximo
              </span>
            )}
            {formatUTC(e.peak)}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">{formatTimeLocal(e.peak, country.tz)} local</div>
        </td>
        <td className="px-4 py-3 align-top">
          <TypeBadge kind={e.kind} />
        </td>
        <td className="px-4 py-3 align-top">
          <SarosChip saros={e.saros} />
        </td>
        <td className="num px-4 py-3 text-right align-top text-slate-200">{e.gamma.toFixed(3)}</td>
        <td className="num px-4 py-3 align-top text-slate-200">
          {formatLat(e.greatestLat)} · {formatLon(e.greatestLon)}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-wrap items-center gap-2">
            <LocalKindBadge kind={local.kind} />
            <VisibleBadge visible={local.visible} />
          </div>
          {local.kind !== 'none' && (
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-400">
              <div>
                mag. <span className="num text-slate-200">{local.maxMagnitude.toFixed(3)}</span> · osc.{' '}
                <span className="num text-emerald-300">{Math.round(local.obscuration * 100)}%</span>
              </div>
              {local.centralDurationSec !== null && (
                <div>
                  duración <span className="num text-orange-300">{formatDuration(local.centralDurationSec)}</span>
                </div>
              )}
              <div>
                Sol a <span className="num text-slate-200">{local.sunAltitudeAtMax.toFixed(1)}°</span> en el máximo
              </div>
            </div>
          )}
        </td>
        <td className="px-3 py-3 text-right align-top">
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation()
              toggle()
            }}
            aria-expanded={open}
            aria-controls={detailId}
            className="inline-flex touch-target items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-slate-300 transition hover:border-corona-500/50 hover:text-corona-300"
          >
            {open ? 'Cerrar' : 'Detalle'}
            <Chevron open={open} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/5 bg-space-950/30">
          <td colSpan={colSpan} className="px-4 py-5">
            <div id={detailId}>
              <BesselianDetail e={e} country={country} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// Detalle expandido de un eclipse besseliano: circunstancias locales,
// elementos besselianos y la línea central con su minimapa.
function BesselianDetail({ e, country }: { e: EclipseData; country: Country }) {
  const { local, elements } = e
  const c = local.contacts
  const path = e.centralLine
  const pathStart = path.length > 0 ? path[0] : null
  const pathEnd = path.length > 0 ? path[path.length - 1] : null
  const pathDur = pathStart && pathEnd ? (+pathEnd.t - +pathStart.t) / 1000 : null

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Columna izquierda: circunstancias locales y elementos besselianos. */}
      <div className="space-y-5">
        <section aria-labelledby={`bess-local-${+e.peak}`}>
          <h3
            id={`bess-local-${+e.peak}`}
            className="mb-2 text-xs font-semibold uppercase tracking-widest text-solar-400"
          >
            Circunstancias locales · {flag(country.code)} {country.capital}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Inicio parcial (P1)" value={c.partialBegin ? fmt(c.partialBegin, country.tz) : '—'} />
            <Stat label="Inicio total/anular (C2)" value={c.totalBegin ? fmt(c.totalBegin, country.tz) : '—'} />
            <Stat label="Máximo" value={c.peak ? fmt(c.peak, country.tz) : '—'} />
            <Stat label="Fin total/anular (C3)" value={c.totalEnd ? fmt(c.totalEnd, country.tz) : '—'} />
            <Stat label="Fin parcial (P4)" value={c.partialEnd ? fmt(c.partialEnd, country.tz) : '—'} />
            <Stat label="Duración central" value={formatDuration(local.centralDurationSec)} />
            <Stat label="Magnitud" value={local.kind === 'none' ? '—' : local.maxMagnitude.toFixed(3)} />
            <Stat label="Oscurecimiento" value={local.kind === 'none' ? '—' : `${Math.round(local.obscuration * 100)}%`} />
            <Stat label="Altitud del Sol" value={local.kind === 'none' ? '—' : `${local.sunAltitudeAtMax.toFixed(1)}°`} />
          </div>
        </section>

        <section aria-labelledby={`bess-el-${+e.peak}`}>
          <h3
            id={`bess-el-${+e.peak}`}
            className="mb-2 text-xs font-semibold uppercase tracking-widest text-solar-400"
          >
            Elementos besselianos en el máximo
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="x" value={elements.x.toFixed(5)} mono />
            <Stat label="y" value={elements.y.toFixed(5)} mono />
            <Stat label="d" value={`${elements.d.toFixed(3)}°`} mono />
            <Stat label="u" value={`${elements.u.toFixed(3)}°`} mono />
            <Stat label="l1 (penumbra)" value={`${elements.l1.toFixed(5)}`} mono />
            <Stat label="l2 (umbra)" value={`${elements.l2.toFixed(5)}`} mono />
            <Stat label="f1" value={`${elements.f1.toFixed(6)} rad`} mono />
            <Stat label="f2" value={`${elements.f2.toFixed(6)} rad`} mono />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            x,y en radios ecuatoriales terrestres sobre el plano fundamental; d declinación del eje; u
            ángulo horario del eje en Greenwich; l1/l2 radios de penumbra/umbra en el plano
            fundamental; f1/f2 medio-ángulos de los conos.
          </p>
        </section>
      </div>

      {/* Columna derecha: la línea central (trayectoria) con su minimapa. */}
      <section aria-labelledby={`bess-line-${+e.peak}`}>
        <h3 id={`bess-line-${+e.peak}`} className="mb-2 text-xs font-semibold uppercase tracking-widest text-corona-400">
          Línea central
        </h3>
        {path.length > 0 ? (
          <>
            <PathMiniMap points={path} countryLat={country.lat} countryLon={country.lon} />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Inicio" value={pathStart ? `${formatLat(pathStart.lat)} ${formatLon(pathStart.lon)}` : '—'} small />
              <Stat label="Final" value={pathEnd ? `${formatLat(pathEnd.lat)} ${formatLon(pathEnd.lon)}` : '—'} small />
              <Stat label="Duración rastro" value={formatDuration(pathDur)} small />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {path.length} puntos (cada ~2 min) donde el eje de la sombra cruza el elipsoide WGS84.
              Tipo global: <span className="text-slate-200">{e.kind}</span>; máxima magnitud global en{' '}
              <span className="num text-slate-200">{formatLat(e.greatestLat)} · {formatLon(e.greatestLon)}</span>.
            </p>
          </>
        ) : (
          <p className="rounded-xl border border-white/5 bg-space-900/50 p-4 text-xs text-slate-400">
            Eclipse parcial: el eje de la sombra no alcanza la superficie terrestre. La penumbra barre
            parte de la Tierra sin línea central.
          </p>
        )}
      </section>
    </div>
  )
}

/**
 * Minimapa equirrectangular interactivo: capital del país marcada, tooltip por
 * punto y segmentos diferenciados (total naranja / anular ámbar).
 */
function PathMiniMap({
  points,
  countryLat,
  countryLon,
  width = 480,
  height = 200,
}: {
  points: { t?: Date; lat: number; lon: number; total?: boolean }[]
  countryLat: number
  countryLon: number
  width?: number
  height?: number
}) {
  if (points.length === 0) return <p className="text-xs text-slate-400">Sin línea central (eclipse parcial).</p>
  // El mapa es "equirrectangular": se reparte la longitud (−180…180) en el
  // eje X y la latitud (−85…85) en el eje Y, como un planisferio clásico.
  const minLon = -180
  const maxLon = 180
  const minLat = -85
  const maxLat = 85
  const x = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * height

  // Segmentos de la línea: se agrupan los puntos consecutivos del mismo tipo
  // (total = naranja, anular = ámbar) para dibujar un solo trazo por tramo.
  const segments: { d: string; color: string }[] = []
  let cur = points[0]
  let curColor = points[0].total === false ? '#f59e0b' : '#f97316'
  for (let i = 1; i < points.length; i++) {
    const color = points[i].total === false ? '#f59e0b' : '#f97316'
    if (color !== curColor) {
      segments.push({ d: pathString(cur, points[i - 1], x, y), color: curColor })
      cur = points[i - 1]
      curColor = color
    }
  }
  segments.push({ d: pathString(cur, points[points.length - 1], x, y), color: curColor })

  // Posición de la capital del país sobre el mapa (para marcarla en cian).
  const capX = x(countryLon)
  const capY = y(countryLat)

  return (
    <figure className="w-full rounded-xl border border-white/10 bg-space-950/60">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Trayectoria del eclipse sobre el mundo">
        {/* Retícula de latitud/longitud decorativa. */}
        {[-60, -20, 20, 60].map((lat) => (
          <line key={lat} x1={0} y1={y(lat)} x2={width} y2={y(lat)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {[-120, -60, 0, 60, 120].map((lon) => (
          <line key={lon} x1={x(lon)} y1={0} x2={x(lon)} y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 5px rgba(249,115,22,0.55))' }}
          >
            <title>Línea central del eclipse</title>
          </path>
        ))}
        {/* capital del país */}
        <circle cx={capX} cy={capY} r="4" fill="#22d3ee" stroke="#0b1022" strokeWidth="1.5">
          <title>Tu país</title>
        </circle>
        {/* puntos con tooltip nativo */}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.lon)} cy={y(p.lat)} r="1.6" fill="rgba(255,255,255,0.55)">
            <title>{p.t ? new Date(p.t).toISOString().slice(0, 16) : ''}Z · {formatLat(p.lat)} {formatLon(p.lon)}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-3 border-t border-white/5 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: '#f97316' }} /> total
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: '#f59e0b' }} /> anular
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" /> tu país
        </span>
      </figcaption>
    </figure>
  )
}

function pathString(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  x: (lon: number) => number,
  y: (lat: number) => number,
): string {
  return `M${x(a.lon).toFixed(1)},${y(a.lat).toFixed(1)}L${x(b.lon).toFixed(1)},${y(b.lat).toFixed(1)}`
}

function fmt(d: Date, tz: string): string {
  return `${formatUTC(d)} · ${formatTimeLocal(d, tz)}`
}

// Pequeño recuadro con una etiqueta y un valor (se usa en las tablas de datos).
function Stat({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-space-900/60 px-3 ${small ? 'py-1.5' : 'py-2'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`${mono ? 'num' : ''} text-xs font-semibold text-slate-100`}>{value}</div>
    </div>
  )
}
