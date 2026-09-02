/**
 * Minimal proxy in front of OpenSky. It exists for exactly one reason: OpenSky answers with
 * `Access-Control-Allow-Origin: https://opensky-network.org`, so a browser can never call it
 * directly. No database, no sessions, no user data -- just a bounding box in, JSON out.
 *
 * Web-standard fetch handler, so it runs on Vercel Edge, Netlify, Deno or Cloudflare unchanged.
 */

const UPSTREAM = 'https://opensky-network.org/api/states/all'
const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'

/** OpenSky's own resolution for anonymous users is 10s; asking faster only burns credits. */
const CACHE_TTL_MS = 10_000
/** Coarse grid, in degrees: neighbours in the same city share one upstream call. */
const GRID = 0.25
/**
 * The widest box we will ask OpenSky for. The app itself never needs more than about three
 * degrees, and this endpoint is open to anyone who finds it -- without a ceiling, one stranger
 * requesting the whole globe could spend the day's credits in a handful of calls.
 */
const MAX_SPAN = 6
/** Refresh a little early -- tokens are valid for 30 minutes. */
const TOKEN_TTL_MS = 25 * 60 * 1000

type CacheEntry = { body: string; expiresAt: number }
const cache = new Map<string, CacheEntry>()
let token: { value: string; expiresAt: number } | null = null

const snap = (value: number, direction: 'down' | 'up') =>
  (direction === 'down' ? Math.floor(value / GRID) : Math.ceil(value / GRID)) * GRID

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null // Fall back to anonymous access.

  if (token && token.expiresAt > Date.now()) return token.value

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!response.ok) return null

  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null

  token = {
    value: data.access_token,
    expiresAt: Date.now() + Math.min((data.expires_in ?? 1800) * 1000, TOKEN_TTL_MS),
  }
  return token.value
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export default async function handler(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const raw = {
    lamin: snap(Number(params.get('lamin')), 'down'),
    lomin: snap(Number(params.get('lomin')), 'down'),
    lamax: snap(Number(params.get('lamax')), 'up'),
    lomax: snap(Number(params.get('lomax')), 'up'),
  }

  if (Object.values(raw).some((value) => !Number.isFinite(value))) {
    return json({ error: 'lamin, lomin, lamax and lomax are required' }, 400)
  }

  const lamin = clamp(raw.lamin, -90, 90)
  const lomin = clamp(raw.lomin, -180, 180)
  const box = {
    lamin,
    lomin,
    lamax: clamp(raw.lamax, lamin, Math.min(90, lamin + MAX_SPAN)),
    lomax: clamp(raw.lomax, lomin, Math.min(180, lomin + MAX_SPAN)),
  }

  const key = Object.values(box).join(',')
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(cached.body, { headers: { ...headers, 'x-overhead-cache': 'hit' } })
  }

  const accessToken = await getAccessToken()
  const upstream = await fetch(`${UPSTREAM}?${new URLSearchParams(mapValues(box))}`, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  })

  if (!upstream.ok) {
    const retryAfter = upstream.headers.get('x-rate-limit-retry-after-seconds')
    return json({ error: `OpenSky replied ${upstream.status}` }, upstream.status, {
      ...(retryAfter ? { 'x-rate-limit-retry-after-seconds': retryAfter } : {}),
    })
  }

  const body = await upstream.text()
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS })
  if (cache.size > 200) cache.clear() // The instance is ephemeral anyway; keep it bounded.

  return new Response(body, { headers: { ...headers, 'x-overhead-cache': 'miss' } })
}

const headers: Record<string, string> = {
  'content-type': 'application/json',
  'cache-control': 'public, max-age=10',
}

const mapValues = (box: Record<string, number>) =>
  Object.fromEntries(Object.entries(box).map(([k, v]) => [k, v.toFixed(4)]))

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } })
