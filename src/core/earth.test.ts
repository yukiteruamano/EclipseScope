import { describe, it, expect } from 'vitest'
import { geodeticToEcef, ecefToGeodetic, rayEllipsoid, kmToAu, auToKm } from './earth'
import { EARTH_EQUATORIAL_RADIUS_KM, EARTH_POLAR_RADIUS_KM, AU_KM } from './constants'

describe('geodeticToEcef / ecefToGeodetic', () => {
  it('roundtrip ecuator', () => {
    const orig = { lat: 0, lon: 0, heightKm: 0 }
    const ecef = geodeticToEcef(orig.lat, orig.lon, orig.heightKm)
    expect(ecef.x).toBeCloseTo(EARTH_EQUATORIAL_RADIUS_KM, 3)
    const geo = ecefToGeodetic(ecef.x, ecef.y, ecef.z)
    expect(geo.lat).toBeCloseTo(orig.lat, 4)
    expect(geo.lon).toBeCloseTo(orig.lon, 4)
    expect(geo.heightKm).toBeCloseTo(0, 3)
  })

  it('roundtrip Madrid', () => {
    const lat = 40.42
    const lon = -3.7
    const ecef = geodeticToEcef(lat, lon, 0)
    const geo = ecefToGeodetic(ecef.x, ecef.y, ecef.z)
    expect(geo.lat).toBeCloseTo(lat, 4)
    expect(geo.lon).toBeCloseTo(lon, 4)
  })

  it('polo norte', () => {
    const ecef = geodeticToEcef(90, 0, 0)
    expect(ecef.x).toBeCloseTo(0, 3)
    expect(ecef.z).toBeCloseTo(EARTH_POLAR_RADIUS_KM, 2)
    const geo = ecefToGeodetic(ecef.x, ecef.y, ecef.z)
    expect(geo.lat).toBeCloseTo(90, 3)
  })

  it('con altura', () => {
    const ecef = geodeticToEcef(0, 0, 10)
    const geo = ecefToGeodetic(ecef.x, ecef.y, ecef.z)
    expect(geo.heightKm).toBeCloseTo(10, 3)
  })
})

describe('rayEllipsoid', () => {
  it('rayo desde el exterior hacia el centro intersecta', () => {
    const hit = rayEllipsoid(10000, 0, 0, { x: -1, y: 0, z: 0 })
    expect(hit).not.toBeNull()
    expect(Math.abs(hit!.x)).toBeCloseTo(EARTH_EQUATORIAL_RADIUS_KM, 0)
  })

  it('rayo que no intersecta devuelve null (discriminante negativo)', () => {
    // eje paralelo desplazado fuera del elipsoide
    const hit = rayEllipsoid(0, 10000, 0, { x: 0, y: 0, z: 1 })
    expect(hit).toBeNull()
  })
})

describe('kmToAu / auToKm', () => {
  it('conversión invertible', () => {
    expect(auToKm(1)).toBeCloseTo(AU_KM, 5)
    expect(kmToAu(AU_KM)).toBeCloseTo(1, 8)
    expect(kmToAu(auToKm(1234.5))).toBeCloseTo(1234.5, 8)
  })
})
