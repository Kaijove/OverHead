/**
 * Every unit conversion and every number the user reads. OpenSky speaks metres and metres per
 * second; OVERHEAD speaks metres and km/h. Serving an audience who prefer feet and knots means
 * changing this file and nothing else.
 *
 * Readings come back split from their unit so the card can set the unit in a quieter type.
 */

const MS_TO_KMH = 3.6

export const toKmh = (metresPerSecond: number) => metresPerSecond * MS_TO_KMH

/** A number to show, and the unit that belongs beside it. Null means "not reported". */
export type Reading = { value: string; unit?: string }

const whole = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

/** `7,240 m`. */
export function formatAltitude(metres: number | null): Reading | null {
  return metres === null ? null : { value: whole.format(Math.max(0, metres)), unit: 'm' }
}

/** `438 km/h`. Nobody needs 438.129384. */
export function formatSpeed(kmh: number | null): Reading | null {
  return kmh === null ? null : { value: whole.format(kmh), unit: 'km/h' }
}

/** `074°` -- always three digits, the way headings are spoken. */
export function formatHeading(degrees: number | null): Reading | null {
  if (degrees === null) return null
  return { value: `${String(Math.round(degrees) % 360).padStart(3, '0')}°` }
}

/** `↑ 7 m/s` climbing, `↓ 3 m/s` descending, `Level` in between. */
export function formatVerticalRate(metresPerSecond: number | null): Reading | null {
  if (metresPerSecond === null) return null
  if (Math.abs(metresPerSecond) < 0.5) return { value: 'Level' }
  const arrow = metresPerSecond > 0 ? '↑' : '↓'
  return { value: `${arrow} ${whole.format(Math.abs(metresPerSecond))}`, unit: 'm/s' }
}

/**
 * `2.4 km` up close, `18 km` further out. Precision the data cannot support is noise: a position
 * sampled seconds ago is not accurate to ten metres.
 */
export function formatDistance(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${whole.format(km)} km`
}
