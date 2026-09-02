const EARTH_RADIUS_KM = 6371

export type LatLng = { lat: number; lon: number }
type BoundingBox = { lamin: number; lomin: number; lamax: number; lomax: number }

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * Square bounding box around a point. OpenSky bills by box area: <=25 square degrees costs
 * 1 credit, so a radius of ~100km (~2 degrees across) stays in the cheapest bracket everywhere.
 */
export function boundingBox({ lat, lon }: LatLng, radiusKm: number): BoundingBox {
  const latDelta = toDeg(radiusKm / EARTH_RADIUS_KM)
  const lonDelta = toDeg(radiusKm / (EARTH_RADIUS_KM * Math.cos(toRad(lat))))
  return {
    lamin: lat - latDelta,
    lomin: lon - lonDelta,
    lamax: lat + latDelta,
    lomax: lon + lonDelta,
  }
}

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** Initial bearing from `a` to `b`, in degrees clockwise from true north. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function cardinal(deg: number): (typeof CARDINALS)[number] {
  return CARDINALS[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}
