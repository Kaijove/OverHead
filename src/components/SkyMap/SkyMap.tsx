import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Feature, FeatureCollection, Polygon, Position } from 'geojson'
import { useEffect, useRef } from 'react'
import { AIRCRAFT_REFRESH_INTERVAL, CONTACT_FADE_OUT } from '../../config'
import type { Orientation } from '../../hooks/useDeviceOrientation'
import { AIRCRAFT_SPRITES, SPRITE_PIXEL_RATIO, createViewerElement } from '../../map/icons'
import { AircraftMotion } from '../../map/motion'
import { BASEMAP_LAYERS, skyStyle, type Basemap } from '../../map/style'
import type { Viewport } from '../../map/viewport'
import type { Aircraft } from '../../services/opensky/types'
import type { LatLng } from '../../utils/geo'
import 'maplibre-gl/dist/maplibre-gl.css'
import './SkyMap.css'

type SkyMapProps = {
  viewer: LatLng
  aircraft: Aircraft[]
  selectedId: string | null
  onSelect: (icao24: string | null) => void
  radiusKm: number
  /** Bumping this number re-frames the map on the viewer. */
  recenterNonce: number
  subscribeHeading: Orientation['subscribe']
  /** True while the map should turn with the device instead of holding north up. */
  followHeading: boolean
  basemap: Basemap
  /** Every buried place, and whether it has been uncovered yet. */
  places: DiscoveryPlace[]
  /** Called once the map stops moving, with wherever it came to rest. */
  onSettle: (centre: LatLng) => void
  /** Called when one of the buried marks is tapped. */
  onDiscover: (id: string) => void
  viewport: Viewport
}

export type DiscoveryPlace = { id: string; name: string; lat: number; lon: number; found: boolean }

/**
 * MapLibre parses tiles in a Web Worker, which it locates with a URL built at runtime. No bundler
 * can see through that, so the worker is never emitted and the map ends up silently drawing
 * nothing at all -- no error, no failed request, just an empty canvas. Handing over an explicit
 * URL that Vite does emit is the supported way out.
 */
setWorkerUrl(maplibreWorkerUrl)

const RING_FRACTIONS = [0.25, 0.5, 1]
const AIRCRAFT_SOURCE = 'aircraft'
const RING_SOURCE = 'rings'
const DISCOVERY_SOURCE = 'discoveries'

const emptyCollection = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] })

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * A ring of points all exactly `radiusKm` from the centre, walked around the compass.
 *
 * Scaling a degree of latitude and longitude separately is the quick way to do this and it is
 * wrong: the result is an ellipse that drifts off centre as the radius grows, which is glaring
 * the moment the map is turned. This walks a real great-circle bearing instead.
 */
function ringPolygon(centre: LatLng, radiusKm: number, weight: number): Feature<Polygon> {
  const points: Position[] = []
  const angular = radiusKm / EARTH_RADIUS_KM
  const lat = toRad(centre.lat)
  const lon = toRad(centre.lon)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)

  for (let step = 0; step <= 96; step += 1) {
    const bearing = toRad((step / 96) * 360)
    const pointLat = Math.asin(
      sinLat * Math.cos(angular) + cosLat * Math.sin(angular) * Math.cos(bearing),
    )
    const pointLon =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * cosLat,
        Math.cos(angular) - sinLat * Math.sin(pointLat),
      )
    points.push([toDeg(pointLon), toDeg(pointLat)])
  }

  return {
    type: 'Feature',
    properties: { weight },
    geometry: { type: 'Polygon', coordinates: [points] },
  }
}

