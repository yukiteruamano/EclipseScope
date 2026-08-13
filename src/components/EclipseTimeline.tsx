import type { EclipseData } from '../core/engine'
import type { Country } from '../data/countries'
import { KIND_LABEL } from '../lib/labels'
import { formatUTCDate } from '../lib/time'

// Color de cada tipo de eclipse en la línea de tiempo.
const DOT: Record<string, string> = {
  total: '#f97316', // naranja
  annular: '#f59e0b', // ámbar
  hybrid: '#a78bfa', // violeta
  partial: '#64748b', // gris
}

/**
 * Línea de tiempo horizontal de los próximos eclipses: marcadores por tipo,
 * rellenos si son visibles desde el país, con tooltip.
 */
export default function EclipseTimeline({ eclipses, country }: { eclipses: EclipseData[]; country: Country }) {
  if (eclipses.length === 0) return null
  return (
    <div className="glass rounded-2xl p-4">
      {/* Cabecera con la leyenda de colores. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">Próximos eclipses</h2>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400" aria-hidden="true">
          {(['total', 'annular', 'hybrid', 'partial'] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOT[k] }} />
              {KIND_LABEL[k]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-white/40" />
            contorno = no visible
          </span>
        </div>
      </div>
      {/* Lista horizontal de puntos: cada uno es un eclipse. Relleno = visible
          desde el país; contorno = no visible. Al pasar el ratón aparece un
          tooltip con el tipo y la fecha. */}
      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Línea de tiempo de eclipses">
        {eclipses.map((e, i) => {
          const visible = e.local.visible
          const color = DOT[e.kind] ?? '#64748b'
          return (
            <li key={i} className="group relative flex shrink-0 flex-col items-center px-1 pt-2">
              {/* Tooltip que aparece al pasar el ratón. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-0 left-1/2 z-10 hidden w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-space-850 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-xl group-hover:block"
              >
                <span className="font-semibold">{KIND_LABEL[e.kind]}</span>
                {visible && <span className="text-emerald-300"> · visible desde {country.name}</span>}
                <span className="block">{formatUTCDate(e.peak)}</span>
              </span>
              {/* El punto en sí. */}
              <span
                className={`h-3 w-3 rounded-full transition-transform group-hover:scale-125 ${visible ? '' : 'border-2'}`}
                style={{ background: visible ? color : 'transparent', borderColor: color }}
                title={`${KIND_LABEL[e.kind]} · ${formatUTCDate(e.peak)}${visible ? ' · visible' : ''}`}
              />
              {/* Año y fecha abreviada bajo cada punto. */}
              <span className="mt-1.5 whitespace-nowrap text-[10px] text-slate-400">
                {e.peak.getUTCFullYear()}
              </span>
              <span className="whitespace-nowrap text-[10px] text-slate-500">
                {formatUTCDate(e.peak).split(' ').slice(0, 2).join(' ')}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
