import { useEffect } from 'react'
import type { Discovery } from '../../hooks/useDiscoveries'
import './Discovery.css'

const NOTE = (
  <svg className="find__note" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6.2 10.4 V3.2 L13 1.8 V9" />
    <ellipse cx="4.3" cy="10.6" rx="1.9" ry="1.7" />
    <ellipse cx="11.1" cy="9.4" rx="1.9" ry="1.7" />
  </svg>
)

/**
 * The moment something is uncovered.
 *
 * It says where you were rather than what you did -- the place is the reward, the track is the
 * souvenir -- and then it leaves on its own without asking to be dismissed.
 */
export function FoundToast({
  discovery,
  isNew,
  onDone,
}: {
  discovery: Discovery
  isNew: boolean
  onDone: () => void
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 6500)
    return () => window.clearTimeout(timer)
  }, [discovery, onDone])

  return (
    <div className="find" role="status" key={`${discovery.id}-${String(isNew)}`}>
      {NOTE}
      <div className="find__body">
        <p className="find__where">
          {isNew ? 'Found over' : 'Playing over'} {discovery.place.name}
        </p>
        <p className="find__name">{discovery.name}</p>
      </div>
    </div>
  )
}

/**
 * The only clue anyone gets, shown once and never again. It names the kind of place to look for
 * and nothing else: no list, no markers, no arrows. Finding them is the whole point.
 */
export function HuntHint({
  foundCount,
  total,
  onDismiss,
}: {
  foundCount: number
  total: number
  onDismiss: () => void
}) {
  // Deliberately no timer. A clue that fades out while the map is still loading is a clue
  // nobody reads, and this one is the only explanation the hunt ever gets.
  return (
    <button className="hunt" onClick={onDismiss} aria-label="Dismiss">
      {NOTE}
      <span className="hunt__body">
        <span className="hunt__lead">
          {total - foundCount} songs are hidden across the map.
        </span>
        <span className="hunt__sub">
          Buried over wonders, landmarks and famous cities. Zoom out to see where they glimmer,
          then go and take one.
        </span>
        <span className="hunt__dismiss">Tap to begin</span>
      </span>
    </button>
  )
}
