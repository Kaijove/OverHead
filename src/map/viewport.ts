type BearingListener = (bearing: number) => void

/**
 * How the map is currently turned, shared with the compass without going through React.
 *
 * A rotate gesture changes the bearing on every frame. Routing that through state would re-render
 * the application sixty times a second to turn one dial, so the dial subscribes here and writes
 * its own transform instead.
 *
 * Three different angles exist in OVERHEAD and they are deliberately never mixed: this one is the
 * map's rotation, the aircraft carry their own heading, and the device's facing is a third thing
 * again. Only this one turns the compass.
 */
export class Viewport {
  private listeners = new Set<BearingListener>()
  private bearing = 0
  private commands: { resetNorth: () => void; setBearing: (bearing: number) => void } | null = null

  /** Called by the map on every rotation frame. */
  report(bearing: number) {
    this.bearing = bearing
    for (const listener of this.listeners) listener(bearing)
  }

  subscribe(listener: BearingListener) {
    this.listeners.add(listener)
    listener(this.bearing)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The map hands over the controls it owns once it exists. */
  bind(commands: { resetNorth: () => void; setBearing: (bearing: number) => void }) {
    this.commands = commands
    return () => {
      this.commands = null
    }
  }

  resetNorth() {
    this.commands?.resetNorth()
  }

  setBearing(bearing: number) {
    this.commands?.setBearing(bearing)
  }
}
