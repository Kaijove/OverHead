import { useEffect, useRef } from 'react'
import type { Orientation } from '../../hooks/useDeviceOrientation'
import type { Viewport } from '../../map/viewport'
import './Compass.css'

type CompassProps = {
  viewport: Viewport
  orientation: Orientation
  isFollowing: boolean
  onToggleFollow: () => void
}

const CARDINALS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
]

const TICKS = Array.from({ length: 36 }, (_, index) => index * 10).filter((a) => a % 90 !== 0)

const polar = (angle: number, radius: number) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) }
}

/**
 * The compass shows one thing and one thing only: how the map is turned.
 *
 * Three angles exist in OVERHEAD and mixing them is the classic way to get this wrong. The map
 * has a bearing, each aircraft has a heading, and the device has a facing. This dial follows the
 * map. The aircraft carry their own heading on the map itself, and the device's facing is the
 * wedge under your own dot -- so turning your phone never moves an aircraft, and rotating the
 * map never changes where one is pointing.
 *
 * Everything here is written straight to the DOM. A rotate gesture changes the bearing on every
 * frame, and re-rendering the application that often to turn a ring would be indefensible.
 */
export function Compass({ viewport, orientation, isFollowing, onToggleFollow }: CompassProps) {
  const dialRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const { needsPermission, request, status } = orientation

  const isLive = status === 'live'
  const followingRef = useRef(isFollowing)
  followingRef.current = isFollowing

  useEffect(
    () =>
      viewport.subscribe((bearing) => {
        if (dialRef.current) dialRef.current.style.transform = `rotate(${-bearing}deg)`

        const off = Math.abs(((bearing % 360) + 360) % 360) > 0.5
        // The way back to north exists only while there is something to come back from.
        if (resetRef.current) {
          resetRef.current.style.opacity = off ? '1' : '0'
          resetRef.current.style.pointerEvents = off ? 'auto' : 'none'
        }
        if (readoutRef.current && !followingRef.current && !needsPermission) {
          const heading = ((Math.round(bearing) % 360) + 360) % 360
          readoutRef.current.textContent = off
            ? `${String(heading).padStart(3, '0')}°`
            : 'NORTH UP'
        }
      }),
    [viewport, needsPermission],
  )

  // The states React does own are the ones that change twice a session, not sixty times a second.
  useEffect(() => {
    if (!readoutRef.current) return
    if (needsPermission) readoutRef.current.textContent = 'TAP FOR COMPASS'
    else if (isFollowing) readoutRef.current.textContent = 'FOLLOWING'
  }, [needsPermission, isFollowing])

  const action = needsPermission ? request : isLive ? onToggleFollow : undefined
  const actionLabel = needsPermission
    ? 'Use device compass'
    : isFollowing
      ? 'Stop following your heading'
      : 'Turn the map with you'

  return (
    <div className={`compass${isFollowing ? ' compass--following' : ''}`}>
      <button
        className="compass__face"
        onClick={action}
        disabled={!action}
        aria-label={action ? actionLabel : undefined}
        aria-pressed={isLive && !needsPermission ? isFollowing : undefined}
      >
        <div className="compass__dial" ref={dialRef}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="compass__ring" cx="50" cy="50" r="40" />

            {TICKS.map((angle) => {
              const from = polar(angle, angle % 30 === 0 ? 34 : 37)
              const to = polar(angle, 40)
              return (
                <line
                  key={angle}
                  className="compass__tick"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              )
            })}

            {CARDINALS.map(({ label, angle }) => {
              const at = polar(angle, 24)
              return (
                <text
                  key={label}
                  className={`compass__cardinal${label === 'N' ? ' compass__cardinal--north' : ''}`}
                  x={at.x}
                  y={at.y}
                >
                  {label}
                </text>
              )
            })}

            <polygon className="compass__north" points="50,2 46.6,10.5 53.4,10.5" />
          </svg>
        </div>
      </button>

      {/* Written to, never rendered into: once a bearing is live this text belongs to the map. */}
      <span className="compass__readout readout" ref={readoutRef} />

      <button
        className="compass__reset"
        ref={resetRef}
        onClick={() => viewport.resetNorth()}
        aria-label="Face north"
      >
        N
      </button>
    </div>
  )
}
