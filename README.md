# Lovify

A calm, dark-first music player for your own library and free music sources.
Built as an installable PWA, local-first by default: playlists, likes, history,
downloads and settings live in your browser, not on a server.

Lovify is an original personal project for family and friends. It is not
affiliated with, and does not reuse assets or code from, any commercial music
service.

## What is inside

- **Home** — greeting, quick tiles, local mixes, fresh collections, recently
  played and recommendations shaped by local listening signals.
- **Search** — Audius and Jamendo out of the box; YouTube joins in when a key is
  configured. Results are cached and debounced.
- **Explore** — Vibe Radio mood slider, free-source discovery, genres and moods.
- **Library** — playlists, liked tracks, downloads, history, sorting, filtering
  and drag-to-reorder (mouse, touch and keyboard).
- **Player** — full-screen player, queue, seek, shuffle, repeat, volume, Media
  Session controls, an artwork-tinted background, synced lyrics from LRCLIB and
  a "no lyrics" state that does not get in the way. YouTube tracks use the
  official IFrame player (see [Playback rules](#playback-rules)).
- **Personal touches** — local stats, JSON export/import, shareable playlist
  links (track metadata in the URL hash), free-source offline downloads with a
  storage meter, dark/light theme toggle.
- **PWA** — installable, offline shell, auto-updating service worker, generated
  icons and a static offline fallback.

## Stack

| Area | Choice |
| --- | --- |
| App | React 18, Vite 6, TypeScript (strict), React Router 6 |
| Styling | Tailwind CSS 3 (compiled), self-hosted Plus Jakarta Sans and Material Symbols |
| State | Zustand |
| Storage | Dexie (IndexedDB), local-first |
| Motion | Framer Motion, dnd-kit |
| PWA | vite-plugin-pwa (Workbox), generated manifest and icons |
| Tests | Vitest + Testing Library, Playwright, axe-core |
| Quality | ESLint, TypeScript project references, Lighthouse |

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local   # optional, see below
npx playwright install chromium   # first time only, for e2e tests
npm run dev                  # http://localhost:5173
```

The app works without any key: Audius needs no credentials. Jamendo joins in
once you add a free client id, and YouTube once a key is available. Without
either, search and discovery still work through Audius.

### Environment variables

| Name | Scope | Purpose |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | server only | Shared YouTube Data API v3 key, used by `/api/youtube/*` |
| `VITE_JAMENDO_CLIENT_ID` | client (public) | Optional Jamendo client id baked into the build |

`YOUTUBE_API_KEY` must **never** be prefixed with `VITE_` (or `NEXT_PUBLIC_`).
Only server-side code reads it; the browser never receives it.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the local `/api/youtube/*` middleware |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the whole project |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end and axe accessibility tests |
| `npm run lighthouse` | Mobile Lighthouse runs against a preview build |
| `npm run icons` | Regenerate PWA icons from the logo mark |

## Music sources and keys

All providers implement one `MusicProvider` interface
(`src/lib/providers/types.ts`): `isConfigured`, `search`, `getTrack`,
`getArtist`, `getArtistTracks`, `getAlbum`, `getAlbumTracks`, `getPlayback`,
plus optional `trending` and `featuredAlbums`.

| Provider | Key needed | Playback |
| --- | --- | --- |
| Audius | none | Direct audio (`crossOrigin="anonymous"`) |
| Jamendo | optional client id | Direct audio (`crossOrigin="anonymous"`) |
| YouTube | optional API key | Official IFrame Player API, visible on screen |

### How the shared YouTube key works

- Locally, `.env.local` supplies `YOUTUBE_API_KEY` to a Vite middleware that
  mirrors the production routes.
- On Cloudflare Pages, `functions/api/youtube/[[path]].ts` reads the same value
  from the Pages environment and serves `/api/youtube/status`, `/search` and
  `/video`.
- On Vercel, the edge handlers in `api/youtube/` do the same.
- Successful responses are cached for 24 hours (`s-maxage=86400`).
- If the key is missing, quota is exhausted (HTTP 403) or the key is rejected,
  the app falls back to Audius/Jamendo with a friendly message.

The client also caches searches in IndexedDB, debounces input by 500 ms and
requires at least 3 characters. The Usage section in Settings warns at 80% of
the 10,000-unit daily quota. A search costs 100 units; a detail read costs 1.

### Getting a free YouTube key

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a
   project (the free tier is enough).
2. Go to **APIs & Services → Library**, search for **YouTube Data API v3** and
   enable it.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key: under **API restrictions** allow only **YouTube Data API
   v3**. Under **Application restrictions**, prefer **Websites** with your
   Lovify domain. For local-only use, `localhost` is enough.
5. Copy the key into `.env.local` as `YOUTUBE_API_KEY=...` for the shared key,
   or paste it in **Settings → YouTube** to use your own key.

A user key pasted in Settings is stored only in this browser's IndexedDB,
validated with a cheap call, sent directly to Google (never through Lovify's
server) and can be removed at any time. This keeps personal use off the shared
quota.

## Playback rules

- YouTube tracks play **only** through the official IFrame Player API. The
  iframe stays visible; Lovify never extracts, hides or downloads the stream.
- Free-source tracks are requested with `crossOrigin="anonymous"`, which keeps
  them ready for Web Audio processing. The Audio Lab (5-band EQ, canvas
  visualizer, crossfade) is not part of this build yet; when it lands it will
  apply only to Jamendo/Audius tracks. YouTube playback always stays inside the
  official iframe and never goes through Web Audio.
- Offline downloads are offered only for Jamendo/Audius tracks and are stored
  in Cache Storage.
- Lyrics come from LRCLIB and are highlighted line by line when synced lyrics
  exist. Missing lyrics show a calm empty state.

## Architecture

```text
src/
  components/    reusable UI: layout, media, player, playlist, brand, ui
  screens/       route screens (Home, Search, Explore, Library, Player, ...)
  stores/        Zustand stores (player, library, catalog, downloads, ui, ...)
  lib/
    providers/   MusicProvider interface + Audius, Jamendo, YouTube
    db.ts        Dexie schema (lazy-loaded, never on the first-paint path)
    artwork.ts   gradient fallbacks, palette extraction, thumbnail sizing
    share.ts     self-contained playlist links
    idle.ts      startup work split into short idle tasks
  styles/        Tailwind layers, tokens, self-hosted fonts
api/youtube/     Vercel edge routes
functions/       Cloudflare Pages Function for the same routes
server/          shared YouTube helpers and the local Vite middleware
e2e/             Playwright flows and the axe accessibility gate
```

### Local-first data

Dexie stores playlists, playlist tracks, likes, history, settings, search cache,
downloads, quota usage and lyrics cache. There is no account and no server-side
profile. JSON export/import moves the library between devices. No analytics or
tracking scripts are included.

The database module is loaded lazily and startup work is split into separate
idle tasks, so IndexedDB never blocks the first paint.

### Share links

`#share=v1:<base64url>` links carry the full track metadata (capped at 60
tracks), so a recipient can open and play the playlist without a backend.
Opening one starts the shared queue, moves to the player and clears the long
hash from the address bar.

## Deployment

### Cloudflare Pages (recommended)

1. Push this repository to GitHub.
2. In the Cloudflare dashboard open **Workers & Pages → Create → Pages →
   Connect to Git** and pick the repository.
3. Use these build settings:
   - Framework preset: **None** (or Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION=20`
4. Add `YOUTUBE_API_KEY` under **Settings → Environment variables** for
   Production (and Preview if you want it there). Never add a `VITE_` alias.
5. Optionally add `VITE_JAMENDO_CLIENT_ID` for a build-wide Jamendo id.
6. Deploy. Cloudflare picks up `functions/` automatically, so
   `/api/youtube/status`, `/search` and `/video` work without extra routing.
   `public/_routes.json` limits Function invocations to `/api/youtube/*`, so
   normal page and asset requests stay on the unlimited static path.

Unknown app routes fall back to `index.html`; `/offline` serves the static
`public/offline.html` shell when the network is unavailable. Hashed assets are
cached aggressively and the service worker updates in the background.

### Vercel (alternative)

Import the repository, keep the Vite defaults (`npm run build`, output `dist`)
and add `YOUTUBE_API_KEY` to the project environment. The handlers in
`api/youtube/` run as edge functions.

## Testing and measured results

- **Unit tests:** 74 Vitest tests across stores, providers, sharing, formatting
  and components.
- **End-to-end:** 13 Playwright flows (search → play → like → playlist, reload
  restore, cache reuse, lyrics, reorder, navigation, player).
- **Accessibility:** 5 axe-core audits (`/`, `/search`, `/library`, `/settings`,
  `/offline`) with zero serious or critical violations. Lighthouse
  accessibility and best-practices scores are 100.

Mobile Lighthouse (simulated 4x CPU, 390×844) on the production build varies a
lot on this machine because Home depends on third-party Audius calls and ~30
cover images from random validator hosts. The final three-run pass scored
**47, 38 and 48** performance (median 47); the best-balanced run had FCP 1.8 s,
LCP 5.1 s, TBT 1.48 s and TTI 6.5 s. Across the project the same page has
scored anywhere from 38 to 64 depending on how quickly Audius answered.
Accessibility and best-practices stayed at **100** in every run.

The **Performance ≥ 90** target is not reached under this throttled emulation.
The remaining gap is React's first commit on a 4x-slowdown CPU plus third-party
network latency, not a single runaway component; a quieter run and a warm
Audius cache get much closer (64). Reaching 90 here would need server rendering
or a pre-rendered shell, which is outside this phase.

What was done to keep the main thread free:

- Dexie, sheets and below-the-fold Home rows load on demand.
- Startup work is split into short idle tasks.
- Artwork uses sized thumbnails and CSS gradients instead of SVG noise filters.
- The static boot shell paints before React and is removed in a layout effect.
- Trending/featured catalogs are limited to 20 tracks and 8 collections.

Real phones on a warm connection feel considerably faster than the simulated
score suggests.

## Known limitations

- YouTube search and playback require a key; without one the app uses Audius
  and Jamendo only.
- The Audio Lab (5-band EQ, visualizer, crossfade) is not shipped yet. Web Audio
  effects will never apply to YouTube playback by design.
- Offline downloads cover Jamendo/Audius tracks only.
- Data does not sync between devices; use JSON export/import.
- Shared playlists are capped at 60 tracks to keep URLs manageable.
- Artwork, lyrics and catalog metadata come from third-party free services and
  can be missing or temporarily slow.
- `/api/youtube/*` Cloudflare functions were typechecked and their handler
  logic was exercised locally, but the Workers runtime could not be started on
  this Windows machine (missing VC++ runtime); CI does not deploy them either.

## Privacy

No accounts, no analytics, no tracking, no remote logging. API keys stay on the
server or in your browser. Playlists, likes, history, stats, downloads and
settings stay in IndexedDB on your device. Clearing site data removes them, so
keep a JSON backup if the library matters to you.

## License

Personal project, shared with family and friends. No commercial use. Third-party
music, artwork, lyrics and metadata remain the property of their respective
owners and are accessed through their public APIs.
