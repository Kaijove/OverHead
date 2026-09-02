import { useCallback, useEffect, useState } from 'react'
import { STORED_PLACE_KEY } from '../config'
import type { LatLng } from '../utils/geo'

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'

type LocationState = {
  status: LocationStatus
  position: LatLng | null
  /** True when the position came from a place the user picked rather than from the device. */
  isManual: boolean
}

/**
 * Only a manually chosen place is remembered. The device's own position is always re-asked for,
 * never stored -- it costs nothing to obtain again and is not ours to keep.
 */
function readStoredPlace(): LatLng | null {
  try {
    const raw = window.localStorage.getItem(STORED_PLACE_KEY)
    if (!raw) return null
    const { lat, lon } = JSON.parse(raw) as Partial<LatLng>
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return { lat: lat as number, lon: lon as number }
  } catch {
    // Private mode, disabled storage, corrupted value -- none of it is worth an error.
    return null
  }
}

function writeStoredPlace(position: LatLng) {
  try {
    window.localStorage.setItem(STORED_PLACE_KEY, JSON.stringify(position))
  } catch {
    // Remembering is a convenience, not a requirement.
  }
}

/**
 * Where the viewer is standing.
 *
 * A place chosen on a previous visit is restored immediately, so someone who declined the browser
 * prompt lands straight on their sky instead of re-typing it. The device is still asked, and a
 * real fix takes priority the moment it arrives.
 */
export function useGeolocation() {
  const [state, setState] = useState<LocationState>(() => {
    const stored = readStoredPlace()
    return stored
      ? { status: 'ready', position: stored, isManual: true }
      : { status: 'idle', position: null, isManual: false }
  })

  const requestPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((previous) => ({ ...previous, status: 'unavailable' }))
      return
    }

    setState((previous) => ({
      ...previous,
      status: previous.position ? previous.status : 'locating',
    }))

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setState({
          status: 'ready',
          position: { lat: coords.latitude, lon: coords.longitude },
          isManual: false,
        }),
      (error) =>
        // The outcome is recorded even when a remembered place is still standing, so someone who
        // asks for their real location again is told the answer instead of nothing happening.
        // A stored position keeps the map up regardless: the gate opens on having no position,
        // never on this.
        setState((previous) => ({
          ...previous,
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        })),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  const setManualPosition = useCallback((position: LatLng) => {
    writeStoredPlace(position)
    setState({ status: 'ready', position, isManual: true })
  }, [])

  useEffect(requestPosition, [requestPosition])

  return { ...state, requestPosition, setManualPosition }
}
