import type { Aircraft } from '../../services/opensky/types'
import { airlineFromCallsign } from '../../utils/airlines'
import { cardinal } from '../../utils/geo'
import { formatAltitude, formatDistance, formatHeading, formatSpeed } from '../../utils/units'
import './AircraftCard.css'

type AircraftCardProps = {
  aircraft: Aircraft
  onClose: () => void
}

/**
 * Four numbers and a name.
 *
 * Every reading carries its own unit, so the labels that used to sit above them were saying
 * nothing a reader could not already see: `7,240 m` is obviously an altitude. They are gone from
 * the screen and kept for screen readers, which halved the text and left something you take in at
 * a glance instead of studying.
 */
export function AircraftCard({ aircraft, onClose }: AircraftCardProps) {
  const operator = airlineFromCallsign(aircraft.callsign)
  const heading = aircraft.headingDeg
  const altitude = aircraft.onGround ? null : formatAltitude(aircraft.altitudeM)
  const speed = formatSpeed(aircraft.velocityKmh)

  // Climbing or descending, in one glyph rather than another line of numbers.
  const climb =
    aircraft.verticalRateMs === null || Math.abs(aircraft.verticalRateMs) < 0.5
      ? ''
      : aircraft.verticalRateMs > 0
        ? '↑'
        : '↓'

  return (
    <article className="card" aria-live="polite">
      <header className="card__head">
        <svg
          className="card__glyph"
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{ transform: `rotate(${heading ?? 0}deg)` }}
        >
          <path d="M12 2 L18.5 21 L12 17 L5.5 21 Z" />
        </svg>

        <div className="card__identity">
          <h2 className="card__callsign">{aircraft.callsign ?? 'Unknown aircraft'}</h2>
          {/* Never guessed. When the callsign is not an operator code we say where it is
              registered instead, in words that cannot be mistaken for an airline. */}
          <p className="card__operator">{operator ?? `Registered in ${aircraft.originCountry}`}</p>
        </div>

        <button className="card__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
            <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </header>

      <dl className="card__readings readout">
        <div className="card__reading">
          <dt className="visually-hidden">Altitude</dt>
          <dd className="card__value">
            {aircraft.onGround ? 'On ground' : (altitude?.value ?? '—')}
            {altitude && <span className="card__unit">{altitude.unit}</span>}
            {climb && <span className="card__climb">{climb}</span>}
          </dd>
        </div>
        <div className="card__reading">
          <dt className="visually-hidden">Speed</dt>
          <dd className="card__value">
            {speed?.value ?? '—'}
            {speed && <span className="card__unit">{speed.unit}</span>}
          </dd>
        </div>
        <div className="card__reading">
          <dt className="visually-hidden">Heading</dt>
          <dd className="card__value">
            {formatHeading(heading)?.value ?? '—'}
            {heading !== null && <span className="card__unit">{cardinal(heading)}</span>}
          </dd>
        </div>
        <div className="card__reading">
          <dt className="visually-hidden">Away</dt>
          <dd className="card__value card__value--accent">
            {formatDistance(aircraft.distanceKm)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
