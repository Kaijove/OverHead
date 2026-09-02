import type { StyleSpecification } from 'maplibre-gl'

/**
 * OVERHEAD's basemap, written by hand rather than borrowed.
 *
 * Both looks live in one style and are switched by toggling layer visibility, so changing the
 * map never tears down the aircraft, the rings or the sprites hanging off it.
 *
 * Off-the-shelf styles draw roads, buildings, parks and transit, and every one of them competes
 * with the aircraft. This asks the vector tiles for four things only -- water, rivers, borders,
 * and the names of large places -- and paints them at barely any contrast.
 *
 * Vector tiles come from OpenFreeMap and imagery from Esri: OpenStreetMap and satellite data,
 * no key, no account, no quota.
 */

const VECTOR_TILES = 'https://tiles.openfreemap.org/planet'
const IMAGERY_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
/** NASA's VIIRS Black Marble: the whole planet as it looks from orbit after dark. */
const NIGHT_TILES =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'

/*
 * Sodium amber -- the colour a city actually is from the air at night, and the one the NASA
 * imagery is already painted in, so the handover between them passes unnoticed.
 */
const CITY_GLOW = '#ffbe72'
const CITY_CORE = '#ffe3b8'

const LAND = '#101823'
const WATER = '#070d15'
const BORDER = 'rgba(190, 214, 226, 0.18)'
const LABEL = 'rgba(203, 223, 233, 0.52)'

export type Basemap = 'satellite' | 'dark'

/** Layers that belong to one look or the other, so the toggle knows what to show and hide. */
export const BASEMAP_LAYERS: Record<Basemap, string[]> = {
  satellite: ['satellite'],
  dark: [
    'nightlights',
    'water',
    'waterway',
    'city-haze',
    'city-halo',
    'city-roads',
    'city-runways',
  ],
}

