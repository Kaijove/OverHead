import type { Basemap } from '../../map/style'
import './BasemapToggle.css'

type BasemapToggleProps = {
  basemap: Basemap
  onToggle: () => void
}

/**
 * One glyph, two maps. It lights up when the imagery is on, the same way the ambience note does
 * when sound is playing -- so the state is legible without a word of label.
 */
export function BasemapToggle({ basemap, onToggle }: BasemapToggleProps) {
  const isSatellite = basemap === 'satellite'

  return (
    <button
      className={`basemap${isSatellite ? ' is-on' : ''}`}
      onClick={onToggle}
      aria-pressed={isSatellite}
      aria-label={isSatellite ? 'Switch to the night map' : 'Switch to satellite imagery'}
    >
      {/* The icon is the map you are looking at, not the one you would get: sun over the real
          earth, moon over the dark one. */}
      {isSatellite ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.6" />
          <path d="M12 1.8 V4.4 M12 19.6 V22.2 M1.8 12 H4.4 M19.6 12 H22.2 M4.8 4.8 L6.6 6.6 M17.4 17.4 L19.2 19.2 M19.2 4.8 L17.4 6.6 M6.6 17.4 L4.8 19.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.4 14.6 A9 9 0 1 1 9.4 3.6 A7.1 7.1 0 0 0 20.4 14.6 Z" />
        </svg>
      )}
    </button>
  )
}
