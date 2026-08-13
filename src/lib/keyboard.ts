// ============================================================
// Utilidades relacionadas con el teclado.
// ============================================================

import { useEffect } from 'react'

/** Hook de React: cierra algo (panel expandido, menú…) con la tecla
 * Escape mientras `active` sea true. Es un "hook" porque usa efectos. */
export function useEscape(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, handler])
}
