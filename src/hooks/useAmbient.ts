import { useCallback, useEffect, useRef, useState } from 'react'
import { STORED_VOLUME_KEY } from '../config'
import { AmbientEngine } from '../services/ambient/engine'
import type { AmbientTrack } from '../services/ambient/tracks'

/**
 * Ambient sound, always off until someone asks for it.
 *
 * Browsers block audio that starts without a user gesture, and starting uninvited would be the
 * wrong instinct here anyway. If the browser refuses -- autoplay policy, no Web Audio, a missing
 * file -- the control simply stays off. Nothing is ever reported as an error: there is no sound,
 * and the sky is unaffected.
 */
export function useAmbient(tracks: AmbientTrack[]) {
  const engineRef = useRef<AmbientEngine | null>(null)
  const isBusy = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [volume, setVolumeState] = useState(() => {
    try {
      // Silence is a choice worth remembering, so zero has to pass the guard as readily as one.
      const raw = window.localStorage.getItem(STORED_VOLUME_KEY)
      const stored = raw === null ? Number.NaN : Number(raw)
      return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 0.5
    } catch {
      return 0.5
    }
  })

  if (!engineRef.current) {
    engineRef.current = new AmbientEngine()
    engineRef.current.setVolume(volume)
  }
  // The list grows as tracks are uncovered, so the index is clamped rather than trusted.
  const track = tracks[Math.min(trackIndex, tracks.length - 1)]

  const toggle = useCallback(async () => {
    const engine = engineRef.current
    if (!engine?.isSupported || isBusy.current) return

    isBusy.current = true
    try {
      if (isPlaying) {
        engine.stop()
        setIsPlaying(false)
      } else {
        setIsPlaying(await engine.start(track))
      }
    } finally {
      isBusy.current = false
    }
  }, [isPlaying, track])

  /** Fade out, swap, fade in. Only reachable when there is more than one track to move to. */
  const next = useCallback(async () => {
    const engine = engineRef.current
    if (!engine?.isSupported || isBusy.current || tracks.length < 2) return

    const upcoming = (trackIndex + 1) % tracks.length
    setTrackIndex(upcoming)
    if (!isPlaying) return

    isBusy.current = true
    try {
      setIsPlaying(await engine.change(tracks[upcoming]))
    } finally {
      isBusy.current = false
    }
  }, [isPlaying, trackIndex, tracks])

  /**
   * Play one particular track now. Uncovering something and then having to go and find the
   * control to hear it would be a poor reward, so a discovery starts itself -- and because the
   * discovery is a tap, the browser counts it as the gesture that permits sound.
   */
  const play = useCallback(
    async (wanted: AmbientTrack) => {
      const engine = engineRef.current
      if (!engine?.isSupported || isBusy.current) return

      const index = tracks.findIndex((candidate) => candidate.id === wanted.id)
      if (index >= 0) setTrackIndex(index)

      isBusy.current = true
      try {
        setIsPlaying(isPlaying ? await engine.change(wanted) : await engine.start(wanted))
      } finally {
        isBusy.current = false
      }
    },
    [isPlaying, tracks],
  )

  useEffect(() => () => engineRef.current?.dispose(), [])

  const setVolume = useCallback((next: number) => {
    setVolumeState(next)
    engineRef.current?.setVolume(next)
    try {
      window.localStorage.setItem(STORED_VOLUME_KEY, String(next))
    } catch {
      // Remembering the level is a convenience, not a requirement.
    }
  }, [])

  /** Play a track chosen by id, which is how the dial asks for one. */
  const select = useCallback(
    (id: string) => {
      const wanted = tracks.find((candidate) => candidate.id === id)
      if (wanted) void play(wanted)
    },
    [play, tracks],
  )

  return {
    isPlaying,
    trackId: track.id,
    trackName: track.name,
    isSupported: engineRef.current.isSupported,
    canChangeTrack: tracks.length > 1,
    next,
    play,
    select,
    toggle,
    volume,
    setVolume,
  }
}

export type Ambient = ReturnType<typeof useAmbient>
