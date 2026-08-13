/**
 * Validación de EclipseScope contra datos de referencia.
 *
 * 1) Números de Saros: tabla NASA real 1999–2024 (58 eclipses).
 * 2) Saros futuros conocidos (2026–2030).
 * 3) Elementos besselianos: eclipse 2024-04-08 (Torreón total, Madrid parcial),
 *    tiempos de contacto y punto de máxima magnitud frente a NASA y a
 *    astronomy-engine.
 *
 * Uso: pnpm validate
 */
import { SearchLocalSolarEclipse, Observer } from 'astronomy-engine'
import { assignSaros } from '../src/core/saros'
import { besselianElements } from '../src/core/besselian'
import {
  computeLocalCircumstances,
  greatestGeometry,
  computeCentralLine,
} from '../src/core/localCircumstances'
import { findNextSolarEclipses } from '../src/core/eclipseSearch'

let failures = 0
let checks = 0

function check(cond: boolean, label: string, detail?: unknown) {
  checks++
  if (cond) {
    console.log(`  ok  ${label}`)
  } else {
    failures++
    console.error(`FAIL  ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`)
  }
}

function close(a: number, b: number, tol: number, label: string) {
  check(Math.abs(a - b) <= tol, label, { a, b, diff: a - b, tol })
}

function secs(iso: string): number {
  return +new Date(iso)
}

function globalGamma(peak: Date): number {
  const el = besselianElements(peak)
  return Math.hypot(el.x, el.y)
}

// ---------------------------------------------------------------------------
console.log('\n[1] Saros 1999–2024 (tabla NASA)')
// [fecha máx, saros esperado]
const TABLE: [string, number][] = [
  ['1999-02-16T06:34Z', 140], ['1999-08-11T11:03Z', 145], ['2000-02-05T12:49Z', 150],
  ['2000-07-01T19:33Z', 117], ['2000-07-31T02:13Z', 155], ['2000-12-25T17:35Z', 122],
  ['2001-06-21T12:04Z', 127], ['2001-12-14T20:52Z', 132], ['2002-06-10T23:44Z', 137],
  ['2002-12-04T07:31Z', 142], ['2003-05-31T04:08Z', 147], ['2003-11-23T22:49Z', 152],
  ['2004-04-19T13:34Z', 119], ['2004-10-14T02:59Z', 124], ['2005-04-08T20:36Z', 129],
  ['2005-10-03T10:32Z', 134], ['2006-03-29T10:11Z', 139], ['2006-09-22T11:40Z', 144],
  ['2007-03-19T02:32Z', 149], ['2007-09-11T12:31Z', 154], ['2008-02-07T03:55Z', 121],
  ['2008-08-01T10:21Z', 126], ['2009-01-26T07:59Z', 131], ['2009-07-22T02:35Z', 136],
  ['2010-01-15T07:06Z', 141], ['2010-07-11T19:34Z', 146], ['2011-01-04T08:51Z', 151],
  ['2011-06-01T21:16Z', 118], ['2011-07-01T08:38Z', 156], ['2011-11-25T06:20Z', 123],
  ['2012-05-20T23:53Z', 128], ['2012-11-13T22:12Z', 133], ['2013-05-10T00:25Z', 138],
  ['2013-11-03T12:46Z', 143], ['2014-04-29T06:03Z', 148], ['2014-10-23T21:44Z', 153],
  ['2015-03-20T09:46Z', 120], ['2015-09-13T06:54Z', 125], ['2016-03-09T01:57Z', 130],
  ['2016-09-01T09:07Z', 135], ['2017-02-26T14:53Z', 140], ['2017-08-21T18:25Z', 145],
  ['2018-02-15T20:51Z', 150], ['2018-07-13T03:01Z', 117], ['2018-08-11T09:46Z', 155],
  ['2019-01-06T01:41Z', 122], ['2019-07-02T19:23Z', 127], ['2019-12-26T05:18Z', 132],
  ['2020-06-21T06:40Z', 137], ['2020-12-14T16:13Z', 142], ['2021-06-10T10:42Z', 147],
  ['2021-12-04T07:33Z', 152], ['2022-04-30T20:41Z', 119], ['2022-10-25T11:00Z', 124],
  ['2023-04-20T04:17Z', 129], ['2023-10-14T17:59Z', 134], ['2024-04-08T18:17Z', 139],
  ['2024-10-02T18:45Z', 144],
]

{
  const input = TABLE.map(([ds]) => {
    const peak = new Date(ds)
    return { peak, gamma: globalGamma(peak) }
  })
  const assigns = assignSaros(input)
  TABLE.forEach(([ds, exp], i) => {
    const got = assigns[i].saros
    check(got === exp, `${ds} → Saros ${exp}`, { got })
  })
}

// ---------------------------------------------------------------------------
console.log('\n[2] Saros futuros conocidos (2026–2030)')
{
  const FUTURE: [string, number][] = [
    ['2026-08-12T17:46Z', 126], ['2027-02-06T16:00Z', 131], ['2027-08-02T10:07Z', 136],
    ['2028-01-26T15:12Z', 141], ['2028-07-22T02:56Z', 146], ['2029-01-14T17:13Z', 151],
    ['2029-06-12T04:11Z', 118], ['2029-07-11T15:37Z', 156],
    ['2030-06-01T06:29Z', 128], ['2030-11-25T06:51Z', 133],
  ]
  const input = FUTURE.map(([ds]) => {
    const peak = new Date(ds)
    return { peak, gamma: globalGamma(peak) }
  })
  const assigns = assignSaros(input)
  FUTURE.forEach(([ds, exp], i) => {
    check(assigns[i].saros === exp, `${ds} → Saros ${exp}`, { got: assigns[i].saros })
  })
  // 2029: temporada doble (junio/julio), el conjunto debe ser {118, 156}
  const june = input.findIndex((x) => x.peak.getUTCFullYear() === 2029 && x.peak.getUTCMonth() === 5)
  const july = input.findIndex((x) => x.peak.getUTCFullYear() === 2029 && x.peak.getUTCMonth() === 6)
  if (june >= 0 && july >= 0) {
    const set = new Set([assigns[june].saros, assigns[july].saros])
    check(
      set.has(118) && set.has(156),
      '2029 temporada doble → {118, 156}',
      { got: [...set] },
    )
  }
}

