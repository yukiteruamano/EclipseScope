// Worker: cálculo pesado fuera del hilo principal.
// Vite lo empaqueta como ES Module worker (type: 'module').
import { enumerateEclipses, buildEclipseData, type EclipseData } from './engine'
import type { Country } from '../data/countries'

export interface WorkerRequest {
  id: number
  startIso: string
  country: Country
  count: number
}

export interface WorkerProgress {
  type: 'progress'
  id: number
  done: number
  total: number
}

export interface WorkerDone {
  type: 'done'
  id: number
  eclipses: EclipseData[]
  startIso: string
  country: Country
}

export interface WorkerError {
  type: 'error'
  id: number
  message: string
}

// Tipos de mensajes que el worker emite
export type WorkerResponse = WorkerProgress | WorkerDone | WorkerError

// El worker escucha mensajes del hilo principal
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, startIso, country, count } = e.data
  try {
    const start = new Date(startIso)
    if (Number.isNaN(+start)) throw new Error('Fecha no válida')
    const { raws, assignments } = enumerateEclipses(start, count)
    // Notifica progreso inicial
    const total = raws.length
    const eclipses: EclipseData[] = []
    for (let i = 0; i < raws.length; i++) {
      const ed = buildEclipseData(raws[i], assignments[i], country)
      eclipses.push(ed)
      const progress: WorkerProgress = { type: 'progress', id, done: i + 1, total }
      // structuredClone soporta Date, el worker puede enviar Dates directamente
      ;(self as unknown as Worker).postMessage(progress)
    }
    const done: WorkerDone = { type: 'done', id, eclipses, startIso, country }
    ;(self as unknown as Worker).postMessage(done)
  } catch (err) {
    const msg: WorkerError = {
      type: 'error',
      id,
      message: err instanceof Error ? err.message : String(err),
    }
    ;(self as unknown as Worker).postMessage(msg)
  }
}
