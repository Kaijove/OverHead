import { useCallback, useState } from 'react'
import { STORED_BASEMAP_KEY } from '../config'
import type { Basemap } from '../map/style'

/**
 * Which map is underneath, remembered between visits. Satellite is the default: it is the one
 * that makes the sky feel like a real place rather than a diagram.
 */
export function useBasemap() {
  const [basemap, setBasemap] = useState<Basemap>(() => {
    try {
      return window.localStorage.getItem(STORED_BASEMAP_KEY) === 'dark' ? 'dark' : 'satellite'
    } catch {
      // Private mode, disabled storage -- neither is worth an error over a preference.
      return 'satellite'
    }
  })

  const toggle = useCallback(() => {
    setBasemap((current) => {
      const next: Basemap = current === 'satellite' ? 'dark' : 'satellite'
      try {
        window.localStorage.setItem(STORED_BASEMAP_KEY, next)
      } catch {
        // Remembering is a convenience, not a requirement.
      }
      return next
    })
  }, [])

  return { basemap, toggle }
}
