/**
 * Aircraft are drawn by the GPU, not the DOM, so their icons have to exist as images. Both are
 * painted once into a canvas at load and handed to MapLibre; from then on ninety aircraft cost
 * the same as one.
 *
 * The nose points up in the source image, so an `icon-rotate` of 0 is true north and the heading
 * from OpenSky can be applied raw -- with `icon-rotation-alignment: 'map'` it stays geographically
 * correct however far the map itself is turned.
 */

const SIZE = 44
const SCALE = 2

export type AircraftSprite = { id: string; image: ImageData }

/**
 * An airliner seen from directly above, nose up: pointed nose, slim fuselage, swept wings and a
 * small tailplane. Only the right-hand side is written out -- the left is its mirror, which keeps
 * the silhouette exactly symmetrical and the shape half as long to describe.
 *
 * Coordinates are in the 44-unit icon box with the aircraft centred on (22, 22).
 */
const SILHOUETTE: ReadonlyArray<readonly [number, number]> = [
  [22, 3.5], // nose
  [23.3, 9],
  [23.5, 17], // wing root, leading edge
  [37.5, 26.5], // wing tip, leading edge
  [37.5, 28.4], // wing tip, trailing edge
  [23.9, 24.6], // wing root, trailing edge
  [23.5, 31],
  [28.8, 36], // tailplane tip, leading edge
  [28.8, 37.6], // tailplane tip, trailing edge
  [22, 35], // tail
]

function drawAircraft(colour: string, glow: string): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  const centre = SIZE / 2

  // A short line ahead of the nose: where it is going, drawn faintly enough to read as motion
  // rather than as another mark.
  ctx.strokeStyle = colour
  ctx.globalAlpha = 0.28
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(centre, centre - 20)
  ctx.lineTo(centre, centre - 13)
  ctx.stroke()
  ctx.globalAlpha = 1

  // The glow is baked into the sprite rather than layered, so there is one draw call per aircraft.
  ctx.shadowColor = glow
  ctx.shadowBlur = 3.5
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.moveTo(SILHOUETTE[0][0], SILHOUETTE[0][1])
  for (const [x, y] of SILHOUETTE.slice(1)) ctx.lineTo(x, y)
  // Back up the other side, skipping the nose and tail so they are not drawn twice.
  for (const [x, y] of [...SILHOUETTE].reverse().slice(1, -1)) ctx.lineTo(2 * centre - x, y)
  ctx.closePath()
  ctx.fill()

  return ctx.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE)
}

export const AIRCRAFT_SPRITES: AircraftSprite[] = [
  { id: 'aircraft', image: drawAircraft('#e9eef2', 'rgba(233, 238, 242, 0.4)') },
  { id: 'aircraft-selected', image: drawAircraft('#5fd4cd', 'rgba(95, 212, 205, 0.65)') },
]

export const SPRITE_PIXEL_RATIO = SCALE

/**
 * The viewer. One dot, a halo that breathes about as slowly as you do, and -- only where the
 * device knows which way it is pointing -- a wedge showing where you are facing.
 *
 * This is the one thing still drawn in the DOM: it is a single element, and CSS gives it a
 * softer glow than a canvas sprite would.
 */
export function createViewerElement(): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'viewer'
  element.innerHTML = `
    <svg class="viewer__facing" viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <radialGradient id="overhead-facing" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.5" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </radialGradient>
      </defs>
      <path d="M48 48 L27 6.6 A46 46 0 0 1 69 6.6 Z" fill="url(#overhead-facing)" />
    </svg>
    <span class="viewer__pulse"></span>
    <span class="viewer__pulse viewer__pulse--offset"></span>
    <span class="viewer__dot"></span>
  `
  return element
}
