import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AIRCRAFT_REFRESH_INTERVAL,
  ERROR_BACKOFF_MULTIPLIER,
  REQUEST_TIMEOUT,
} from '../config'
import { fetchNearbyAircraft, OpenSkyError } from '../services/opensky/client'
import type { Aircraft } from '../services/opensky/types'
import type { LatLng } from '../utils/geo'

type AircraftState = {
  /** The last good picture of the sky. Kept through failures rather than blanked. */
  aircraft: Aircraft[]
  hasFailed: boolean
  updatedAt: number | null
}

/**
 * Polls OpenSky for aircraft around `viewer`.
 *
 * Exactly one request is ever in flight and exactly one timer is ever pending. The tab sleeping
 * stops the polling entirely, and a failure keeps the aircraft we already have on screen: an
 * unreachable API is a reason to stop updating the sky, not to empty it.
 */
export function useAircraft(viewer: LatLng | null, radiusKm: number) {
  const [state, setState] = useState<AircraftState>({
    aircraft: [],
    hasFailed: false,
    updatedAt: null,
  })
  const backoffUntil = useRef(0)
  const [retryNonce, setRetryNonce] = useState(0)

  /** Used by the error state's "Try again": drop the backoff and poll immediately. */
  const retry = useCallback(() => {
    backoffUntil.current = 0
    setRetryNonce((nonce) => nonce + 1)
  }, [])

  useEffect(() => {
    if (!viewer) return

    let timer: number | undefined
    let inFlight: AbortController | null = null
    let isCancelled = false

    // One pending timer, always. Without the clear, a tab regaining focus while a poll was
    // already scheduled would leave two chains running and double the request rate for good.
    const schedule = (delay: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void poll(), delay)
    }

    const poll = async () => {
      if (isCancelled || inFlight) return
      if (document.hidden || Date.now() < backoffUntil.current) {
        return schedule(AIRCRAFT_REFRESH_INTERVAL)
      }

      const controller = new AbortController()
      inFlight = controller
      // A hung connection would otherwise leave a request in flight forever and quietly end the
      // polling loop. Timing out turns it into an ordinary failure, which the backoff handles.
      const expiry = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      try {
        const aircraft = await fetchNearbyAircraft(viewer, radiusKm, controller.signal)
        if (isCancelled) return
        setState({ aircraft, hasFailed: false, updatedAt: Date.now() })
        schedule(AIRCRAFT_REFRESH_INTERVAL)
      } catch (error) {
        // Only a teardown is silent. A timeout is a failure like any other.
        if (isCancelled) return

        // Out of credits? OpenSky says exactly how long to wait. Otherwise back off gently --
        // hammering a failing API helps nobody.
        const retryAfterMs =
          error instanceof OpenSkyError && error.retryAfterSeconds
            ? error.retryAfterSeconds * 1000
            : AIRCRAFT_REFRESH_INTERVAL * ERROR_BACKOFF_MULTIPLIER
        backoffUntil.current = Date.now() + retryAfterMs

        setState((previous) => ({ ...previous, hasFailed: true }))
        schedule(retryAfterMs)
      } finally {
        window.clearTimeout(expiry)
        inFlight = null
      }
    }

    // A tab coming back to the foreground should show fresh sky immediately.
    const onVisibilityChange = () => {
      if (!document.hidden) void poll()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    void poll()

    return () => {
      isCancelled = true
      inFlight?.abort()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [viewer, radiusKm, retryNonce])

  return { ...state, retry }
}
