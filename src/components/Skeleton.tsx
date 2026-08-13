// ============================================================
// "Skeletons": cargas provisionales que imitan la forma de la tabla
// y de las tarjetas mientras el cálculo está en marcha. Hacen que la
// interfaz no "salte" al llegar los datos reales.
// ============================================================

/** Skeleton que replica la estructura de las tablas mientras se calcula. */
export function TableSkeleton({ rows = 6, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm" aria-hidden="true">
          <thead>
            <tr className="border-b border-white/5 bg-space-950/40">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-20 animate-pulse rounded bg-space-700/60" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-white/5">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div
                      className="animate-pulse rounded bg-space-700/40"
                      style={{ width: `${45 + ((r + c * 3) % 5) * 10}%`, height: '14px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Skeleton en tarjetas (para la vista móvil). */
export function CardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-space-700/60" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-space-700/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, c) => (
              <div key={c} className="h-3 animate-pulse rounded bg-space-700/40" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