export const skyStyle: StyleSpecification = {
  version: 8,
  // Zoomed all the way out the map becomes the planet, the way it actually is.
  projection: { type: 'globe' },
  // Glyphs are needed for the few labels that survive; OpenFreeMap serves its own.
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    land: { type: 'vector', url: VECTOR_TILES },
    nightlights: {
      type: 'raster',
      tiles: [NIGHT_TILES],
      tileSize: 256,
      maxzoom: 8,
      attribution: 'Night lights: NASA Earth Observatory (VIIRS)',
    },
    imagery: {
      type: 'raster',
      tiles: [IMAGERY_TILES],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imagery: Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': LAND } },
    {
      // City lights, everywhere on Earth. It sits under the water fill so the coastline still
      // reads, and the lights themselves are bright enough to carry the whole map on their own.
      //
      // The imagery is only surveyed down to zoom 8. Past that there is nothing more to show, and
      // stretching what there is turns every city into a smear -- so instead it fades out and
      // hands the view over to the vector map, which sharpens exactly as the lights let go.
      id: 'nightlights',
      type: 'raster',
      source: 'nightlights',
      layout: { visibility: 'none' },
      paint: {
        'raster-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.95, 7.5, 0.92, 9.8, 0],
        'raster-saturation': -0.15,
        'raster-contrast': 0.12,
        'raster-resampling': 'linear',
        'raster-fade-duration': 450,
      },
    },
    {
      // Satellite imagery is bright, warm and extremely busy -- everything this app is not. It
      // is desaturated and its highlights crushed until it sits at night, behind the aircraft
      // rather than in front of them.
      id: 'satellite',
      type: 'raster',
      source: 'imagery',
      paint: {
        'raster-opacity': 0.92,
        'raster-saturation': -0.4,
        'raster-brightness-max': 0.86,
        'raster-contrast': -0.04,
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'land',
      'source-layer': 'water',
      layout: { visibility: 'none' },
      paint: { 'fill-color': WATER },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'land',
      'source-layer': 'waterway',
      minzoom: 7,
      layout: { visibility: 'none' },
      paint: {
        'line-color': WATER,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 14, 2.4],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 11, 1],
      },
    },
    {
      /*
       * Below zoom 8 the night is a photograph; above it, the night is drawn.
       *
       * NASA surveyed the Black Marble down to about half a kilometre a pixel and no further, so
       * zooming into it only magnifies its grain. These four layers take over exactly as it
       * fades: the same amber light, but rebuilt live from the vector map, which means it stays
       * needle-sharp however far in you go -- and a city genuinely assembles itself as you
       * approach, districts first, then avenues, then the small streets between them.
       */
      id: 'city-haze',
      type: 'fill',
      source: 'land',
      'source-layer': 'landuse',
      minzoom: 7,
      layout: { visibility: 'none' },
      filter: [
        'match',
        ['get', 'class'],
        ['residential', 'suburb', 'quarter', 'neighbourhood', 'commercial', 'retail', 'industrial'],
        true,
        false,
      ],
      paint: {
        'fill-color': CITY_GLOW,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7.6, 0, 9.8, 0.055, 13, 0.085],
      },
    },
    {
      // The spill of light around a road, wide and soft. Drawn first so every street sits in it.
      id: 'city-halo',
      type: 'line',
      source: 'land',
      'source-layer': 'transportation',
      minzoom: 7,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      filter: [
        'match',
        ['get', 'class'],
        ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'],
        true,
        false,
      ],
      paint: {
        'line-color': CITY_GLOW,
        'line-blur': 4,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          ['match', ['get', 'class'], ['motorway', 'trunk'], 2, 1],
          14,
          ['match', ['get', 'class'], ['motorway', 'trunk'], 11, ['primary'], 8, 5],
        ],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7.6, 0, 9.8, 0.22],
      },
    },
    {
      // And the filament inside it: thin, bright, and the thing that reads as a real street.
      id: 'city-roads',
      type: 'line',
      source: 'land',
      'source-layer': 'transportation',
      minzoom: 7,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      filter: [
        'match',
        ['get', 'class'],
        ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'],
        true,
        false,
      ],
      paint: {
        'line-color': CITY_CORE,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          ['match', ['get', 'class'], ['motorway', 'trunk'], 0.5, 0.25],
          14,
          ['match', ['get', 'class'], ['motorway', 'trunk'], 2.4, ['primary'], 1.6, 0.9],
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7.6,
          0,
          9.8,
          ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 0.6, 0.38],
        ],
      },
    },
    {
      // Airports, which from the air are the brightest and most deliberate light of all -- and in
      // an app about aeroplanes, the one piece of ground worth pointing at.
      id: 'city-runways',
      type: 'line',
      source: 'land',
      'source-layer': 'aeroway',
      minzoom: 8,
      layout: { visibility: 'none', 'line-cap': 'round' },
      filter: ['match', ['get', 'class'], ['runway', 'taxiway'], true, false],
      paint: {
        'line-color': CITY_CORE,
        'line-blur': 1.4,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          ['match', ['get', 'class'], ['runway'], 1.6, 0.6],
          14,
          ['match', ['get', 'class'], ['runway'], 6, 2],
        ],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 8.6, 0, 10.2, 0.7],
      },
    },
    {
      id: 'border-country',
      type: 'line',
      source: 'land',
      'source-layer': 'boundary',
      filter: ['==', ['get', 'admin_level'], 2],
      paint: { 'line-color': BORDER, 'line-width': 0.8 },
    },
    {
      id: 'border-region',
      type: 'line',
      source: 'land',
      'source-layer': 'boundary',
      minzoom: 6,
      filter: ['==', ['get', 'admin_level'], 4],
      paint: { 'line-color': BORDER, 'line-width': 0.5, 'line-opacity': 0.5 },
    },
    {
      // Enough names to know where you are, and not one more. Only real cities, only once you
      // are close enough for it to mean something, and never loud enough to read first.
      id: 'place',
      type: 'symbol',
      source: 'land',
      'source-layer': 'place',
      minzoom: 5,
      filter: ['all', ['==', ['get', 'class'], 'city'], ['<=', ['get', 'rank'], 8]],
      layout: {
        'text-field': ['get', 'name:latin'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 10, 11],
        'text-letter-spacing': 0.16,
        'text-transform': 'uppercase',
        'text-max-width': 8,
        'text-padding': 12,
      },
      paint: { 'text-color': LABEL, 'text-halo-color': 'rgba(5, 8, 13, 0.6)', 'text-halo-width': 1.2 },
    },
  ],
}
