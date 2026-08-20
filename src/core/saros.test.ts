import { describe, it, expect } from 'vitest'
import { assignSaros, sarosFamily, primarySarosAt, nodeOf, secondarySaros, seasonIndex } from './saros'
import { besselianElements } from './besselian'

function gammaAt(iso: string): number {
  const el = besselianElements(new Date(iso))
  return Math.hypot(el.x, el.y)
}

// Tabla NASA 1999-2024 + futuros 2026-2030 (de validate/validate.ts)
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

describe('assignSaros', () => {
  it('58 eclipses NASA 1999-2024', () => {
    const input = TABLE.map(([ds]) => ({ peak: new Date(ds), gamma: gammaAt(ds) }))
    const assigns = assignSaros(input)
    TABLE.forEach(([ds, exp], i) => {
      expect(assigns[i].saros, ds).toBe(exp)
    })
  })

  it('temporada doble 2000-07 discrimina por gamma', () => {
    const a = { peak: new Date('2000-07-01T19:33Z'), gamma: gammaAt('2000-07-01T19:33Z') }
    const b = { peak: new Date('2000-07-31T02:13Z'), gamma: gammaAt('2000-07-31T02:13Z') }
    const res = assignSaros([a, b])
    const sarosSet = new Set(res.map((r) => r.saros))
    expect(sarosSet.has(117)).toBe(true)
    expect(sarosSet.has(155)).toBe(true)
  })

  it('2029 temporada doble 118/156', () => {
    const f: [string, number][] = [
      ['2029-06-12T04:11Z', 118], ['2029-07-11T15:37Z', 156],
    ]
    const input = f.map(([ds]) => ({ peak: new Date(ds), gamma: gammaAt(ds) }))
    const assigns = assignSaros(input)
    const set = new Set(assigns.map((a) => a.saros))
    expect(set.has(118)).toBe(true)
    expect(set.has(156)).toBe(true)
  })
})

describe('helpers', () => {
  it('nodeOf paridad', () => {
    expect(nodeOf(139)).toBe('ascending')
    expect(nodeOf(140)).toBe('descending')
  })
  it('secondarySaros', () => {
    expect(secondarySaros(155)).toBe(117)
    expect(secondarySaros(117)).toBe(155)
  })
  it('seasonIndex y primarySarosAt para referencia', () => {
    expect(primarySarosAt(new Date('2017-02-26T14:53:32Z'))).toBe(140)
    expect(seasonIndex(new Date('2017-02-26T14:53:32Z'))).toBe(0)
  })
  it('sarosFamily genera fechas ordenadas', () => {
    const fam = sarosFamily(new Date('2024-04-08T18:17:19.5Z'), 139, 2, 2)
    expect(fam.dates).toHaveLength(4)
    expect(fam.saros).toBe(139)
    // orden ascendente
    for (let i = 1; i < fam.dates.length; i++) expect(+fam.dates[i]).toBeGreaterThan(+fam.dates[i - 1])
  })
})
