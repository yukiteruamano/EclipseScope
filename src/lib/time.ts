// ============================================================
// Formateadores de fechas, horas, coordenadas, duraciones y
// distancias relativas (en español y usando el huso horario pedido).
// ============================================================

// Fecha en UTC (Tiempo Universal Coordinado): ej. "08 abr 2024".
export function formatUTCDate(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

// Hora en UTC: ej. "18:17:19".
export function formatUTCTime(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}

// Fecha + hora completas en UTC.
export function formatUTC(d: Date): string {
  return `${formatUTCDate(d)} · ${formatUTCTime(d)}`
}

// Fecha + hora en la zona horaria indicada (por ejemplo la del país).
export function formatLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}

// Solo la hora local en la zona horaria indicada.
export function formatTimeLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}

/** Formatea coordenadas: "25.29°N · 104.14°O" */
export function formatLat(lat: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  return `${Math.abs(lat).toFixed(2)}°${ns}`
}

export function formatLon(lon: number): string {
  const ew = lon >= 0 ? 'E' : 'O'
  return `${Math.abs(lon).toFixed(2)}°${ew}`
}

/** Duraciones humanas a partir de segundos: ej. "4m 32s" (o "—" si no hay). */
export function formatDuration(sec: number | null): string {
  if (sec === null || !isFinite(sec) || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function formatPercent(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`
}

/** Distancia desde hoy en texto amigable: "en 3 meses", "hace 1 año", etc.
 * Recibe la diferencia en milisegundos (negativa si fue en el pasado). */
export function formatRelative(ms: number): string {
  const days = Math.round(ms / (24 * 3600 * 1000))
  const abs = Math.abs(days)
  const label =
    abs < 2
      ? `${abs} día${abs === 1 ? '' : 's'}`
      : abs < 90
        ? `${abs} días`
        : abs < 730
          ? `${Math.round(abs / 30)} meses`
          : `${Math.round(abs / 365)} años`
  return days >= 0 ? `en ${label}` : `hace ${label}`
}
