/**
 * OVERHEAD's ambience.
 *
 * Two tracks are always there: recipes the browser synthesises, needing no assets and no licence.
 * The rest are hidden. Each one is buried over a place worth flying to -- a wonder, a landmark,
 * somewhere you already know the name of -- and only becomes playable once the map has been
 * carried there. Nothing marks them on first sight; you have to go looking.
 *
 * To add another: drop the file in `public/audio/`, add an entry with `kind: 'file'` and a `place`,
 * and it joins the hunt. Use only music you own or that is licensed for the purpose.
 */

type BaseTrack = { id: string; name: string }

export type SynthTrack = BaseTrack & {
  kind: 'synth'
  /** Root frequency in Hz. */
  root: number
  /** Semitone offsets stacked above the root. */
  intervals: number[]
  /** Master lowpass cutoff in Hz -- lower is further away. */
  cutoff: number
  /** How fast the pad breathes, in Hz. Keep well under 0.1. */
  drift: number
  /** Level of the filtered noise bed, 0 to 1. */
  air: number
}

/** Where a track is buried, and what to call the place when it is found. */
export type HiddenPlace = { name: string; lat: number; lon: number }

export type FileTrack = BaseTrack & {
  kind: 'file'
  /** Path under `public/`. Looped seamlessly. */
  src: string
  /** Absent for a track that is simply available; present for one that must be found. */
  place?: HiddenPlace
}

export type AmbientTrack = SynthTrack | FileTrack

export const TRACKS: AmbientTrack[] = [
  {
    kind: 'synth',
    id: 'night-flight',
    name: 'Night Flight',
    root: 110,
    intervals: [0, 7, 12, 19, 24],
    cutoff: 620,
    drift: 0.045,
    air: 0.05,
  },
  {
    kind: 'synth',
    id: 'quiet-sky',
    name: 'Quiet Sky',
    root: 164.81,
    intervals: [0, 5, 12, 17, 24],
    cutoff: 940,
    drift: 0.028,
    air: 0.09,
  },

  // --- hidden, one over each place ---
  {
    kind: 'file',
    id: 'paris-after-rain',
    name: 'Paris After Rain',
    src: '/audio/paris-after-rain.mp3',
    place: { name: 'the Eiffel Tower', lat: 48.8584, lon: 2.2945 },
  },
  {
    kind: 'file',
    id: 'long-stone',
    name: 'Long Stone',
    src: '/audio/long-stone.mp3',
    place: { name: 'the Great Wall', lat: 40.4319, lon: 116.5704 },
  },
  {
    kind: 'file',
    id: 'cloud-forest',
    name: 'Cloud Forest',
    src: '/audio/cloud-forest.mp3',
    place: { name: 'Machu Picchu', lat: -13.1631, lon: -72.545 },
  },
  {
    kind: 'file',
    id: 'marble-dawn',
    name: 'Marble Dawn',
    src: '/audio/marble-dawn.mp3',
    place: { name: 'the Taj Mahal', lat: 27.1751, lon: 78.0421 },
  },
  {
    kind: 'file',
    id: 'open-arms',
    name: 'Open Arms',
    src: '/audio/open-arms.mp3',
    place: { name: 'Christ the Redeemer', lat: -22.9519, lon: -43.2105 },
  },
  {
    kind: 'file',
    id: 'slow-rome',
    name: 'Slow Rome',
    src: '/audio/slow-rome.mp3',
    place: { name: 'the Colosseum', lat: 41.8902, lon: 12.4922 },
  },
  {
    kind: 'file',
    id: 'rose-city',
    name: 'Rose City',
    src: '/audio/rose-city.mp3',
    place: { name: 'Petra', lat: 30.3285, lon: 35.4444 },
  },
  {
    kind: 'file',
    id: 'serpent-light',
    name: 'Serpent Light',
    src: '/audio/serpent-light.mp3',
    place: { name: 'Chichén Itzá', lat: 20.6843, lon: -88.5678 },
  },
  {
    kind: 'file',
    id: 'sand-and-static',
    name: 'Sand and Static',
    src: '/audio/sand-and-static.mp3',
    place: { name: 'the Pyramids of Giza', lat: 29.9792, lon: 31.1342 },
  },
  {
    kind: 'file',
    id: 'harbour-lights',
    name: 'Harbour Lights',
    src: '/audio/harbour-lights.mp3',
    place: { name: 'the Statue of Liberty', lat: 40.6892, lon: -74.0445 },
  },
  {
    kind: 'file',
    id: 'above-the-clouds',
    name: 'Above the Clouds',
    src: '/audio/above-the-clouds.mp3',
    place: { name: 'Mount Fuji', lat: 35.3606, lon: 138.7274 },
  },
  {
    kind: 'file',
    id: 'southern-shore',
    name: 'Southern Shore',
    src: '/audio/southern-shore.mp3',
    place: { name: 'the Sydney Opera House', lat: -33.8568, lon: 151.2153 },
  },
  {
    kind: 'file',
    id: 'old-circle',
    name: 'Old Circle',
    src: '/audio/old-circle.mp3',
    place: { name: 'Stonehenge', lat: 51.1789, lon: -1.8262 },
  },
]

/** Every track that has to be found, in the order they are listed above. */
export const HIDDEN_TRACKS = TRACKS.filter(
  (track): track is FileTrack & { place: HiddenPlace } =>
    track.kind === 'file' && track.place !== undefined,
)