// ---------------------------------------------------------------------------
console.log('\n[3] Elementos besselianos · eclipse 2024-04-08')
{
  const peak = new Date('2024-04-08T18:17:19.5Z')

  // Punto de máxima magnitud
  const g = greatestGeometry(peak)
  close(g.lat, 25.293, 0.3, 'punto máx lat ≈ 25.29 (NASA)', g.lat)
  close(g.lon, -104.14, 0.3, 'punto máx lon ≈ -104.14 (NASA)', g.lon)

  // Gamma
  const el = besselianElements(peak)
  close(Math.hypot(el.x, el.y), 0.34315, 0.002, 'gamma ≈ 0.34315 (NASA)', Math.hypot(el.x, el.y))

  // Torreón (total): contactos frente a astronomy-engine
  const t = computeLocalCircumstances(peak, 25.54, -103.45)
  check(t.kind === 'total', 'Torreón → total', { got: t.kind })
  check(!!t.contacts.partialBegin && !!t.contacts.totalBegin, 'Torreón contactos presentes')
  const ref = SearchLocalSolarEclipse(new Date('2024-04-07T00:00:00Z'), new Observer(25.54, -103.45, 0))
  if (t.contacts.partialBegin && t.contacts.partialEnd) {
    close(+t.contacts.partialBegin - +ref.partial_begin.time.date, 0, 150_000, 'Torreón P1 vs astronomy-engine', {
      mine: t.contacts.partialBegin.toISOString(),
      ref: ref.partial_begin.time.date.toISOString(),
    })
    close(+t.contacts.partialEnd - +ref.partial_end.time.date, 0, 150_000, 'Torreón P4 vs astronomy-engine')
  }
  if (t.contacts.totalBegin && ref.total_begin) {
    close(+t.contacts.totalBegin - +ref.total_begin.time.date, 0, 150_000, 'Torreón C2 vs astronomy-engine', {
      mine: t.contacts.totalBegin.toISOString(),
      ref: ref.total_begin.time.date.toISOString(),
    })
  }
  if (t.contacts.totalEnd && ref.total_end) {
    close(+t.contacts.totalEnd - +ref.total_end.time.date, 0, 150_000, 'Torreón C3 vs astronomy-engine', {
      mine: t.contacts.totalEnd.toISOString(),
      ref: ref.total_end.time.date.toISOString(),
    })
  }
  check(t.obscuration > 0.99, 'Torreón oscurecimiento ≈ 100%', t.obscuration)

  // Madrid (parcial): contactos frente a valores NASA publicados
  const m = computeLocalCircumstances(peak, 40.42, -3.7)
  check(m.kind === 'partial', 'Madrid → parcial', { got: m.kind })
  if (m.contacts.partialBegin) {
    close(+m.contacts.partialBegin - secs('2024-04-08T19:02:35Z'), 0, 120_000, 'Madrid P1 ≈ 19:02:35 UTC', {
      mine: m.contacts.partialBegin.toISOString(),
    })
  }
  if (m.contacts.partialEnd) {
    close(+m.contacts.partialEnd - secs('2024-04-08T20:42:35Z'), 0, 120_000, 'Madrid P4 ≈ 20:42:35 UTC', {
      mine: m.contacts.partialEnd.toISOString(),
    })
  }

  // Línea central cruza el elipsoide alrededor del máximo
  const line = computeCentralLine(peak)
  check(line.length > 10, `línea central presente (${line.length} pts)`)
  if (line.length > 0) {
    const mid = line[Math.floor(line.length / 2)]
    check(Math.abs(mid.lat - 25.3) < 5, `punto medio línea ≈ 25.3N (${mid.lat.toFixed(1)})`)
  }
}

// ---------------------------------------------------------------------------
console.log('\n[4] Enumeración de eclipses desde una fecha')
{
  const next = findNextSolarEclipses(new Date('2026-01-01T00:00:00Z'), 3)
  check(next.length === 3, 'encuentra 3 eclipses desde 2026')
  check(next[0].peak.getUTCFullYear() === 2026 && next[0].kind === 'annular', '2026-02-17 → anular (NASA)', {
    date: next[0].peak.toISOString(),
    kind: String(next[0].kind),
  })
  check(next[1].peak.toISOString().startsWith('2026-08-12') && next[1].kind === 'total', '2026-08-12 → total (NASA)', {
    date: next[1].peak.toISOString(),
    kind: String(next[1].kind),
  })
  check(next[2].peak.toISOString().startsWith('2027-02-06') && next[2].kind === 'annular', '2027-02-06 → anular (NASA)', {
    date: next[2].peak.toISOString(),
    kind: String(next[2].kind),
  })
}

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} comprobaciones correctas`)
if (failures > 0) {
  console.error(`\n${failures} FALLO(S)`)
  process.exit(1)
}
console.log('✓ Validación superada')
