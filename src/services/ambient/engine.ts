import type { AmbientTrack, SynthTrack } from './tracks'

const FADE_IN_S = 6
const FADE_OUT_S = 2.5
/**
 * The loudest OVERHEAD will ever be. Ambience should be noticed, not listened to, so even the
 * top of the slider stays behind the sky rather than on top of it.
 */
const MAX_LEVEL = 0.34

type AudioContextConstructor = typeof AudioContext

const getAudioContext = (): AudioContextConstructor | undefined =>
  window.AudioContext ??
  (window as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext

const semitone = (root: number, steps: number) => root * 2 ** (steps / 12)

/**
 * A slow drone built from detuned sines. Every voice breathes at its own rate, so the chord never
 * quite repeats and never asks for attention.
 */
function buildSynthVoices(context: AudioContext, track: SynthTrack, output: AudioNode) {
  const nodes: AudioScheduledSourceNode[] = []

  const shelf = context.createBiquadFilter()
  shelf.type = 'lowpass'
  shelf.frequency.value = track.cutoff
  shelf.Q.value = 0.6
  shelf.connect(output)

  // The whole pad opens and closes over the better part of a minute.
  const cutoffDrift = context.createOscillator()
  const cutoffDepth = context.createGain()
  cutoffDrift.frequency.value = track.drift / 2
  cutoffDepth.gain.value = track.cutoff * 0.35
  cutoffDrift.connect(cutoffDepth).connect(shelf.frequency)
  cutoffDrift.start()
  nodes.push(cutoffDrift)

  track.intervals.forEach((steps, index) => {
    const voice = context.createGain()
    // Higher partials sit further back so the chord stays warm rather than glassy.
    voice.gain.value = 0.22 / (1 + index * 0.85)
    voice.connect(shelf)

    const breath = context.createOscillator()
    const breathDepth = context.createGain()
    breath.frequency.value = track.drift * (0.6 + index * 0.31)
    breathDepth.gain.value = voice.gain.value * 0.7
    breath.connect(breathDepth).connect(voice.gain)
    breath.start()
    nodes.push(breath)

    // Two oscillators a few cents apart beat slowly against each other.
    for (const detune of [-5, 5]) {
      const oscillator = context.createOscillator()
      oscillator.type = index > 2 ? 'sine' : 'triangle'
      oscillator.frequency.value = semitone(track.root, steps)
      oscillator.detune.value = detune
      oscillator.connect(voice)
      oscillator.start()
      nodes.push(oscillator)
    }
  })

  nodes.push(buildAirBed(context, track.air, shelf))
  return nodes
}

/** Four seconds of noise, looped and heavily filtered -- the sound of altitude, roughly. */
function buildAirBed(context: AudioContext, level: number, output: AudioNode) {
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let previous = 0
  for (let index = 0; index < channel.length; index += 1) {
    // A one-pole lowpass on white noise: cheap pink-ish noise, no harshness.
    previous = previous * 0.97 + (Math.random() * 2 - 1) * 0.03
    channel[index] = previous
  }

  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420

  const gain = context.createGain()
  gain.gain.value = level

  source.connect(filter).connect(gain).connect(output)
  source.start()
  return source
}

/**
 * OVERHEAD's ambience.
 *
 * One AudioContext for the life of the page -- browsers cap how many a document may hold, so
 * building a fresh one on every toggle would eventually just stop working. Starting and stopping
 * swaps the voices hanging off a permanent master gain, and every change is a fade.
 */
export class AmbientEngine {
  private context: AudioContext | null = null
  /** 0 to 1, as the slider reports it. */
  private volume = 0.5
  private master: GainNode | null = null
  private voices: AudioScheduledSourceNode[] = []
  private element: HTMLAudioElement | null = null
  private teardown: number | null = null

  get isSupported(): boolean {
    return getAudioContext() !== undefined
  }

  /**
   * Must be called from a user gesture -- browsers will not start audio without one. Returns
   * whether sound is actually running, so a blocked context stays quietly off instead of
   * lighting up a control that is doing nothing.
   */
  async start(track: AmbientTrack): Promise<boolean> {
    const Constructor = getAudioContext()
    if (!Constructor) return false

    this.clearVoices()

    if (!this.context) {
      this.context = new Constructor()
      this.master = this.context.createGain()
      this.master.gain.value = 0
      this.master.connect(this.context.destination)
    }

    const { context, master } = this
    if (!master) return false

    try {
      await context.resume()
    } catch {
      // Autoplay policy said no. Nothing broke; there is simply no sound.
      return false
    }
    if (context.state !== 'running') return false

    if (track.kind === 'synth') {
      this.voices = buildSynthVoices(context, track, master)
    } else {
      const element = new Audio(track.src)
      element.loop = true
      element.crossOrigin = 'anonymous'
      try {
        context.createMediaElementSource(element).connect(master)
        await element.play()
        this.element = element
      } catch {
        // A missing file or a refused play call: silence, not a broken app.
        this.element = null
        return false
      }
    }

    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setValueAtTime(master.gain.value, context.currentTime)
    master.gain.linearRampToValueAtTime(this.level, context.currentTime + FADE_IN_S)
    return true
  }

  private get level() {
    return this.volume * MAX_LEVEL
  }

  /** Take the new level immediately, but glide to it: a jump in gain is audible as a click. */
  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume))
    const { context, master } = this
    if (!context || !master) return
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setValueAtTime(master.gain.value, context.currentTime)
    master.gain.linearRampToValueAtTime(Math.max(this.level, 0.0001), context.currentTime + 0.15)
  }

  /** Fades out, then tears the voices down. An abrupt stop clicks. */
  stop(): void {
    const { context, master } = this
    if (!context || !master) return

    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setValueAtTime(master.gain.value, context.currentTime)
    master.gain.linearRampToValueAtTime(0.0001, context.currentTime + FADE_OUT_S)

    window.clearTimeout(this.teardown ?? undefined)
    this.teardown = window.setTimeout(() => {
      this.clearVoices()
      // Suspending rather than closing keeps the one context we are allowed to keep.
      void context.suspend()
    }, FADE_OUT_S * 1000 + 200)
  }

  /** Fade the current track out, swap it, fade the next one in. */
  async change(track: AmbientTrack): Promise<boolean> {
    const { context, master } = this
    if (!context || !master) return this.start(track)

    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setValueAtTime(master.gain.value, context.currentTime)
    master.gain.linearRampToValueAtTime(0.0001, context.currentTime + FADE_OUT_S)

    await new Promise((resolve) => window.setTimeout(resolve, FADE_OUT_S * 1000 + 100))
    return this.start(track)
  }

  /** Called when the app goes away. After this the engine is finished with. */
  dispose(): void {
    window.clearTimeout(this.teardown ?? undefined)
    this.clearVoices()
    void this.context?.close()
    this.context = null
    this.master = null
  }

  private clearVoices() {
    window.clearTimeout(this.teardown ?? undefined)
    this.teardown = null

    for (const voice of this.voices) {
      try {
        voice.stop()
      } catch {
        // Already stopped; nothing to do.
      }
      voice.disconnect()
    }
    this.voices = []

    if (this.element) {
      this.element.pause()
      this.element.src = ''
      this.element = null
    }
  }
}