export function SkyMap({
  viewer,
  aircraft,
  selectedId,
  onSelect,
  radiusKm,
  recenterNonce,
  subscribeHeading,
  followHeading,
  basemap,
  places,
  onSettle,
  onDiscover,
  viewport,
}: SkyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const motionRef = useRef<AircraftMotion | null>(null)
  const viewerMarkerRef = useRef<Marker | null>(null)
  const facingRef = useRef<SVGElement | null>(null)
  // MapLibre only accepts sources and layers once the style is up; work that arrives before
  // then waits here rather than being dropped.
  const readyRef = useRef<{ isReady: boolean; queue: (() => void)[] }>({ isReady: false, queue: [] })

  // Read inside callbacks that outlive a render, so the map is built exactly once.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onSettleRef = useRef(onSettle)
  onSettleRef.current = onSettle
  const onDiscoverRef = useRef(onDiscover)
  onDiscoverRef.current = onDiscover
  const placesRef = useRef(places)
  placesRef.current = places
  const refreshDiscoveriesRef = useRef<() => void>(() => {})
  const selectedIdRef = useRef(selectedId)
  const followRef = useRef(followHeading)
  followRef.current = followHeading

  const whenReady = (task: () => void) => {
    if (readyRef.current.isReady) task()
    else readyRef.current.queue.push(task)
  }

  // --- map, once ---
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = new MapLibreMap({
      container,
      style: skyStyle,
      center: [viewer.lon, viewer.lat],
      zoom: 7,
      attributionControl: false,
      // Rotation is the point: two fingers on a phone, right-drag or ctrl-drag on a desktop.
      // The desktop handler is our own, set up below.
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
      maxPitch: 0,
      // Nothing here needs street-level detail, and fewer tiles is a smoother phone.
      maxZoom: 12,
      // All the way out is the whole planet, framed -- not a marble lost in the black. Below
      // this the globe just keeps shrinking, which is further than anyone wants to go.
      minZoom: 1.7,
    })
    map.touchZoomRotate.enableRotation()
    map.keyboard.disable()

    // MapLibre's own drag-rotate reads horizontal movement only, so dragging in a circle turns
    // the map by however far your hand happened to travel sideways. Replaced with a real one:
    // grab anywhere and the map follows your hand around the centre, like spinning a globe.
    map.dragRotate.disable()
    const canvas = map.getCanvas()
    let spin: { pointerId: number; from: number; bearing: number } | null = null

    /** The angle of the pointer around the middle of the map, in degrees. */
    const angleAt = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect()
      const x = event.clientX - (box.left + box.width / 2)
      const y = event.clientY - (box.top + box.height / 2)
      return (Math.atan2(y, x) * 180) / Math.PI
    }

    const onPointerDown = (event: PointerEvent) => {
      const isRotating = event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey))
      if (!isRotating) return
      spin = { pointerId: event.pointerId, from: angleAt(event), bearing: map.getBearing() }
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
      event.preventDefault()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!spin || event.pointerId !== spin.pointerId) return
      // Screen angles grow clockwise while bearing grows anticlockwise, hence the subtraction:
      // it is what makes the map turn the same way as your hand rather than against it.
      map.setBearing(spin.bearing - (angleAt(event) - spin.from))
      event.preventDefault()
    }

    const endSpin = (event: PointerEvent) => {
      if (!spin || event.pointerId !== spin.pointerId) return
      canvas.releasePointerCapture?.(spin.pointerId)
      canvas.style.cursor = ''
      spin = null
    }

    const swallowMenu = (event: Event) => event.preventDefault()
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', endSpin)
    canvas.addEventListener('pointercancel', endSpin)
    canvas.addEventListener('contextmenu', swallowMenu)
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: 'Aircraft: OpenSky Network',
      }),
      'bottom-right',
    )
    // MapLibre opens the compact credit on first paint. The credit has to be reachable, not
    // permanently spread across the sky, so it starts folded into its own glyph.
    container.querySelector('details.maplibregl-ctrl-attrib')?.removeAttribute('open')

    const motion = new AircraftMotion(
      () => map.getSource(AIRCRAFT_SOURCE) as GeoJSONSource | undefined,
      AIRCRAFT_REFRESH_INTERVAL,
      CONTACT_FADE_OUT,
      () => selectedIdRef.current,
    )
    motionRef.current = motion

    // Deliberately not the `load` event: that one waits for the first visible render as well as
    // the style, so a map that has not been painted yet -- an occluded window, a tab opened in
    // the background -- would never get its layers at all. The style is all this needs.
    const build = () => {
      for (const sprite of AIRCRAFT_SPRITES) {
        map.addImage(sprite.id, sprite.image, { pixelRatio: SPRITE_PIXEL_RATIO })
      }

      map.addSource(RING_SOURCE, { type: 'geojson', data: emptyCollection() })
      map.addSource(AIRCRAFT_SOURCE, { type: 'geojson', data: emptyCollection() })

      // Two passes over the same rings: a wide blurred one for depth, a hairline for the edge.
      map.addLayer({
        id: 'ring-glow',
        type: 'line',
        source: RING_SOURCE,
        paint: {
          'line-color': '#5fd4cd',
          'line-width': 3,
          'line-blur': 4,
          'line-opacity': ['*', ['get', 'weight'], 0.16],
        },
      })
      map.addLayer({
        id: 'ring-edge',
        type: 'line',
        source: RING_SOURCE,
        paint: {
          'line-color': '#bed6e2',
          'line-width': 0.7,
          'line-opacity': ['*', ['get', 'weight'], 0.3],
        },
      })

      map.addSource(DISCOVERY_SOURCE, { type: 'geojson', data: emptyCollection() })

      // A place that has been found keeps a steady mark. One that has not shows only while it is
      // on screen -- but it has to look like something you can reach for, so it is a ring that
      // breathes rather than a smudge that might be nothing.
      map.addLayer({
        id: 'discovery-glow',
        type: 'circle',
        source: DISCOVERY_SOURCE,
        paint: {
          'circle-color': '#5fd4cd',
          'circle-radius': 20,
          'circle-blur': 1,
          'circle-opacity': ['case', ['==', ['get', 'found'], 1], 0.34, 0.24],
        },
      })
      map.addLayer({
        id: 'discovery-ring',
        type: 'circle',
        source: DISCOVERY_SOURCE,
        paint: {
          'circle-color': 'transparent',
          'circle-radius': 10,
          'circle-stroke-color': '#5fd4cd',
          'circle-stroke-width': 1.4,
          'circle-stroke-opacity': ['case', ['==', ['get', 'found'], 1], 0.95, 0.7],
          // Toggled between two values on a slow timer; the GPU does the easing, so the breath
          // costs a couple of calls a second rather than a frame loop.
          'circle-radius-transition': { duration: 1800, delay: 0 },
          'circle-stroke-opacity-transition': { duration: 1800, delay: 0 },
        },
      })
      map.addLayer({
        id: 'discovery-core',
        type: 'circle',
        source: DISCOVERY_SOURCE,
        paint: {
          'circle-color': '#5fd4cd',
          'circle-radius': ['case', ['==', ['get', 'found'], 1], 3.4, 3],
          'circle-opacity': 0.95,
        },
      })
      // The ring is small; what you can tap is not.
      map.addLayer({
        id: 'discovery-hit',
        type: 'circle',
        source: DISCOVERY_SOURCE,
        paint: { 'circle-radius': 26, 'circle-opacity': 0 },
      })

      // An invisible disc under each aircraft: the visible mark is small, the target is not.
      map.addLayer({
        id: 'aircraft-hit',
        type: 'circle',
        source: AIRCRAFT_SOURCE,
        paint: { 'circle-radius': 20, 'circle-opacity': 0 },
      })
      map.addLayer({
        id: 'aircraft',
        type: 'symbol',
        source: AIRCRAFT_SOURCE,
        layout: {
          'icon-image': ['case', ['==', ['get', 'sel'], 1], 'aircraft-selected', 'aircraft'],
          'icon-rotate': ['get', 'hdg'],
          // A heading is a compass bearing, so it turns with the map, never with the screen.
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Aircraft parked at an airport are not overhead. They stay on the map because they
          // are really there, but they shrink out of the way of the ones that are flying.
          'icon-size': ['case', ['==', ['get', 'gnd'], 1], 0.4, 0.7],
        },
        paint: { 'icon-opacity': ['get', 'op'] },
      })
      map.addLayer({
        id: 'aircraft-label',
        type: 'symbol',
        source: AIRCRAFT_SOURCE,
        filter: ['==', ['get', 'sel'], 1],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.7],
          'text-letter-spacing': 0.12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#5fd4cd', 'text-opacity': 0.9 },
      })

      readyRef.current.isReady = true
      refreshDiscoveries()
      for (const task of readyRef.current.queue) task()
      readyRef.current.queue = []
      motion.refresh()
    }

    // `isStyleLoaded()` is not the test to use here: it also waits for the source's tiles, and
    // tiles only start loading once the map renders. A style layer existing is proof enough that
    // the style document has been parsed and will accept layers of our own.
    const isStyleParsed = () => Boolean(map.getLayer('background'))
    const onStyleData = () => {
      if (readyRef.current.isReady || !isStyleParsed()) return
      map.off('styledata', onStyleData)
      build()
    }
    if (isStyleParsed()) build()
    else map.on('styledata', onStyleData)

    // A tile server having a bad day should not be a silent black rectangle. MapLibre reports
    // everything through this one event, so it is the only place a map failure can surface.
    map.on('error', (event) => {
      console.warn('[overhead] map', event.error?.message ?? event)
    })

    const refreshDiscoveries = () => {
      const source = map.getSource(DISCOVERY_SOURCE) as GeoJSONSource | undefined
      if (!source) return

      const bounds = map.getBounds()
      // MapLibre lets you pan around the world for ever, so its longitudes run past 180 and a
      // place has to be moved into whichever copy of the world is currently on screen.
      const centreLon = map.getCenter().lng
      source.setData({
        type: 'FeatureCollection',
        features: placesRef.current
          .map((place) => ({
            ...place,
            lon: place.lon + Math.round((centreLon - place.lon) / 360) * 360,
          }))
          .filter((place) => place.found || bounds.contains([place.lon, place.lat]))
          .map((place) => ({
            type: 'Feature' as const,
            properties: { id: place.id, found: place.found ? 1 : 0 },
            geometry: { type: 'Point' as const, coordinates: [place.lon, place.lat] },
          })),
      })
    }
    refreshDiscoveriesRef.current = refreshDiscoveries

    const onMove = () => viewport.report(map.getBearing())
    map.on('rotate', onMove)
    map.on('moveend', () => {
      onMove()
      refreshDiscoveries()
      const centre = map.getCenter()
      onSettleRef.current({ lat: centre.lat, lon: centre.lng })
    })

    map.on('click', (event: MapMouseEvent) => {
      // A tap can land before the layers exist; querying a missing layer throws.
      if (!readyRef.current.isReady) return

      // A buried mark wins over an aircraft: it is the smaller, rarer, more deliberate target.
      const buried = map.queryRenderedFeatures(event.point, { layers: ['discovery-hit'] })
      const id = buried[0]?.properties?.id
      if (typeof id === 'string') {
        onDiscoverRef.current(id)
        return
      }

      const hits = map.queryRenderedFeatures(event.point, { layers: ['aircraft-hit'] })
      const icao24 = hits[0]?.properties?.icao24
      onSelectRef.current(typeof icao24 === 'string' ? icao24 : null)
    })

    for (const layer of ['aircraft-hit', 'discovery-hit']) {
      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    // The breath. Two paint values swapped on a slow timer, eased by the GPU in between.
    let isWide = false
    const breathe = window.setInterval(() => {
      if (!readyRef.current.isReady || document.hidden) return
      isWide = !isWide
      map.setPaintProperty('discovery-ring', 'circle-radius', isWide ? 15 : 9)
      map.setPaintProperty('discovery-ring', 'circle-stroke-opacity', isWide ? 0.35 : 0.85)
    }, 1800)

    const unbind = viewport.bind({
      resetNorth: () => map.easeTo({ bearing: 0, duration: prefersReducedMotion() ? 0 : 600 }),
      setBearing: (bearing) => map.setBearing(bearing),
    })

    mapRef.current = map
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endSpin)
      canvas.removeEventListener('pointercancel', endSpin)
      canvas.removeEventListener('contextmenu', swallowMenu)
      window.clearInterval(breathe)
      unbind()
      motion.destroy()
      motionRef.current = null
      viewerMarkerRef.current = null
      facingRef.current = null
      readyRef.current = { isReady: false, queue: [] }
      map.remove()
      mapRef.current = null
    }
    // Built once; the effects below keep it in step with the props.
  }, [])

  // --- viewer marker and range rings ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const place = () => {
      const source = map.getSource(RING_SOURCE) as GeoJSONSource | undefined
      source?.setData({
        type: 'FeatureCollection',
        features: RING_FRACTIONS.map((fraction) =>
          ringPolygon(viewer, radiusKm * fraction, fraction === 1 ? 0.7 : 1),
        ),
      })

      if (!viewerMarkerRef.current) {
        const element = createViewerElement()
        facingRef.current = element.querySelector('.viewer__facing')
        viewerMarkerRef.current = new Marker({
          element,
          // The wedge points at a true bearing, so it turns with the map.
          rotationAlignment: 'map',
          pitchAlignment: 'map',
        })
          .setLngLat([viewer.lon, viewer.lat])
          .addTo(map)
      } else {
        viewerMarkerRef.current.setLngLat([viewer.lon, viewer.lat])
      }
    }

    whenReady(place)
  }, [viewer.lat, viewer.lon, radiusKm])

  // --- frame the sky we are watching ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const frame = () => {
      // Frame the outermost ring itself rather than an approximation of it, so the edge of the
      // sky we are watching always lands just inside the edge of the screen.
      const outer = ringPolygon(viewer, radiusKm, 1).geometry.coordinates[0]
      const lons = outer.map((point) => point[0])
      const lats = outer.map((point) => point[1])
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 28, duration: prefersReducedMotion() ? 0 : 1400, bearing: map.getBearing() },
      )
    }

    whenReady(frame)
  }, [viewer.lat, viewer.lon, radiusKm, recenterNonce])

  // --- device heading: the facing wedge, and the map itself when following ---
  useEffect(
    () =>
      subscribeHeading((heading) => {
        if (facingRef.current) {
          facingRef.current.style.opacity = '1'
          // The marker already turns with the map, so the wedge carries only the device angle.
          viewerMarkerRef.current?.setRotation(heading)
        }
        if (followRef.current) mapRef.current?.setBearing(heading)
      }),
    [subscribeHeading],
  )

  // Leaving follow mode should settle somewhere deliberate rather than wherever it stopped.
  useEffect(() => {
    if (!followHeading) viewport.resetNorth()
  }, [followHeading, viewport])

  // --- basemap ---
  // Both looks live in the one style, so switching is a visibility toggle. Calling `setStyle`
  // would throw away the aircraft, the rings and the sprites and make us build them all again.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    whenReady(() => {
      for (const [name, layers] of Object.entries(BASEMAP_LAYERS)) {
        for (const layer of layers) {
          map.setLayoutProperty(layer, 'visibility', name === basemap ? 'visible' : 'none')
        }
      }
    })
  }, [basemap])

  // --- buried places ---
  useEffect(() => {
    whenReady(() => refreshDiscoveriesRef.current())
  }, [places])

  // --- aircraft ---
  // React's job ends here: it hands over the latest response and the motion layer does the rest.
  useEffect(() => {
    motionRef.current?.update(aircraft)
  }, [aircraft])

  // Selection is a paint change on one feature, not a reason to restart every glide.
  useEffect(() => {
    selectedIdRef.current = selectedId
    motionRef.current?.refresh()
  }, [selectedId])

  return <div className="sky-map" ref={containerRef} />
}
