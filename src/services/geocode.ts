import type { LatLng } from '../utils/geo'

export type Place = LatLng & { id: string; name: string }

/**
 * Nominatim, so someone who declines the location prompt is not stuck. Their usage policy asks for
 * light, identified traffic, which is why the caller debounces and why the app sends no more than
 * a handful of results per query.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({ q: trimmed, format: 'jsonv2', limit: '5' })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { accept: 'application/json' },
  })
  if (!response.ok) return []

  // Nominatim answers with an error object rather than an array when it is rate limiting, and
  // individual results have been known to arrive without usable coordinates. Neither may reach
  // the map: a NaN position takes the whole app down with it.
  const results: unknown = await response.json()
  if (!Array.isArray(results)) return []

  return results.flatMap((result: Partial<Record<string, unknown>>) => {
    const lat = Number(result.lat)
    const lon = Number(result.lon)
    const name = typeof result.display_name === 'string' ? result.display_name : ''

    const isOnEarth =
      Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    if (!isOnEarth || name === '') return []

    return [{ id: String(result.place_id ?? `${lat},${lon}`), name, lat, lon }]
  })
}
