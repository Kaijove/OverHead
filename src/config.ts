/** Every number that tunes OVERHEAD's behaviour, in one place. */

/**
 * How often we ask OpenSky for a new picture of the sky.
 *
 * Anonymous access refreshes state vectors every 10 seconds and allows 400 credits a day, which
 * are counted per IP -- and every visitor shares the proxy's IP. At 15 seconds one continuous
 * viewer costs 240 credits an hour, which is the most we can spend and still be a calm app.
 */
export const AIRCRAFT_REFRESH_INTERVAL = 15_000

/**
 * The sky we watch, in kilometres. A 100km radius spans about 2 degrees, keeping the OpenSky
 * bounding box inside the 25 square degree bracket that costs a single credit.
 */
export const SEARCH_RADIUS_KM = 100

/**
 * Faster than any airliner, by a wide margin. A reported jump that would need more than this to
 * be real is not movement: it is a resumed tab, a long outage or a bad datum. Those get placed,
 * not animated -- an aircraft sliding a hundred kilometres across the map looks broken.
 */
export const MAX_PLAUSIBLE_SPEED_KMH = 1_400

/** How long a contact takes to fade out once it stops appearing in responses. */
export const CONTACT_FADE_OUT = 1_600

/**
 * A position this old is a ghost: the aircraft has moved on and we would be drawing it somewhere
 * it no longer is. OpenSky reports position time separately from last contact for exactly this.
 */
export const MAX_POSITION_AGE = 300_000

/** Past this with no successful fetch, the feed is stale and the app stops claiming to be live. */
export const STALE_AFTER = 70_000

/**
 * A request that never settles would stop the polling loop for good, with nothing on screen to
 * say so. `fetch` has no timeout of its own, so we give it one.
 */
export const REQUEST_TIMEOUT = 12_000

/** After a failed request, wait this much longer than usual before trying again. */
export const ERROR_BACKOFF_MULTIPLIER = 4

/** Where a manually chosen place is remembered between visits. */
export const STORED_PLACE_KEY = 'overhead.place'

/** Where the chosen basemap is remembered between visits. */
export const STORED_BASEMAP_KEY = 'overhead.basemap'

/** Which hidden tracks have been uncovered, on this device only. */
export const STORED_FOUND_KEY = 'overhead.found'

/** How loud the ambience was left. */
export const STORED_VOLUME_KEY = 'overhead.volume'

/** Whether the hunt has been explained once already. */
export const STORED_HINTED_KEY = 'overhead.hinted'

/**
 * How close the map has to be carried before a buried track gives itself up. Generous enough
 * that centring roughly on a landmark is enough, tight enough that you cannot stumble on two.
 */
export const DISCOVERY_RADIUS_KM = 140
