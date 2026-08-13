// ============================================================
// Etiquetas y estilos de los cuatro tipos de eclipse solar.
// ============================================================

import type { GlobalKind } from '../core/engine'

// Nombre visible de cada tipo de eclipse.
export const KIND_LABEL: Record<GlobalKind, string> = {
  total: 'Total',
  annular: 'Anular',
  hybrid: 'Híbrido',
  partial: 'Parcial',
}

// Clases CSS (Tailwind) que dan color a cada tipo en las insignias.
export const KIND_CLASSES: Record<GlobalKind, string> = {
  total: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.45)]',
  annular: 'bg-amber-500/15 text-amber-300 border border-amber-500/40',
  hybrid: 'bg-violet-500/15 text-violet-300 border border-violet-500/40',
  partial: 'bg-slate-500/15 text-slate-300 border border-slate-500/40',
}
