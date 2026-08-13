// ============================================================
// Exportación de los resultados a CSV (hoja de cálculo) y a JSON
// (datos estructurados), así como la descarga del archivo en el
// navegador.
// ============================================================

import type { EclipseData } from '../core/engine'

// Escapa un valor para CSV: si contiene comas, comillas o saltos de línea,
// se envuelve entre comillas y las comillas internas se duplican (regla CSV).
function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(eclipses: EclipseData[]): string {
  const header = [
    'Fecha máxima (UTC)',
    'Tipo global',
    'Saros',
    'Gamma',
    'Lat. máxima',
    'Lon. máxima',
    'Tipo local',
    'Magnitud local',
    'Oscurecimiento %',
    'Altitud Sol (grados)',
    'Duración central (s)',
    'Inicio parcial (UTC)',
    'Fin parcial (UTC)',
    'Inicio total/anular (UTC)',
    'Fin total/anular (UTC)',
  ]
  // Una fila por eclipse con sus datos principales y los contactos locales.
  const rows = eclipses.map((e) => {
    const c = e.local.contacts
    return [
      e.peak.toISOString(),
      e.kind,
      e.saros,
      e.gamma.toFixed(5),
      e.greatestLat.toFixed(3),
      e.greatestLon.toFixed(3),
      e.local.kind,
      e.local.maxMagnitude.toFixed(4),
      (e.local.obscuration * 100).toFixed(2),
      e.local.sunAltitudeAtMax.toFixed(2),
      e.local.centralDurationSec !== null ? e.local.centralDurationSec.toFixed(0) : '',
      c.partialBegin ? c.partialBegin.toISOString() : '',
      c.partialEnd ? c.partialEnd.toISOString() : '',
      c.totalBegin ? c.totalBegin.toISOString() : '',
      c.totalEnd ? c.totalEnd.toISOString() : '',
    ].map(csvCell)
  })
  return [header, ...rows].map((r) => r.join(',')).join('\n')
}

/** JSON compacto con todo el detalle (incluye elementos besselianos). */
export function toJson(eclipses: EclipseData[]): string {
  return JSON.stringify(
    eclipses.map((e) => ({
      peak: e.peak.toISOString(),
      kind: e.kind,
      saros: e.saros,
      node: e.node,
      secondary: e.secondary,
      gamma: e.gamma,
      greatest: { lat: e.greatestLat, lon: e.greatestLon },
      besselian: {
        x: e.elements.x,
        y: e.elements.y,
        d: e.elements.d,
        u: e.elements.u,
        l1: e.elements.l1,
        l2: e.elements.l2,
        f1: e.elements.f1,
        f2: e.elements.f2,
      },
      centralLine: e.centralLine.map((p) => ({ t: p.t.toISOString(), lat: p.lat, lon: p.lon, total: p.total })),
      local: {
        kind: e.local.kind,
        visible: e.local.visible,
        maxMagnitude: e.local.maxMagnitude,
        obscuration: e.local.obscuration,
        sunAltitudeAtMax: e.local.sunAltitudeAtMax,
        centralDurationSec: e.local.centralDurationSec,
        contacts: {
          partialBegin: e.local.contacts.partialBegin?.toISOString() ?? null,
          totalBegin: e.local.contacts.totalBegin?.toISOString() ?? null,
          peak: e.local.contacts.peak?.toISOString() ?? null,
          totalEnd: e.local.contacts.totalEnd?.toISOString() ?? null,
          partialEnd: e.local.contacts.partialEnd?.toISOString() ?? null,
        },
      },
    })),
    null,
    2,
  )
}

// Descarga en el navegador un archivo con el contenido dado:
// se crea un "blob" (fragmento de datos en memoria), se le asigna una URL
// temporal y se hace clic en un enlace invisible para guardarlo.
export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportCsv(eclipses: EclipseData[]): void {
  download(`eclipses-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(eclipses), 'text/csv;charset=utf-8')
}

export function exportJson(eclipses: EclipseData[]): void {
  download(`eclipses-${new Date().toISOString().slice(0, 10)}.json`, toJson(eclipses), 'application/json;charset=utf-8')
}
