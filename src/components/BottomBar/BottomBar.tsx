import type { Ambient } from '../../hooks/useAmbient'
import './BottomBar.css'

type BottomBarProps = {
  locationLabel: string
  onLocation: () => void
  count: number
  ambient: Ambient
  onOpenTracks: () => void
}

/**
 * Three readings along the bottom edge.
 *
 * The ambience is the one that has to declare itself: a note glyph on its own was invisible and
 * said nothing about whether anything was playing. It is a pill now -- a real play control, and
 * the track name beside it, which opens the dial.
 */
export function BottomBar({ locationLabel, onLocation, count, ambient, onOpenTracks }: BottomBarProps) {
  return (
    <footer className="bar">
      <button className="bar__item bar__button" onClick={onLocation} aria-label={locationLabel}>
        <svg className="bar__icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5.4" />
          <path d="M8 0.6 V3.2 M8 12.8 V15.4 M0.6 8 H3.2 M12.8 8 H15.4" />
          <circle className="bar__icon-core" cx="8" cy="8" r="1.6" />
        </svg>
        <span className="bar__label">{locationLabel}</span>
      </button>

      <span className="bar__item bar__count">
        <svg className="bar__icon bar__icon--solid" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1 L12 15 L8 12 L4 15 Z" />
        </svg>
        <span className="readout">{count}</span>
        <span className="bar__label">nearby</span>
      </span>

      {ambient.isSupported && (
        <span className={`bar__ambient${ambient.isPlaying ? ' is-playing' : ''}`}>
          <button
            className="bar__play"
            onClick={ambient.toggle}
            aria-pressed={ambient.isPlaying}
            aria-label={ambient.isPlaying ? 'Stop the music' : 'Play the music'}
          >
            {ambient.isPlaying ? (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="4.4" y="3.4" width="2.6" height="9.2" rx="1" />
                <rect x="9" y="3.4" width="2.6" height="9.2" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5.2 3.4 L12.4 8 L5.2 12.6 Z" />
              </svg>
            )}
          </button>

          <button className="bar__track" onClick={onOpenTracks} aria-label="Choose the music">
            {ambient.trackName}
          </button>
        </span>
      )}
    </footer>
  )
}
