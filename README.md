# OVERHEAD

**See what's above you.**

✈ Live nearby aircraft · 🧭 Real compass · 🎧 Ambient audio · 📍 Your location

Somewhere above you there is an aeroplane. OVERHEAD shows you which one, where it is going and
how far off it is — and nothing else. Leave it open, wait for one to cross your own dot, then go
to the window and look up: it is really there.

It is meant to be a quiet thing to have running while you do something else. One day it wants to
be pointed at a ceiling.

## Run it

```bash
npm install
npm run dev
```

`npm run build` produces the production bundle; `npm run preview` serves it with the same API
proxy as development.

## Stack

Vite · React 19 · TypeScript · MapLibre GL. No state library, no backend, no database, no
accounts, no analytics. Three runtime dependencies in total.

The map engine is loaded on demand: the first screen is a line of text and a search box, so it
ships in ~70 kB gzip and the 257 kB map chunk only arrives once there is a place to draw.

## Data

Aircraft come from the [OpenSky Network](https://openskynetwork.github.io/opensky-api/rest.html)
`/states/all` endpoint, queried with a bounding box around you and refreshed every 15 seconds.
The map underneath comes in two looks, switched with the globe below the compass and remembered
between visits:

- **Satellite** (the default) is Esri World Imagery, desaturated and its highlights crushed so it
  sits at night behind the aircraft instead of in front of them.
- **Night** is NASA's VIIRS Black Marble — the whole planet's city lights — over OpenFreeMap
  vector tiles for the coastline and borders, drawn through a style written by hand in
  `src/map/style.ts` that asks for four things only.

The map is a globe. Zoom all the way out and it becomes the planet, with every buried song
glowing on it at once.

Both live in one style and are switched by toggling layer visibility, so changing the map never
tears down the aircraft or the rings. Place search, for when the browser will not give up your
location, is Nominatim. None of it needs a key.

**There is one server file, `api/states.ts`, and it exists for a single reason:** OpenSky answers
every request with `Access-Control-Allow-Origin: https://opensky-network.org`, so a browser on any
other origin is blocked. It forwards a bounding box and returns the JSON. Nothing is stored, and
no request from OVERHEAD ever carries who you are.

It is a serverless function in production and dev middleware locally — the same module either way,
so the credentials, the bounding box clamp and the cache behave identically in both.

### Credits and limits

Anonymous OpenSky access allows 400 credits a day, counted per IP — and every visitor shares the
proxy's IP. The client polls every 15 seconds, sleeps while the tab is hidden, and the proxy snaps
bounding boxes to a coarse grid and caches each for 10 seconds so neighbours cost one call between
them.

Four hundred goes quickly if you are working on the app rather than just watching it. Create a
free API client at [opensky-network.org](https://opensky-network.org/my-opensky/account) and set
`OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` (see `.env.example`) to raise it to 4,000 a day.
The credentials work locally as well as deployed. Without them it stays anonymous, which is fine
for one person watching their own sky.

Out of credits, OpenSky returns 429 with the exact number of seconds to wait; OVERHEAD honours it,
keeps whatever aircraft it already had on screen, and dims the LIVE pip rather than emptying the
sky.

## Permissions

Each is asked for only when it is needed, and refusing any of them leaves everything else working.

| | |
|---|---|
| **Location** | Asked on open. Refuse it and you search for a place instead; that choice is remembered locally and a real device fix always takes priority over it. |
| **Compass** | Never asked on load. On iOS the compass reads TAP FOR COMPASS and waits for you. Refused or unavailable, it sits north-up. |
| **Audio** | Never plays until you press the note. Blocked by the browser, the control simply stays off. |

Your location is used to query aircraft and is never sent anywhere else. Only a place you chose by
name is stored, in `localStorage`, on your device.

## The hunt

Two ambient tracks are always there. Thirteen more are buried across the world — one over the
Eiffel Tower, one over Mount Fuji, one over Machu Picchu, and so on through the wonders and the
landmarks. Nothing is listed and nothing is marked: carry the map within about 140 km of one and
it gives itself up, tells you where you were, and joins the rotation on the ambience control.

A buried place you have not found shows only a faint glimmer, and only while it happens to be on
screen — enough to make you curious, not enough to give it away. Found ones keep a steady mark so
you can go back. What you have found is remembered on your device and nowhere else.

Places and tracks are paired in `src/services/ambient/tracks.ts`; adding another is one entry.

## Ambience

The two tracks that are always available carry no audio file at all: `src/services/ambient/`
synthesises them with the Web Audio API from a recipe — a root note, a stack of intervals, a
filter cutoff, a drift rate. The hidden ones are real files in `public/audio/`. Use only music you
own or that is licensed for the purpose.

## Turning the map

Drag to pan, scroll or pinch to zoom, and rotate with two fingers on a phone or a right-drag
(or ctrl-drag) on a desktop. The desktop rotation is angular rather than horizontal: the map
follows your hand around the centre of the screen, one degree for one degree, so a full circle
of the wrist is a full turn of the map.

### Night lights

Night Flight starts as NASA's Black Marble, which is a photograph and stops having detail at
around zoom 8. Rather than magnify its grain, the imagery fades out between zoom 7.5 and 9.8
while four vector layers -- urban haze, a soft halo along every road, a bright filament inside
it, and lit runways -- fade in over the same span. The light is the same amber either way, so
the handover is invisible; what you see is a city assembling itself as you come down towards
it, and staying sharp at any zoom because past that point it is drawn, not photographed. The compass follows the map's bearing, and a small **N** appears
beside it only once you have turned away from north. Where the device reports a real heading,
tapping the compass hands the map's rotation over to it.

Three angles exist here and they are never mixed: the map has a bearing, each aircraft has a
heading, and the device has a facing. Turning the map never changes where an aircraft points.

## Known limitations

- Coverage is whatever OpenSky's volunteer receivers can hear. Some regions are thin, and an empty
  sky over the ocean is usually the network, not the traffic.
- Positions are as fresh as the 15-second refresh; aircraft glide between reported points rather
  than being tracked continuously.
- Aircraft are drawn on the GPU and are not reachable by keyboard — ninety tab stops would be
  worse than none.
- The compass needs a magnetometer. Desktop gets an honest north-up dial rather than a simulated
  needle.
