import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { About } from './components/About/About'
import { AircraftCard } from './components/AircraftCard/AircraftCard'
import { BasemapToggle } from './components/BasemapToggle/BasemapToggle'
import { BottomBar } from './components/BottomBar/BottomBar'
import { Compass } from './components/Compass/Compass'
import { FoundToast, HuntHint } from './components/Discovery/Discovery'
import { LocationGate } from './components/LocationGate/LocationGate'
import { SkyStatus, type SkyState } from './components/SkyStatus/SkyStatus'
import { TopBar } from './components/TopBar/TopBar'
import { TrackDial } from './components/TrackDial/TrackDial'

import { useAircraft } from './hooks/useAircraft'
import { useBasemap } from './hooks/useBasemap'
import { useDiscoveries, type Discovery } from './hooks/useDiscoveries'
import { useAmbient } from './hooks/useAmbient'
import { useDeviceOrientation } from './hooks/useDeviceOrientation'
import { useGeolocation } from './hooks/useGeolocation'
import { Viewport } from './map/viewport'
import { SEARCH_RADIUS_KM, STALE_AFTER, STORED_HINTED_KEY } from './config'
import './App.css'

// The map engine is by far the heaviest thing OVERHEAD loads, and the first screen -- a line of
// text and a search box -- has no use for it. Splitting it out lets that screen arrive at once.
const SkyMap = lazy(() =>
  import('./components/SkyMap/SkyMap').then((module) => ({ default: module.SkyMap })),
)

