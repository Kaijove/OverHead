import { MAX_POSITION_AGE } from '../../config'
import { boundingBox, bearingDeg, distanceKm, type LatLng } from '../../utils/geo'
import { toKmh } from '../../utils/units'
import type { Aircraft, OpenSkyResponse, OpenSkyStateVector } from './types'

/** Same path in dev (Vite proxy) and production (serverless function). */
const ENDPOINT = '/api/states'

export class OpenSkyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'OpenSkyError'
  }
}

/**
 * Null, undefined, NaN and Infinity all mean "not reported". Treating any of them as a number is
 * how an aircraft ends up drawn at the origin or flying at NaN km/h.
 */
const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** `"VLG123  "` becomes `"VLG123"`; an all-blank callsign becomes null, not an empty string. */
const cleanCallsign = (raw: string | null): string | null =>
  typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().toUpperCase() : null

function toAircraft(state: OpenSkyStateVector, viewer: LatLng, now: number): Aircraft | null {
  const [
    icao24,
    callsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    ,
    geoAltitude,
  ] = state

  const lat = finite(latitude)
  const lon = finite(longitude)
  // Nothing to draw without a position, and nothing sane to draw off the globe.
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null

  // time_position is when the position was measured; last_contact only says the transponder was
  // heard. Falling back to last_contact keeps aircraft that report one but not the other.
  const positionTime = finite(timePosition) ?? finite(lastContact) ?? now / 1000
  if (now - positionTime * 1000 > MAX_POSITION_AGE) return null

  const isOnGround = onGround === true
  const altitude = finite(geoAltitude) ?? finite(baroAltitude)
  const speed = finite(velocity)
  const track = finite(trueTrack)
  const position = { lat, lon }

  return {
    icao24,
    callsign: cleanCallsign(callsign),
    originCountry: typeof originCountry === 'string' ? originCountry : 'Unknown',
    lat,
    lon,
    // An aircraft on a runway is not at 0 m above sea level, and saying so would be a lie.
    altitudeM: isOnGround ? null : altitude,
    velocityKmh: speed === null ? null : toKmh(speed),
    headingDeg: track === null ? null : ((track % 360) + 360) % 360,
    verticalRateMs: isOnGround ? null : finite(verticalRate),
    onGround: isOnGround,
    positionTime,
    distanceKm: distanceKm(viewer, position),
    bearingDeg: bearingDeg(viewer, position),
  }
}

/** Aircraft within `radiusKm` of `viewer`, nearest first. */
export async function fetchNearbyAircraft(
  viewer: LatLng,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<Aircraft[]> {
  const box = boundingBox(viewer, radiusKm)
  const query = new URLSearchParams({
    lamin: box.lamin.toFixed(4),
    lomin: box.lomin.toFixed(4),
    lamax: box.lamax.toFixed(4),
    lomax: box.lomax.toFixed(4),
  })

  const response = await fetch(`${ENDPOINT}?${query}`, { signal })

  if (!response.ok) {
    const retryAfter = Number(response.headers.get('x-rate-limit-retry-after-seconds'))
    throw new OpenSkyError(
      response.status === 429 ? 'Out of OpenSky credits' : `OpenSky replied ${response.status}`,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    )
  }

  const data = (await response.json()) as OpenSkyResponse
  const states = Array.isArray(data?.states) ? data.states : []
  const now = Date.now()

  return states
    .map((state) => (Array.isArray(state) ? toAircraft(state, viewer, now) : null))
    .filter((aircraft): aircraft is Aircraft => aircraft !== null)
    // The bounding box is square; the radar is round.
    .filter((aircraft) => aircraft.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
