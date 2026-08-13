// ============================================================
// Componentes pequeños (badges, chips y cabeceras) reutilizados por
// las pestañas Saros y Besselianos para mostrar tipo, Saros, nodo,
// visibilidad, filtros y ordenación.
// ============================================================

import type { GlobalKind } from '../core/engine'
import type { LocalKind } from '../core/localCircumstances'
import { KIND_CLASSES, KIND_LABEL } from '../lib/labels'

// Etiqueta de color con el tipo global del eclipse (Total/Anular/Híbrido/Parcial).
export function TypeBadge({ kind, small = false }: { kind: GlobalKind; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${KIND_CLASSES[kind]} ${small ? '' : ''}`}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

/** Paleta estable por familia de Saros. */
const SAROS_PALETTE = [
  '#f97316', '#f59e0b', '#a3e635', '#34d399', '#22d3ee', '#818cf8',
  '#c084fc', '#f472b6', '#fb7185', '#38bdf8', '#4ade80', '#e879f9',
  '#fbbf24', '#2dd4bf', '#60a5fa', '#fda4af', '#a78bfa', '#facc15',
]

function sarosColor(saros: number): string {
  return SAROS_PALETTE[((saros % SAROS_PALETTE.length) + SAROS_PALETTE.length) % SAROS_PALETTE.length]
}

// Chip con el número de Saros, coloreado según la familia (paleta estable).
export function SarosChip({ saros }: { saros: number }) {
  const color = sarosColor(saros)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold num"
      style={{
        color,
        borderColor: `${color}55`,
        background: `${color}14`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {saros}
    </span>
  )
}

// Badge "Visible"/"No visible" desde el país elegido (con motivo opcional).
export function VisibleBadge({ visible, reason }: { visible: boolean; reason?: string }) {
  if (visible) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        Visible
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full border border-slate-600/40 bg-slate-700/20 px-2.5 py-0.5 text-xs font-medium text-slate-400"
      title={reason}
    >
      No visible
    </span>
  )
}

// Chip del nodo lunar: ascendente (↑ Asc.) o descendente (↓ Desc.).
export function NodeChip({ node }: { node: 'ascending' | 'descending' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300">
      {node === 'ascending' ? '↑ Asc.' : '↓ Desc.'}
    </span>
  )
}

// Badge del tipo local de eclipse (el que se vería en la capital del país).
export function LocalKindBadge({ kind }: { kind: LocalKind }) {
  const map: Record<LocalKind, { label: string; cls: string }> = {
    total: { label: 'Total', cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/40' },
    annular: { label: 'Anular', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/40' },
    partial: { label: 'Parcial', cls: 'bg-sky-500/15 text-sky-300 border border-sky-500/40' },
    none: { label: 'Sin eclipse', cls: 'bg-slate-600/20 text-slate-400 border border-slate-600/40' },
  }
  const m = map[kind]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Filtro por tipo (segmented control) y cabeceras ordenables
// ---------------------------------------------------------------------------

export type TypeFilterValue = 'all' | GlobalKind

const TYPE_OPTIONS: { value: TypeFilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'total', label: 'Total' },
  { value: 'annular', label: 'Anular' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'partial', label: 'Parcial' },
]

// Filtro por tipo de eclipse: un grupo de botones con "Todos/Total/Anular/...".
export function TypeFilter({
  value,
  onChange,
}: {
  value: TypeFilterValue
  onChange: (v: TypeFilterValue) => void
}) {
  return (
    <div role="group" aria-label="Filtrar por tipo de eclipse" className="flex flex-wrap gap-1.5">
      {TYPE_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`touch-target rounded-full border px-3 py-1 text-xs font-semibold transition ${
            value === o.value
              ? 'border-solar-500/50 bg-solar-500/15 text-solar-300'
              : 'border-white/10 bg-space-900/50 text-slate-400 hover:border-white/25 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export type SortDir = 'asc' | 'desc'

export interface SortState {
  key: string
  dir: SortDir
}

// Cabecera de columna ordenable: al pulsarla alterna asc/desc y muestra
// una flecha, además de anunciar el estado de ordenación a los lectores
// de pantalla mediante aria-sort.
export function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: string
  sort: SortState
  onSort: (k: string) => void
  align?: 'left' | 'right'
}) {
  const active = sort.key === sortKey
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-solar-300 ${
          active ? 'text-solar-300' : 'text-slate-400'
        }`}
      >
        {label}
        <svg
          aria-hidden="true"
          className={`h-3 w-3 transition ${active ? 'opacity-100' : 'opacity-30'} ${active && sort.dir === 'asc' ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7-7-7" />
        </svg>
      </button>
    </th>
  )
}
