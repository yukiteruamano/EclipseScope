import { useMemo, useState } from 'react'
import type { EclipseData } from '../core/engine'
import { eclipseFamily } from '../core/engine'
import type { Country } from '../data/countries'
import { formatUTC, formatLocal, formatRelative } from '../lib/time'
import { exportCsv, exportJson } from '../lib/export'
import { useEscape } from '../lib/keyboard'
import { SAROS_TEXT } from '../core/constants'
import {
  TypeBadge,
  SarosChip,
  NodeChip,
  VisibleBadge,
  TypeFilter,
  SortableHeader,
  type SortState,
  type TypeFilterValue,
} from './badges'

// ============================================================
// Pestaña "Ciclo de Saros": tabla/tarjetas con los próximos eclipses,
// su número de Saros y, al expandir cada fila, la serie completa de
// la familia (repetición cada 18 años 11 días 8 horas).
// ============================================================

function flag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

// Asigna a cada número de Saros un color de una paleta, para que la
// misma familia siempre se pinte igual. Se usa en el detalle expandido.
function familyColor(saros: number): string {
  const colors = ['#f97316', '#f59e0b', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#38bdf8', '#4ade80', '#e879f9']
  return colors[((saros % colors.length) + colors.length) % colors.length]
}

// Ordena la lista de eclipses según la columna elegida (fecha, saros,
// gamma o magnitud) y en la dirección indicada (ascendente/descendente).
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

export default function SarosPanel({ eclipses, country }: Props) {
  // openIdx: índice de la fila expandida (o null si ninguna lo está).
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  // Orden de la tabla y filtro por tipo de eclipse.
  const [sort, setSort] = useState<SortState>({ key: 'date', dir: 'asc' })
  const [filter, setFilter] = useState<TypeFilterValue>('all')

  // Si hay una fila expandida, la tecla Escape la cierra.
  useEscape(openIdx !== null, () => setOpenIdx(null))

  // Resumen: cuántos eclipses hay y cuál es el próximo visible desde el país.
  const visibleCount = eclipses.filter((e) => e.local.visible).length
  const nextVisiblePeak = eclipses.find((e) => e.local.visible)?.peak

  // Filas finales: se aplica el filtro de tipo y después el orden.
  const rows = useMemo(
    () => sortEclipses(eclipses.filter((e) => filter === 'all' || e.kind === filter), sort),
    [eclipses, filter, sort],
  )

  // Alterna entre ascendente/descendente al pulsar la misma columna.
  const onSort = (k: string) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' }))

  // Abre o cierra el detalle expandido de una fila.
  const toggle = (i: number) => setOpenIdx((cur) => (cur === i ? null : i))

  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="saros-summary">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Eclipses futuros</p>
            <p className="text-2xl font-bold num text-gradient-solar">{eclipses.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
              Visibles desde {flag(country.code)} {country.name}
            </p>
            <p className="text-2xl font-bold num text-emerald-300">{visibleCount}</p>
          </div>
          <p className="ml-auto max-w-md text-xs leading-relaxed text-slate-400">
            El ciclo de <span className="font-semibold text-slate-100">Saros</span> dura{' '}
            <span className="font-semibold text-solar-400">{SAROS_TEXT}</span> (6585,32 días): cada
            familia se repite con geometría casi idéntica. Números según catálogo NASA (impares en el
            nodo ascendente).
          </p>
        </div>
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
              className="touch-target rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:border-solar-500/50 hover:text-solar-300"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportJson(rows)}
              className="touch-target rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:border-solar-500/50 hover:text-solar-300"
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
                        Próximo visible
                      </span>
                    )}
                    <span className="font-semibold text-slate-100">{formatUTC(e.peak)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatLocal(e.peak, country.tz)} · {formatRelative(+e.peak - Date.now())}
                  </div>
                </div>
                <TypeBadge kind={e.kind} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-[11px] text-slate-400">Saros</div>
                  <SarosChip saros={e.saros} />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Nodo</div>
                  <NodeChip node={e.node} />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">γ</div>
                  <div className="num text-slate-200">{e.gamma.toFixed(3)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Magnitud máx.</div>
                  <div className="num text-slate-200">
                    {e.local.maxMagnitude > 0 ? e.local.maxMagnitude.toFixed(3) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Visibilidad</div>
                  <VisibleBadge visible={e.local.visible} />
                </div>
                {e.local.visible && (
                  <div>
                    <div className="text-[11px] text-slate-400">Oscurecimiento</div>
                    <div className="num text-emerald-300">{Math.round(e.local.obscuration * 100)}%</div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={open}
                aria-controls={`saros-card-detail-${i}`}
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-solar-500/50 hover:text-solar-300"
              >
                {open ? 'Cerrar familia' : 'Ver familia de Saros'}
                <Chevron open={open} />
              </button>
              {open && (
                <div id={`saros-card-detail-${i}`} className="mt-3">
                  <FamilyDetail e={e} country={country} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Vista de escritorio: tabla clásica (≥sm). */}
      <div className="glass hidden overflow-hidden rounded-2xl sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-space-950/40 text-[11px] uppercase tracking-wider">
                <SortableHeader label="Fecha" sortKey="date" sort={sort} onSort={onSort} />
                <th scope="col" className="px-4 py-3 font-semibold text-slate-400">Tipo</th>
                <SortableHeader label="Saros" sortKey="saros" sort={sort} onSort={onSort} />
                <th scope="col" className="px-4 py-3 font-semibold text-slate-400">Nodo</th>
                <SortableHeader label="γ" sortKey="gamma" sort={sort} onSort={onSort} align="right" />
                <SortableHeader label="Magnitud máx." sortKey="mag" sort={sort} onSort={onSort} align="right" />
                <th scope="col" className="px-4 py-3 font-semibold text-slate-400">Visibilidad</th>
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
                    detailId={`saros-table-detail-${i}`}
                    colSpan={8}
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

// Fila de la tabla de Saros. Al hacer clic se expande una fila extra
// (FamilyDetail) con la serie completa de la familia de Saros.
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
          <div className="mt-0.5 text-xs text-slate-400">
            {formatLocal(e.peak, country.tz)} · {formatRelative(+e.peak - Date.now())}
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <TypeBadge kind={e.kind} />
          {e.secondary && <div className="mt-1 text-xs text-slate-400">secundario de temporada</div>}
        </td>
        <td className="px-4 py-3 align-top">
          <SarosChip saros={e.saros} />
        </td>
        <td className="px-4 py-3 align-top">
          <NodeChip node={e.node} />
        </td>
        <td className="num px-4 py-3 text-right align-top text-slate-200">{e.gamma.toFixed(3)}</td>
        <td className="num px-4 py-3 text-right align-top text-slate-200">
          {e.local.maxMagnitude > 0 ? e.local.maxMagnitude.toFixed(3) : '—'}
        </td>
        <td className="px-4 py-3 align-top">
          <VisibleBadge visible={e.local.visible} />
          {e.local.visible && (
            <div className="mt-1 text-xs text-slate-400">osc. {Math.round(e.local.obscuration * 100)}%</div>
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
            className="inline-flex touch-target items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-slate-300 transition hover:border-solar-500/50 hover:text-solar-400"
          >
            {open ? 'Cerrar' : 'Familia'}
            <Chevron open={open} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/5 bg-space-950/30">
          <td colSpan={colSpan} className="px-4 py-4">
            <div id={detailId}>
              <FamilyDetail e={e} country={country} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// Detalle expandido de una fila: muestra las fechas en las que la misma
// familia de Saros se repite (ancla ± k·6585,32 días) y una breve leyenda.
function FamilyDetail({ e, country }: { e: EclipseData; country: Country }) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          {/* Punto de color identificativo de la familia. */}
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: familyColor(e.saros), boxShadow: `0 0 8px ${familyColor(e.saros)}` }}
          />
          Familia de Saros {e.saros}
        </h3>
        <span className="text-xs text-slate-400">
          repetición cada {SAROS_TEXT} · nodo {e.node === 'ascending' ? 'ascendente' : 'descendente'}
        </span>
      </div>
      {/* Cuadrícula con las fechas de la serie completa de la familia. */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {eclipseFamily(e.peak, e.saros).dates.map((d, j) => (
          <div key={j} className="rounded-xl border border-white/5 bg-space-900/60 px-3 py-2 text-xs text-slate-300">
            <div className="font-medium text-slate-100">{formatUTC(d)}</div>
            <div className="text-xs text-slate-400">{formatLocal(d, country.tz)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Fechas aproximadas: ancla {formatUTC(e.peak)} ± k·6585,32 días. Cada ciclo desplaza la
        trayectoria ~120° al oeste.
      </p>
    </>
  )
}
