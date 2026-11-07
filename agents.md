# AGENTS.md: Lovify

## Project
Lovify is a premium, calm, dark-first music streaming web app (installable PWA).
Original product with its own identity. Do NOT copy, reverse engineer or reuse
Spotify software, assets, name or logo. Personal use, shared with family and friends.

## Hard constraints
- ONLY free tools, free libraries and free-tier APIs. No paid services. Ask before
  adding any dependency or service not listed here.
- Work in small steps. After each task run lint, typecheck and tests, then summarize
  what changed. Commit per task with a clear message.
- Never print, log, commit or hardcode API keys.

## Stack
- Next.js (App Router) + TypeScript (strict), Tailwind CSS v3 (compiled, no CDN)
- Zustand (state), Dexie (IndexedDB), Serwist or next-pwa (PWA/service worker)
- dnd-kit (drag and drop), Framer Motion (animation), Vitest + Playwright (tests)
- Fonts and icons must be self-hosted (the app must work offline). Use Plus Jakarta Sans.
- Hosting target: Vercel free tier (or Cloudflare Pages).

## Design source of truth
- Folder `/design`: home.html, library.html, search.html, profile.html, logo.svg.
- Copy the Tailwind tokens (colors, spacing, radii, font sizes) from those files
  verbatim into tailwind.config. Match layouts, spacing and feel exactly.
- Build reusable components from repeated patterns: TrackRow, AlbumCard,
  ArtistCircle, Chip, QuickTile, MiniPlayer, BottomNav, TopBar.
- Use `design/logo.svg` inline in the TopBar. Generate PWA icons (192, 512, maskable
  512 with safe padding) and a favicon from the logo mark only (no text).
- Dark by default, plus a light theme toggle (persisted).
- Missing screens to add in the same style: Explore, full Player, Queue, Lyrics,
  Search results, Playlist/Album/Artist detail, Create-playlist sheet, Settings
  (including the YouTube API key section).
- Remove from the Stitch designs: fake status bar (9:41, wifi), `user-scalable=no`,
  "Hi-Res/FLAC/24-bit/Lossless" claims, paid plan and renewal card, listener
  counts, followers/following, Podcasts, HomePod/AirPlay devices, external image URLs.
- Replace: "Live Curator Radio" becomes "Vibe Radio" (auto-generated mix);
  plan card becomes a "Free" card showing the music source status.
- One shared player store feeds the MiniPlayer and the full Player (no
  inconsistent song names). Use one active-nav color everywhere (primary-container).
- Artwork comes from providers; use a soft gradient fallback.

## Layout and quality
- Mobile-first from 360px; desktop layout up to 1280px (sidebar on wide screens).
- Accessibility: 44px touch targets, text contrast >= 4.5:1, visible focus rings,
  keyboard navigation, ARIA on player and sliders, respect reduced motion.
- Targets: Lighthouse mobile Performance >= 90, Accessibility >= 95, PWA installable.

## Music architecture
- All music access goes through a `MusicProvider` interface:
  search, getTrack, getArtist, getAlbum, getPlayback.
  Implementations: YouTubeProvider, JamendoProvider, AudiusProvider.
- YouTube plays ONLY through the official IFrame Player API, visible on screen.
  Never extract or download audio, never hide the player, never use scrapers.
- Web Audio features (5-band EQ, gain, canvas visualizer at 60 FPS, crossfade)
  work ONLY on Jamendo/Audius tracks (use crossOrigin="anonymous"). For YouTube
  tracks use IFrame controls (volume, playback speed, fades) and show a note:
  "EQ is available for free-source tracks."
- Lyrics: LRCLIB (free, synced line-by-line highlight). Graceful "no lyrics" state.
- Metadata and artwork: MusicBrainz + Cover Art Archive, iTunes Search API where useful.

## YouTube key logic and quota
- Shared key lives only in `.env.local` as `YOUTUBE_API_KEY` (server-side only).
  NEVER use a `NEXT_PUBLIC_` prefix. `.env*` is in .gitignore; keep `.env.example`.
- Server calls go through `/api` routes with 24h response caching.
- Settings screen lets users paste their own YouTube key: store only in their
  browser (IndexedDB), validate with a cheap call, allow removal, show a link
  "How to get a free key". If a user key exists, call YouTube directly from the
  browser with it (never through our server, never using the shared quota).
  Otherwise use the server route.
- Quota protection: cache all searches (IndexedDB + server), debounce 500ms,
  minimum 3 characters, usage counter with a warning at 80%, auto-fallback to
  Jamendo/Audius on quota errors (403) with a friendly message.
- Search costs 100 units (10,000/day total); detail reads cost 1 unit. Prefer
  cached and cheap calls.

## Data and privacy
- Local-first: playlists, likes, history, settings and stats live in IndexedDB.
- JSON export/import for backup. No tracking or analytics.
- Offline downloads only for Jamendo/Audius tracks (Cache Storage), with a storage meter.

## Features by phase
1. Foundation: PWA shell, design system, all screens with mock data, Dexie schema.
2. Playback: providers, search, player, queue, Media Session, likes, playlists,
   history, lyrics, API key option.
3. Personalization: library sort/filter, drag-reorder, real stats, local
   recommendations, offline downloads, export/import.
4. Unique and polish: Vibe Radio, shareable playlist links (URL hash), adaptive
   artwork gradient, Audio Lab (EQ, visualizer, crossfade), performance,
   accessibility, deploy, README.
Only work on the phase I name. Do not start later phases.

## Never
- Fake status bars, `user-scalable=no`, external image or font URLs, hardcoded
  keys, paid-plan or lossless claims, reverse engineering or copying other apps.