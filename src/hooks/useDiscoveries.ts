import { useCallback, useMemo, useState } from 'react'
import { DISCOVERY_RADIUS_KM, STORED_FOUND_KEY } from '../config'
import { HIDDEN_TRACKS, TRACKS, type AmbientTrack, type FileTrack, type HiddenPlace } from '../services/ambient/tracks'
import { distanceKm, type LatLng } from '../utils/geo'

export type Discovery = FileTrack & { place: HiddenPlace }

function readFound(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORED_FOUND_KEY)
    const ids: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    // Private mode, disabled storage, a corrupted value -- start the hunt over rather than break.
    return new Set()
  }
}

/**
 * The hunt.
 *
 * Music is buried over places worth flying to, and stays sealed until the map is carried within
 * reach of one. Nothing is listed, nothing is signposted; the only clue is the one the opening
 * screen gives you. What has been found is remembered on this device and nowhere else.
 */
export function useDiscoveries() {
  const [found, setFound] = useState<Set<string>>(readFound)

  /**
   * Called as the map settles. Returns the track that was just uncovered, if any, so the app can
   * say so -- and nothing at all on the overwhelming majority of moves.
   */
  const search = useCallback(
    (centre: LatLng): Discovery | null => {
      const reached = HIDDEN_TRACKS.find(
        (track) => !found.has(track.id) && distanceKm(centre, track.place) <= DISCOVERY_RADIUS_KM,
      )
      if (!reached) return null

      setFound((previous) => {
        const next = new Set(previous).add(reached.id)
        try {
          window.localStorage.setItem(STORED_FOUND_KEY, JSON.stringify([...next]))
        } catch {
          // Remembering is a convenience; the track is unlocked for this visit regardless.
        }
        return next
      })
      return reached
    },
    [found],
  )

  /** The track buried at a place, found or not -- a mark you have already opened still plays. */
  const trackAt = useCallback(
    (id: string): Discovery | null => HIDDEN_TRACKS.find((track) => track.id === id) ?? null,
    [],
  )

  /** Uncover one directly, which is what happens when its mark on the map is tapped. */
  const reveal = useCallback(
    (id: string): Discovery | null => {
      const track = HIDDEN_TRACKS.find((candidate) => candidate.id === id)
      if (!track || found.has(id)) return null

      setFound((previous) => {
        const next = new Set(previous).add(id)
        try {
          window.localStorage.setItem(STORED_FOUND_KEY, JSON.stringify([...next]))
        } catch {
          // Remembering is a convenience; the track is unlocked for this visit regardless.
        }
        return next
      })
      return track
    },
    [found],
  )

  /** What can actually be played: the two that were always there, plus whatever has been found. */
  const available = useMemo<AmbientTrack[]>(
    () => TRACKS.filter((track) => track.kind === 'synth' || !track.place || found.has(track.id)),
    [found],
  )

  /**
   * Every track there is, each flagged with whether it is still sealed. The dial draws all of
   * them: seeing how many are missing is part of the point, seeing where they are is not.
   */
  const catalogue = useMemo(
    () =>
      TRACKS.map((track) => ({
        id: track.id,
        name: track.name,
        locked: track.kind === 'file' && track.place !== undefined && !found.has(track.id),
      })),
    [found],
  )

  return {
    available,
    catalogue,
    search,
    reveal,
    trackAt,
    foundCount: found.size,
    total: HIDDEN_TRACKS.length,
    /** Every buried place, flagged with whether it has been uncovered, for the map to hint at. */
    places: useMemo(
      () => HIDDEN_TRACKS.map((track) => ({ ...track.place, id: track.id, found: found.has(track.id) })),
      [found],
    ),
  }
}
