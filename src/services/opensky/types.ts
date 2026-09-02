/**
 * OpenSky returns state vectors as positional arrays, documented at
 * https://openskynetwork.github.io/opensky-api/rest.html#response
 *
 * Every field except icao24, origin_country, last_contact and on_ground is nullable, so nothing
 * below may be trusted to exist.
 */
export type OpenSkyStateVector = [
  icao24: string,
  callsign: string | null,
  originCountry: string,
  timePosition: number | null,
  lastContact: number,
  longitude: number | null,
  latitude: number | null,
  baroAltitude: number | null,
  onGround: boolean,
  velocity: number | null,
  trueTrack: number | null,
  verticalRate: number | null,
  sensors: number[] | null,
  geoAltitude: number | null,
  squawk: string | null,
  spi: boolean,
  positionSource: number,
]

export type OpenSkyResponse = {
  time: number
  states: OpenSkyStateVector[] | null
}

/**
 * One aircraft in the shape the UI wants: metres, km/h, degrees from true north. Anything the
 * aircraft did not report stays null rather than becoming a plausible-looking zero.
 */
export type Aircraft = {
  /** Stable identity. The transponder address never changes; the callsign can, mid-flight. */
  icao24: string
  callsign: string | null
  originCountry: string
  lat: number
  lon: number
  /** Null on the ground, or when no altitude was reported. */
  altitudeM: number | null
  velocityKmh: number | null
  /** Direction of travel, degrees clockwise from true north. */
  headingDeg: number | null
  verticalRateMs: number | null
  onGround: boolean
  /** When this position was measured (unix seconds), not when the aircraft was last heard. */
  positionTime: number
  /** Derived, relative to the viewer. */
  distanceKm: number
  bearingDeg: number
}
