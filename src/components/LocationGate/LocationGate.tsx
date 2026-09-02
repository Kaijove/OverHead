import { useEffect, useState } from 'react'
import { searchPlaces, type Place } from '../../services/geocode'
import type { LocationStatus } from '../../hooks/useGeolocation'
import type { LatLng } from '../../utils/geo'
import './LocationGate.css'

type LocationGateProps = {
  status: LocationStatus
  onRetry: () => void
  onPick: (position: LatLng) => void
  /** Present only when there is already a sky to go back to. */
  onDismiss?: () => void
  /** How many songs are still buried, so the first screen can say so. */
  hiddenCount: number
}

const COPY: Record<LocationStatus, { lead: string; action: string }> = {
  idle: { lead: 'See what’s above you.', action: 'Allow location' },
  locating: { lead: 'See what’s above you.', action: 'Locating' },
  // Reached only when a place is already chosen and the viewer wants a different one.
  ready: { lead: 'Watch somewhere else.', action: 'Use my location' },
  denied: { lead: 'Choose a place to watch.', action: '' },
  unavailable: { lead: 'Choose a place to watch.', action: '' },
}

const opensSearching = (status: LocationStatus) =>
  status === 'denied' || status === 'unavailable' || status === 'ready'

/**
 * The screen before the sky, and the way back to it. It never dead-ends: refusing the browser
 * prompt moves you to picking a place by name, and a place once picked can always be changed.
 */
export function LocationGate({ status, onRetry, onPick, onDismiss, hiddenCount }: LocationGateProps) {
  const [isSearching, setIsSearching] = useState(() => opensSearching(status))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])

  useEffect(() => {
    if (opensSearching(status)) setIsSearching(true)
  }, [status])

  // Nominatim asks for gentle traffic, so wait until the typing settles.
  useEffect(() => {
    if (!isSearching || query.trim().length < 2) {
      setResults([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then(setResults)
        .catch(() => undefined)
    }, 450)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, isSearching])

  const { lead, action } = COPY[status]

  return (
    <section className="gate">
      <div className="gate__glow" aria-hidden="true" />

      <h1 className="gate__lead">{lead}</h1>

      {action && (
        <button className="gate__primary" onClick={onRetry} disabled={status === 'locating'}>
          {action}
        </button>
      )}

      {isSearching ? (
        <div className="gate__search">
          <input
            className="gate__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a place"
            aria-label="Search for a place"
            autoFocus
          />
          <ul className="gate__results">
            {results.map((place) => (
              <li key={place.id}>
                <button
                  className="gate__result"
                  onClick={() => onPick({ lat: place.lat, lon: place.lon })}
                >
                  {place.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button className="gate__secondary" onClick={() => setIsSearching(true)}>
          Choose a place instead
        </button>
      )}

      {onDismiss && (
        <button className="gate__secondary" onClick={onDismiss}>
          Back to the sky
        </button>
      )}

      {hiddenCount > 0 && (
        <p className="gate__hunt">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6.2 10.4 V3.2 L13 1.8 V9" />
            <ellipse cx="4.3" cy="10.6" rx="1.9" ry="1.7" />
            <ellipse cx="11.1" cy="9.4" rx="1.9" ry="1.7" />
          </svg>
          <span>
            {hiddenCount} songs are hidden across the map, buried over wonders and landmarks.
            Zoom out, look for a glimmer, and tap it.
          </span>
        </p>
      )}
    </section>
  )
}
