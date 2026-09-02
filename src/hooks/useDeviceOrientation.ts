import { useCallback, useEffect, useRef, useState } from 'react'

export type OrientationStatus = 'unsupported' | 'idle' | 'live' | 'denied'

/** Fraction of the remaining error closed each frame. ~0.12 settles in about a fifth of a second. */
const SMOOTHING = 0.12
/** Sensor noise below this many degrees is not movement, it is the magnetometer breathing. */
const DEADBAND = 0.4
/** Stop animating once we are this close; further easing is invisible. */
const SETTLED = 0.05

type HeadingListener = (heading: number) => void

type IOSOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type IOSOrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>
}

/** 359 to 1 degrees is a 2 degree turn. Keep winding the angle so the dial never spins backwards. */
const unwrap = (previous: number, heading: number) =>
  previous + ((((heading - previous) % 360) + 540) % 360) - 180

/**
 * How far the screen is rotated inside the device. Without this the compass is ninety degrees
 * wrong the moment someone turns their phone on its side.
 */
function screenAngle(): number {
  const angle = window.screen?.orientation?.angle
  if (typeof angle === 'number') return angle
  const legacy = (window as { orientation?: number }).orientation
  return typeof legacy === 'number' ? legacy : 0
}

/**
 * Which way the device is facing, in degrees clockwise from true north.
 *
 * Headings never pass through React state. A magnetometer fires tens of times a second and
 * re-rendering the app that often to move one needle would be indefensible, so readings are
 * smoothed in an animation frame loop and pushed straight to whoever subscribed. Only `status`,
 * which changes at most twice in a session, is state.
 *
 * Desktop has no magnetometer: nothing subscribes to anything, the compass sits north-up, and
 * that is the honest answer rather than a simulated needle.
 */
export function useDeviceOrientation() {
  const [status, setStatus] = useState<OrientationStatus>(() =>
    typeof window !== 'undefined' && 'DeviceOrientationEvent' in window ? 'idle' : 'unsupported',
  )

  const target = useRef<number | null>(null)
  const current = useRef<number | null>(null)
  const listeners = useRef(new Set<HeadingListener>())
  const frame = useRef<number | null>(null)
  const detach = useRef<(() => void) | null>(null)

  const tick = useCallback(() => {
    const aim = target.current
    if (aim === null) {
      frame.current = null
      return
    }

    const from = current.current ?? aim
    const next = from + (aim - from) * SMOOTHING
    const isSettled = Math.abs(aim - next) < SETTLED
    current.current = isSettled ? aim : next

    for (const listener of listeners.current) listener(current.current)
    frame.current = isSettled ? null : requestAnimationFrame(tick)
  }, [])

  const listen = useCallback(() => {
    const onOrientation = (event: Event) => {
      const orientation = event as IOSOrientationEvent
      // iOS reports a true-north heading directly; everyone else gives alpha, counterclockwise
      // from north. Neither accounts for the screen being rotated, so we do.
      const raw =
        orientation.webkitCompassHeading ??
        (orientation.absolute && orientation.alpha !== null ? 360 - orientation.alpha : null)
      if (raw === null || !Number.isFinite(raw)) return

      const heading = (((raw + screenAngle()) % 360) + 360) % 360
      const aim = target.current === null ? heading : unwrap(target.current, heading)
      if (target.current !== null && Math.abs(aim - target.current) < DEADBAND) return

      target.current = aim
      setStatus((previous) => (previous === 'live' ? previous : 'live'))
      if (frame.current === null) frame.current = requestAnimationFrame(tick)
    }

    // Attaching twice would stack listeners; `request` can be pressed more than once.
    detach.current?.()
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)

    detach.current = () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation)
      window.removeEventListener('deviceorientation', onOrientation)
      detach.current = null
    }
    return detach.current
  }, [tick])

  /** iOS only opens the sensor from inside a real gesture, which is why this is never automatic. */
  const request = useCallback(async () => {
    const constructor = window.DeviceOrientationEvent as IOSOrientationConstructor | undefined
    if (!constructor) return setStatus('unsupported')

    if (typeof constructor.requestPermission === 'function') {
      try {
        if ((await constructor.requestPermission()) !== 'granted') return setStatus('denied')
      } catch {
        // A refusal, or a call the browser did not consider gesture-driven. Either way: no sensor,
        // no error on screen, everything else carries on.
        return setStatus('denied')
      }
    }
    listen()
  }, [listen])

  /** Consumers drive their own DOM from this; nothing here re-renders React. */
  const subscribe = useCallback((listener: HeadingListener) => {
    listeners.current.add(listener)
    if (current.current !== null) listener(current.current)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  // Browsers that hand the sensor over without asking (most Android) just start reporting.
  useEffect(() => {
    const constructor = window.DeviceOrientationEvent as IOSOrientationConstructor | undefined
    if (!constructor || typeof constructor.requestPermission === 'function') return
    return listen()
  }, [listen])

  useEffect(
    () => () => {
      detach.current?.()
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      listeners.current.clear()
    },
    [],
  )

  // Only iOS gates the sensor behind a prompt. Everywhere else there is nothing to ask for, so
  // the compass should not offer a button that would do nothing.
  const needsPermission =
    status === 'idle' &&
    typeof (window.DeviceOrientationEvent as IOSOrientationConstructor | undefined)
      ?.requestPermission === 'function'

  return { status, needsPermission, request, subscribe }
}

export type Orientation = ReturnType<typeof useDeviceOrientation>