export default function App() {
  const { status, position, isManual, requestPosition, setManualPosition } = useGeolocation()
  const { aircraft, hasFailed, updatedAt, retry } = useAircraft(position, SEARCH_RADIUS_KM)
  const orientation = useDeviceOrientation()
  const { available, catalogue, search, reveal, trackAt, foundCount, total, places } =
    useDiscoveries()
  const ambient = useAmbient(available)
  const { basemap, toggle: toggleBasemap } = useBasemap()

  // How the map is turned. Lives outside React because a rotate gesture changes it every frame.
  const viewportRef = useRef<Viewport | null>(null)
  viewportRef.current ??= new Viewport()
  const viewport = viewportRef.current

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recenterNonce, setRecenterNonce] = useState(0)
  const [isPickingPlace, setIsPickingPlace] = useState(false)
  const [followHeading, setFollowHeading] = useState(false)
  const [found, setFound] = useState<{ discovery: Discovery; isNew: boolean } | null>(null)
  const [isPickingTrack, setIsPickingTrack] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(true)

  const closeAbout = useCallback(() => setIsAboutOpen(false), [])
  const [isHinting, setIsHinting] = useState(() => {
    try {
      return window.localStorage.getItem(STORED_HINTED_KEY) !== 'yes'
    } catch {
      return false
    }
  })

  const dismissHint = useCallback(() => {
    setIsHinting(false)
    try {
      window.localStorage.setItem(STORED_HINTED_KEY, 'yes')
    } catch {
      // The clue is worth showing again rather than worth an error.
    }
  }, [])

  // Uncovering something should be its own reward, so the track starts there and then rather
  // than waiting to be hunted down in a control. The tap that found it is the gesture the
  // browser needs before it will allow any sound at all.
  const celebrate = useCallback(
    (discovery: Discovery | null, isNew: boolean) => {
      if (!discovery) return
      setFound({ discovery, isNew })
      if (isNew) dismissHint()
      void ambient.play(discovery)
    },
    [ambient, dismissHint],
  )

  const handleSettle = useCallback(
    (centre: Parameters<typeof search>[0]) => celebrate(search(centre), true),
    [celebrate, search],
  )

  // A mark you have already opened is not spent: tapping it puts its song back on.
  const handleDiscover = useCallback(
    (id: string) => celebrate(trackAt(id), reveal(id) !== null),
    [celebrate, reveal, trackAt],
  )

  const selected = useMemo(
    () => aircraft.find((plane) => plane.icao24 === selectedId) ?? null,
    [aircraft, selectedId],
  )

  // Aircraft leave. When the selected one does, let the card go rather than freeze stale numbers.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null)
  }, [selectedId, selected])

  // Following only makes sense while the device is actually reporting a heading.
  useEffect(() => {
    if (orientation.status !== 'live') setFollowHeading(false)
  }, [orientation.status])

  const handlePick = useCallback(
    (picked: Parameters<typeof setManualPosition>[0]) => {
      setManualPosition(picked)
      setSelectedId(null)
      setIsPickingPlace(false)
    },
    [setManualPosition],
  )

  // The device answering wins over any chosen place, so there is nothing left to pick.
  useEffect(() => {
    if (!isManual) setIsPickingPlace(false)
  }, [isManual])

  // A failed request with aircraft still on screen is not worth a message across the map: the
  // pip going dark says the feed is stale, and the next interval retries on its own. The overlay
  // is for when there is genuinely nothing to look at.
  const skyState: SkyState | null =
    hasFailed && aircraft.length === 0
      ? 'error'
      : updatedAt === null
        ? 'scanning'
        : aircraft.length === 0
          ? 'quiet'
          : null

  // Before the first response there is nothing wrong yet, so the pip stays live rather than
  // announcing a failure that has not happened.
  const isLive = !hasFailed && (updatedAt === null || Date.now() - updatedAt < STALE_AFTER)

  return (
    <div className="app">
      {position && (
        <Suspense fallback={null}>
          <SkyMap
            viewer={position}
            aircraft={aircraft}
            selectedId={selectedId}
            onSelect={setSelectedId}
            radiusKm={SEARCH_RADIUS_KM}
            recenterNonce={recenterNonce}
            subscribeHeading={orientation.subscribe}
            followHeading={followHeading}
            basemap={basemap}
            places={places}
            onSettle={handleSettle}
            onDiscover={handleDiscover}
            viewport={viewport}
          />
        </Suspense>
      )}

      <TopBar isLive={isLive} onOpenAbout={() => setIsAboutOpen(true)} />

      {/* The instruments live in one column so they read as a set rather than as scattered
          buttons, and so nothing has to guess at another element's height to sit below it. */}
      <div className="app__instruments">
        <Compass
          viewport={viewport}
          orientation={orientation}
          isFollowing={followHeading}
          onToggleFollow={() => setFollowHeading((following) => !following)}
        />
        <BasemapToggle basemap={basemap} onToggle={toggleBasemap} />
      </div>

      {skyState && position && <SkyStatus state={skyState} onRetry={retry} />}

      {selected && <AircraftCard aircraft={selected} onClose={() => setSelectedId(null)} />}

      {/* A find always outranks the clue: if one turns up while the hint is still on screen,
          the hint has already done its job. */}
      {found ? (
        <FoundToast
          discovery={found.discovery}
          isNew={found.isNew}
          onDone={() => setFound(null)}
        />
      ) : (
        isHinting &&
        position &&
        foundCount < total && (
          <HuntHint foundCount={foundCount} total={total} onDismiss={dismissHint} />
        )
      )}

      <BottomBar
        // A control does what its own label says: a chosen place is something you change, a
        // device fix is something you return to after panning away.
        locationLabel={isManual ? 'Chosen place' : 'My location'}
        onLocation={
          isManual ? () => setIsPickingPlace(true) : () => setRecenterNonce((nonce) => nonce + 1)
        }
        count={aircraft.length}
        ambient={ambient}
        onOpenTracks={() => setIsPickingTrack(true)}
      />

      {isPickingTrack && (
        <TrackDial
          tracks={catalogue}
          currentId={ambient.trackId}
          isPlaying={ambient.isPlaying}
          onSelect={ambient.select}
          onToggle={ambient.toggle}
          onClose={() => setIsPickingTrack(false)}
          volume={ambient.volume}
          onVolume={ambient.setVolume}
        />
      )}

      {(!position || isPickingPlace) && (
        <LocationGate
          status={status}
          onRetry={requestPosition}
          onPick={handlePick}
          onDismiss={position ? () => setIsPickingPlace(false) : undefined}
          hiddenCount={total - foundCount}
        />
      )}

      {/* Above everything, including the gate: it is the first thing OVERHEAD ever says. */}
      {isAboutOpen && <About tracks={catalogue} onClose={closeAbout} />}
    </div>
  )
}
