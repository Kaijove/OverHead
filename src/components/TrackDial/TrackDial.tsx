import { useEffect, useState } from 'react'
import './TrackDial.css'

export type DialTrack = { id: string; name: string; locked: boolean }

type TrackDialProps = {
  tracks: DialTrack[]
  currentId: string
  isPlaying: boolean
  onSelect: (id: string) => void
  onToggle: () => void
  onClose: () => void
  volume: number
  onVolume: (level: number) => void
}

/**
 * One radius, expressed as a percentage of the dial, used by both the ring and the points. They
 * were drawn from two different numbers to begin with, which put every point off the line.
 */
const RADIUS = 38

/**
 * Every song OVERHEAD has, laid out as a ring of points.
 *
 * The sealed ones are drawn too, dimmed and unreachable. Knowing how many are still out there is
 * half of what makes anyone go looking; knowing where they are would be the other half, so the
 * dial never says. The centre plays and stops, and reads back whichever point you are touching.
 */
export function TrackDial({
  tracks,
  currentId,
  isPlaying,
  onSelect,
  onToggle,
  onClose,
  volume,
  onVolume,
}: TrackDialProps) {
  const [hovered, setHovered] = useState<DialTrack | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const unlocked = tracks.filter((track) => !track.locked).length
  const showing = hovered ?? tracks.find((track) => track.id === currentId) ?? tracks[0]

  return (
    <div className="dial-layer">
      <button className="dial-layer__backdrop" onClick={onClose} aria-label="Close" />

      {tracks.length > unlocked && (
        <p className="dial__hunt">
          {tracks.length - unlocked} still hidden across the map
        </p>
      )}

      <div className="dial" role="group" aria-label="Ambience">
        <svg className="dial__ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="dial__track" cx="50" cy="50" r={RADIUS} />
        </svg>

        {tracks.map((track, index) => {
          // Start at the top and go round clockwise, so the two that were always there sit where
          // the eye lands first.
          const angle = (index / tracks.length) * Math.PI * 2 - Math.PI / 2
          const isCurrent = track.id === currentId
          return (
            <button
              key={track.id}
              className={`dial__dot${track.locked ? ' is-locked' : ''}${
                isCurrent ? ' is-current' : ''
              }`}
              style={{
                left: `calc(50% + ${Math.cos(angle) * RADIUS}%)`,
                top: `calc(50% + ${Math.sin(angle) * RADIUS}%)`,
              }}
              disabled={track.locked}
              onClick={() => onSelect(track.id)}
              onMouseEnter={() => setHovered(track)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(track)}
              onBlur={() => setHovered(null)}
              aria-label={track.locked ? 'Still hidden' : `Play ${track.name}`}
            >
              <span className="dial__pip" />
            </button>
          )
        })}

        <button
          className={`dial__centre${isPlaying ? ' is-playing' : ''}`}
          onClick={onToggle}
          aria-label={isPlaying ? 'Stop ambience' : 'Play ambience'}
        >
          <span className="dial__name">{showing.locked ? 'Still hidden' : showing.name}</span>
          <span className="dial__state">
            {showing.locked
              ? `${tracks.length - unlocked} left to find`
              : isPlaying
                ? 'Playing'
                : 'Paused'}
          </span>
        </button>
      </div>

      {/* Loudness belongs with the music, not on the map, and the dial is where the music lives. */}
      <label className="volume">
        <span className="visually-hidden">Volume</span>
        <svg className="volume__icon" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 7.6 H7 L11 4 V16 L7 12.4 H4 Z" />
          <path className="volume__wave" d="M13.6 7.4 A3.6 3.6 0 0 1 13.6 12.6" />
          <path className="volume__wave" d="M15.8 5.2 A6.8 6.8 0 0 1 15.8 14.8" />
        </svg>
        <input
          className="volume__slider"
          type="range"
          min="0"
          max="1"
          step="0.02"
          value={volume}
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </label>
    </div>
  )
}
