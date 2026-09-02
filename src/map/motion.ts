import type { GeoJSONSource } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import { MAX_PLAUSIBLE_SPEED_KMH } from '../config'
import type { Aircraft } from '../services/opensky/types'
import { distanceKm } from '../utils/geo'

/**
 * The visual layer for aircraft, kept deliberately apart from the API data.
 *
 * OpenSky hands us a fresh position every fifteen seconds. Drawing those directly would make the
 * sky twitch, so every contact remembers where it was last drawn and walks to where it has just
 * been reported. One animation frame loop moves all of them and pushes a single GeoJSON update
 * into the map -- React never sees a frame, and the GPU draws the result.
 *
 * Nothing here writes back into the aircraft data: what the card reads is always what the API said.
 */

const FADE_IN = 700

type Sample = { lat: number; lon: number; rotation: number }

type Contact = {
  from: Sample
  to: Sample
  /** Start and length of the walk from `from` to `to`, in milliseconds. */
  startedAt: number
  enteredAt: number
  /** Set once the aircraft stops being reported; it fades, then goes. */
  leavingAt: number | null
  isOnGround: boolean
  /** Shown beside the aircraft when it is the selected one. */
  label: string
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t


/** 359 to 1 degrees is a 2 degree turn, not a 358 degree spin. Keep winding the angle forward. */
const unwrap = (previous: number, heading: number) =>
  previous + ((((heading - previous) % 360) + 540) % 360) - 180

export class AircraftMotion {
  private contacts = new Map<string, Contact>()
  private frame: number | null = null

  constructor(
    private readonly getSource: () => GeoJSONSource | undefined,
    /** How long a contact takes to walk between two reported positions. */
    private readonly travelDuration: number,
    private readonly fadeOutDuration: number,
    private getSelectedId: () => string | null,
  ) {
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  /** Frames stop while the tab is hidden; pick the glide back up on return. */
  private readonly onVisibilityChange = () => {
    if (!document.hidden) this.start()
  }

  /** Hand over a fresh response. Positions are targets to move towards, not places to jump to. */
  update(aircraft: Aircraft[]) {
    const now = performance.now()
    const seen = new Set<string>()

    for (const plane of aircraft) {
      seen.add(plane.icao24)
      const existing = this.contacts.get(plane.icao24)

      if (!existing) {
        const sample = { lat: plane.lat, lon: plane.lon, rotation: plane.headingDeg ?? 0 }
        this.contacts.set(plane.icao24, {
          from: sample,
          to: sample,
          startedAt: now,
          enteredAt: now,
          leavingAt: null,
          isOnGround: plane.onGround,
          label: plane.callsign ?? plane.icao24.toUpperCase(),
        })
        continue
      }

      // Start the next leg from wherever the aircraft is being drawn right now, never from the
      // last reported point -- otherwise it snaps backwards before setting off again.
      const drawn = this.sampleAt(existing, now)
      const target: Sample = {
        lat: plane.lat,
        lon: plane.lon,
        rotation: unwrap(drawn.rotation, plane.headingDeg ?? drawn.rotation),
      }

      // Could an aircraft actually have covered this since we last heard from it? After a long
      // outage or a backgrounded tab it could not, and animating the gap would send it streaking
      // across the map. Place it where it is instead.
      const gapMs = Math.max(now - existing.startedAt, this.travelDuration)
      const plausibleKm = MAX_PLAUSIBLE_SPEED_KMH * (gapMs / 3_600_000)

      existing.from = distanceKm(drawn, target) <= plausibleKm ? drawn : target
      existing.to = target
      existing.startedAt = now
      existing.isOnGround = plane.onGround
      existing.label = plane.callsign ?? plane.icao24.toUpperCase()
      // It came back before it finished leaving.
      existing.leavingAt = null
    }

    for (const [icao24, contact] of this.contacts) {
      if (seen.has(icao24)) continue
      // Do not yank it off the map mid-glide; let it dim out where it was last seen.
      contact.leavingAt ??= now
    }

    this.start()
  }

  /** Selection is a paint change, so redraw once rather than waiting for the next frame. */
  refresh() {
    this.start()
  }

  destroy() {
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
    this.contacts.clear()
  }

  /** Where a contact should be drawn at `now`. Linear: aircraft do not ease into their cruise. */
  private sampleAt(contact: Contact, now: number): Sample {
    const t = Math.min(1, Math.max(0, (now - contact.startedAt) / this.travelDuration))
    return {
      lat: lerp(contact.from.lat, contact.to.lat, t),
      lon: lerp(contact.from.lon, contact.to.lon, t),
      rotation: lerp(contact.from.rotation, contact.to.rotation, t),
    }
  }

  private start() {
    if (this.frame !== null) return
    this.frame = requestAnimationFrame(this.tick)
  }

  private readonly tick = () => {
    const source = this.getSource()
    if (!source) {
      this.frame = null
      return
    }

    const now = performance.now()
    const selectedId = this.getSelectedId()
    const features: Feature<Point>[] = []
    let isBusy = false

    for (const [icao24, contact] of this.contacts) {
      let opacity = contact.isOnGround ? 0.38 : 1

      if (contact.leavingAt !== null) {
        const fade = (now - contact.leavingAt) / this.fadeOutDuration
        if (fade >= 1) {
          this.contacts.delete(icao24)
          continue
        }
        opacity *= 1 - fade
        isBusy = true
      } else {
        const entry = Math.min(1, (now - contact.enteredAt) / FADE_IN)
        opacity *= entry
        if (entry < 1) isBusy = true
      }

      const sample = this.sampleAt(contact, now)
      features.push({
        type: 'Feature',
        id: icao24,
        geometry: { type: 'Point', coordinates: [sample.lon, sample.lat] },
        properties: {
          icao24,
          label: contact.label,
          hdg: sample.rotation,
          op: opacity,
          sel: icao24 === selectedId ? 1 : 0,
          gnd: contact.isOnGround ? 1 : 0,
        },
      })

      if (now - contact.startedAt < this.travelDuration) isBusy = true
    }

    source.setData({ type: 'FeatureCollection', features })

    // Nothing left to animate: stop burning frames until the next response arrives.
    this.frame = isBusy && !document.hidden ? requestAnimationFrame(this.tick) : null
  }
}
