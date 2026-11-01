# CineHD Research Notes

## Scope

Research for the personal movie dashboard (`prototype-dashboardv2`) to determine
how `cinehd.cc` indexes content, whether it exposes a public API, and how to
implement `modules/cinehd.js` for availability badges + deep links.

## Site identity and structure

- Public title: "CineHD - Your Ultimate Streaming Guide".
- Stack: Next.js (responses carry `x-nextjs-cache`, `x-nextjs-prerender`,
  RSC/router headers), served behind Cloudflare (`server: cloudflare`,
  `cf-ray`, `cdn.cloudflare...`). Fonts use Lucide; site behaves like a PWA.
- Content model: streaming *guide / index*. It surfaces TMDB-style metadata
  (title, year, type movie/tv, rating, overview, genres, poster) and groups
  titles by provider/network (Netflix, Apple TV+, Disney+, Peacock, Paramount+,
  "Now Playing", "Trending TV Shows", etc.).
- Navigation observed in search results:
  - `/home`
  - `/search`
  - `/search?q=<query>`
  - `/search?type=movie`
  - `/search?page=1&watch_provider=433`
- Deep link used by the dashboard: `https://cinehd.cc/search?q=<title>`.

## TMDB usage

- Titles, years, and media types shown by CineHD match TMDB conventions
  (`movie` vs `tv`, release year, TMDB ratings). It is effectively a
  TMDB-backed discovery layer with streaming-availability/provider grouping.
- No evidence of a stable, documented mapping endpoint that accepts a TMDB id
  and returns a canonical CineHD record. URLs are search/query based.
- The dashboard already uses TMDB as the source of truth; CineHD is only used
  for an availability hint (AVL badge) and a link.

## Public API endpoints

- **None found.** There is no documented public API.
- Probed paths (all from a normal browser context):
  - `/api/movies?search=<q>`
  - `/api/search?q=<q>`
  - `/api/movie?search=<q>`
  - `/movie/<title>`
  - `/search?q=<q>`
- Result: requests are gated by an anti-bot JS challenge ("Loading your page…"
  followed by a `window.location.replace(...)` with a signed `ch=1&js=<JWT>`
  token). Some probes returned HTTP 200 challenge pages; others reset the
  connection. No JSON payload was obtainable without executing the challenge.
- Response headers indicate Next.js + Cloudflare, but the challenge is served
  by an intermediate proxy (`server: Cowboy`), so the site is not directly
  fetchable from `fetch()` in a static page. CORS is not reliably available
  for these routes.

## Search URL patterns

- Primary search: `https://cinehd.cc/search?q=<encoded title>`
- Filtered search: `https://cinehd.cc/search?type=movie`
- Paginated/provider search: `https://cinehd.cc/search?page=1&watch_provider=433`

## Availability approach implemented

`modules/cinehd.js` implements:

- `CINEHD_BASE = "https://cinehd.cc"`
- `cinehdOpen(q)` — opens `CINEHD_BASE + "/search?q=" + encodeURIComponent(q)`
  in a new tab (deep link always works).
- `cinehdCheck(title, year)` — best-effort. Tries candidate endpoints
  (`/api/movies?search=`, `/api/search?q=`, `/api/movie?search=`, and the
  search page) with a 6s timeout. Accepts JSON or HTML:
  - JSON: walks the payload, collects objects that look like titles, and
    returns `true` only on a near-exact title match (with year agreement when
    both sides have a year).
  - HTML: only trusts the title when it appears as a JSON string value for a
    `"title"`/`"name"` field (conservative, avoids ad/boilerplate false
    positives).
  - Any network/CORS/parse failure moves to the next endpoint; if all fail,
    returns `false`.
  - Never throws.
- `cinehdMatch(tmdbItems)` — maps an array of TMDB items to
  `{ [title]: boolean }` by calling `cinehdCheck` per unique title (with the
  item's release year). Never throws; invalid input returns `{}`.

## Risks and limitations

- **No public API**: availability checks are best-effort and will usually
  return `false` in production because of the anti-bot challenge/CORS. The
  AVL badge is therefore an optimistic hint only, never a guarantee.
- **No false positives by design**: matching requires near-exact title (and
  year agreement when available). Ambiguous/partial matches return `false`.
- **Domain instability**: `cinehd.cc` has a history of suspensions/redirects;
  research notes mention a move to `cinehd.gd`. If the domain changes, update
  `CINEHD_BASE` only.
- **Clones/impersonators**: the CineHD name is copied; clones may request
  login/payment/installation. The real site never asks for accounts, payments,
  or installs. Deep links should keep using the configured base.
- **Rate/abuse**: avoid hammering endpoints; `cinehdMatch` deduplicates by
  title but still issues one request per unique title. Consider caching in the
  dashboard if needed.
- **Legal/ToS**: CineHD is an unofficial streaming guide; the dashboard only
  links to it and never embeds or proxies streams.
- **Client-side only**: no secrets or server-side components; all fetches use
  try/catch and degrade gracefully.

## Recommendation

Keep CineHD as a "deep search" destination (already in the dossier rail) and
treat the AVL badge as best-effort. If a reliable, documented endpoint becomes
available, update `CANDIDATE_ENDPOINTS` in `modules/cinehd.js` and the
matching logic without changing the public function signatures.
