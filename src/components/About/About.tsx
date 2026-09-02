import { useEffect, useRef, useState } from 'react'
import type { DialTrack } from '../TrackDial/TrackDial'
import './About.css'

type AboutProps = {
  tracks: DialTrack[]
  onClose: () => void
}

/**
 * What OVERHEAD is for, said once.
 *
 * The point of the app is the sitting still, not the aeroplanes -- they are only what gives you
 * something to sit still for. So the copy leads with that and the four beats build towards it.
 *
 * This screen has been a wall of paragraphs twice now, and both times it was skipped. So it is
 * built as a scene instead: an aeroplane actually crosses over your dot at the top, and the three
 * things worth knowing hang off a single line beneath it, one short sentence each. Nothing has to
 * be read for the idea to land -- the animation says it first, and the words only confirm it.
 */
export function About({ tracks, onClose }: AboutProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hidden = tracks.filter((track) => track.locked).length

  /*
   * There is more here than fits on a laptop, and a page that ends mid-sentence at the fold reads
   * as broken rather than long -- so the bottom edge fades while there is more below it, and a
   * chevron sits there until the first scroll proves the point.
   */
  const [hasScrolled, setHasScrolled] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const measure = () => {
      const page = sheetRef.current
      if (!page) return
      const overflows = page.scrollHeight > page.clientHeight + 12
      setAtEnd(!overflows)
      setHasScrolled(!overflows)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tracks.length])

  const onScroll = (event: React.UIEvent<HTMLElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollTop > 24) setHasScrolled(true)
    setAtEnd(scrollTop + clientHeight >= scrollHeight - 12)
  }

  return (
    <section className="about" ref={sheetRef} onScroll={onScroll}>
      <div className="about__glow" aria-hidden="true" />

      <div className="about__sheet">
        <p className="about__mark" style={{ '--i': 0 } as React.CSSProperties}>
          OVERHEAD
        </p>

        {/* The whole app in eight seconds, before a word of it is read. */}
        <div className="about__scene" style={{ '--i': 1 } as React.CSSProperties} aria-hidden="true">
          <svg viewBox="0 0 320 100" preserveAspectRatio="xMidYMid meet" className="about__sky">
            <g className="about__stars">
              {STARS.map(([x, y, r], index) => (
                <circle key={index} cx={x} cy={y} r={r} style={{ animationDelay: `${index * 0.7}s` }} />
              ))}
            </g>

            {/* The curve of the Earth, and you standing on it. */}
            <path className="about__horizon" d="M -40 100 Q 160 70 360 100" />
            <g className="about__you">
              <circle className="about__ping" cx="160" cy="85" r="6" />
              <circle className="about__ping about__ping--late" cx="160" cy="85" r="6" />
              <circle className="about__dot" cx="160" cy="85" r="3.4" />
            </g>

            {/* Brightens as the aeroplane passes over: the moment the whole app is waiting for. */}
            <line className="about__beam" x1="160" y1="77" x2="160" y2="42" />

            <g className="about__flight">
              <line className="about__wake" x1="-64" y1="34" x2="-18" y2="34" />
              <path className="about__plane" d={PLANE} transform="translate(0 34) scale(0.78)" />
            </g>
          </svg>
        </div>

        <h1 className="about__lead" style={{ '--i': 2 } as React.CSSProperties}>
          Somewhere above you
          <br />
          there is an aeroplane.
        </h1>

        <p className="about__sub" style={{ '--i': 3 } as React.CSSProperties}>
          Right now, about six miles up. A slow website — nothing to score, nothing to finish,
          nobody waiting for you.
        </p>

        {/* Three things, hung off one line. Read them or don't. */}
        <ol className="about__beats" style={{ '--i': 4 } as React.CSSProperties}>
          <li className="about__beat">
            <span className="about__glyph" aria-hidden="true">
              <svg viewBox="0 0 34 34">
                <circle className="g-ring" cx="17" cy="17" r="11" />
                <circle className="g-ring g-ring--in" cx="17" cy="17" r="5.5" />
                <line className="g-sweep" x1="17" y1="17" x2="17" y2="6" />
              </svg>
            </span>
            <h2>Watch</h2>
            <p>
              Every aeroplane around you, moving as it really is.
            </p>
          </li>

          <li className="about__beat">
            <span className="about__glyph" aria-hidden="true">
              <svg viewBox="0 0 34 34">
                <circle className="g-pulse" cx="17" cy="24" r="4" />
                <circle className="g-core" cx="17" cy="24" r="2.6" />
                <path className="g-tiny g-fly" d={PLANE} transform="translate(17 11) scale(0.5)" />
              </svg>
            </span>
            <h2>Wait</h2>
            <p>
              Sooner or later one crosses your dot. Go to the window and look up.
            </p>
          </li>

          <li className="about__beat">
            <span className="about__glyph" aria-hidden="true">
              <svg viewBox="0 0 34 34">
                <circle className="g-breath" cx="17" cy="17" r="9" />
                <circle className="g-breath g-breath--in" cx="17" cy="17" r="9" />
                <circle className="g-core" cx="17" cy="17" r="1.8" />
              </svg>
            </span>
            <h2>Breathe</h2>
            <p>
              Somewhere to sit and think. Meditate, read, or just leave it running.
            </p>
          </li>

          <li className="about__beat">
            <span className="about__glyph" aria-hidden="true">
              <svg viewBox="0 0 34 34">
                <path className="g-note" d="M 14 22 V 10 L 25 7.6 V 19" />
                <ellipse className="g-head" cx="11.4" cy="22.4" rx="2.9" ry="2.5" />
                <ellipse className="g-head g-head--late" cx="22.4" cy="19.8" rx="2.9" ry="2.5" />
              </svg>
            </span>
            <h2>Listen</h2>
            <p>
              {tracks.length} quiet pieces — <strong>{hidden} buried across the map</strong>. Zoom
              out, find a glimmer, tap it.
            </p>

            {/* Every song there is: lit means yours, dim means still out there somewhere. */}
            <div
              className="about__constellation"
              role="img"
              aria-label={`${tracks.length - hidden} of ${tracks.length} songs found`}
            >
              {tracks.map((track, index) => (
                <span
                  key={track.id}
                  className={`about__song${track.locked ? ' is-locked' : ''}`}
                  style={{ animationDelay: `${(index % 7) * 0.42}s` }}
                />
              ))}
            </div>
          </li>
        </ol>

        <p className="about__future" style={{ '--i': 5 } as React.CSSProperties}>
          <span className="about__projector" aria-hidden="true">
            <svg viewBox="0 0 44 26">
              <line className="p-ceiling" x1="5" y1="3" x2="41" y2="3" />
              <path className="p-cone" d="M 8.5 19 L 19 4 L 37 4 Z" />
              <rect className="p-box" x="3" y="17" width="8" height="6.5" rx="1.6" />
            </svg>
          </span>
          One day: a projector, a dark room, and the real sky on your own ceiling.
        </p>

        <button
          className="about__enter"
          style={{ '--i': 6 } as React.CSSProperties}
          onClick={onClose}
        >
          Look up
        </button>
      </div>

      {!atEnd && <div className="about__fade" aria-hidden="true" />}
      {!hasScrolled && (
        <div className="about__more" aria-hidden="true">
          <svg viewBox="0 0 24 14">
            <path d="M 3 3 L 12 11 L 21 3" />
          </svg>
        </div>
      )}
    </section>
  )
}

/** One aeroplane, drawn once and reused at both sizes. Nose to the right, wings swept back. */
const PLANE =
  'M 13 0 L 3 1.8 L -3 1.8 L -8 7 L -10.5 7 L -8 1.8 L -12 1.8 L -14 3.6 L -15.5 3.6 ' +
  'L -14.6 0 L -15.5 -3.6 L -14 -3.6 L -12 -1.8 L -8 -1.8 L -10.5 -7 L -8 -7 L -3 -1.8 L 3 -1.8 Z'

/** Scattered by hand rather than randomly, so nothing clusters or sits on the flight path. */
const STARS: [number, number, number][] = [
  [28, 18, 1.1],
  [74, 9, 0.8],
  [112, 25, 1.3],
  [196, 14, 0.9],
  [242, 27, 1.2],
  [288, 11, 1],
  [58, 57, 0.9],
  [268, 60, 1.1],
]
