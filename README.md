# VoiceBridge

A voice-first travel companion for people who do not share a language. A traveller and a local
driver hold a spoken conversation, see each other's words translated in real time, plan the day
together and lock an agreement only after both sides confirm the price, the hours and the stops.

Built for the Chennai market: Tamil, Hindi and English, with large touch targets, high-contrast
modes and a driving-safe layout.

## Highlights

- **Traveller and driver surfaces** with a single switch, so both sides of the conversation can be
  demonstrated on one device.
- **Translation-first chat.** Incoming messages are shown in the reader's language; the original is
  kept underneath with a replay button.
- **Spoken playback.** Text-to-speech for every message, with automatic playback on the driver
  surface and a device-voice fallback when the speech service is unavailable.
- **Explicit confirmations.** Prices, times and places must be confirmed by the speaker and then
  agreed by the other side before the plan can be locked. An unconfirmed value is never shown as
  final.
- **Shared plan.** Stops, timings, group size and the driver's quote stay in sync while the plan is
  being built.
- **Driver tools.** Availability, an incoming request card with a spoken summary, a large
  push-to-talk control, display settings and a voice-first tip recorder.
- **Installable PWA** with an offline app shell, three languages and light/dark themes.

All drivers, places, prices, ratings and conversations in the app are sample data and are labelled
as such.

## Repository layout

```
apps/web                 React + TypeScript PWA
  src/components         Design system and chat components
  src/screens            Traveller and driver screens
  src/lib                Mock gateway, transport, speech, API clients
  src/i18n               English, Hindi and Tamil copy
  public                 Manifest, service worker and icons
services/gateway         FastAPI speech gateway
  app/providers          Provider interfaces, live and mock implementations
  tests                  Offline tests and an opt-in live test
api                      Vercel serverless entry points (TTS and STT)
vercel.json              Vercel build, routing and function configuration
```

### How the pieces fit

- `apps/web` runs against an in-browser mock gateway by default. The mock emits the same event
  envelopes the production gateway will use, so screens are not coupled to the mock.
- `src/lib/transport.ts` selects the mock transport or a WebSocket transport. Set
  `VITE_USE_MOCKS=false` to use a real gateway.
- `services/gateway` exposes `POST /api/tts` and `POST /api/stt` behind provider interfaces. The
  provider is selected with `PROVIDER_TTS` / `PROVIDER_STT` (`gnani` or `mock`).
- API keys stay on the server. The browser only calls the gateway; it never receives a provider key.
- On Vercel, `apps/web` is served as a static build and `api/` exposes the same speech endpoints as
  serverless functions.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS 3 |
| State and routing | Zustand, React Router |
| Localisation | i18next / react-i18next (en, hi, ta) |
| Backend | FastAPI, httpx, Pydantic |
| Speech services | Gnani Prisma (speech-to-text), Gnani Timbre (text-to-speech) |
| Tooling | pnpm workspaces, pytest, GitHub Actions |

## Getting started

Requirements: Node 22+, pnpm 12, Python 3.11+.

```bash
pnpm install

# Gateway environment (server-side keys only)
cp .env.example .env            # add GNANI_API_KEYS

python3 -m venv services/gateway/.venv
services/gateway/.venv/bin/pip install -r services/gateway/requirements-dev.txt

# Optional frontend environment
cp apps/web/.env.example apps/web/.env
```

Run the two processes in separate terminals:

```bash
pnpm dev    # http://127.0.0.1:5179
pnpm api    # http://127.0.0.1:8000
```

Open the web app, choose a language, and use the **Driver** switch in the top-right corner to move
between the traveller and driver surfaces.

## Environment variables

Root `.env` (server-side, never exposed to the browser):

| Name | Purpose |
| --- | --- |
| `GNANI_API_KEYS` | Comma-separated API keys, rotated round-robin per request |
| `PROVIDER_STT` | `gnani` or `mock` |
| `PROVIDER_TTS` | `gnani` or `mock` |
| `GNANI_BASE_URL` | Provider base URL, defaults to `https://api.vachana.ai` |
| `GNANI_TIMEOUT` | Request timeout in seconds |
| `CORS_ORIGINS` | Comma-separated allowed browser origins for local development |

`apps/web/.env` (build-time, public by definition):

| Name | Purpose |
| --- | --- |
| `VITE_USE_MOCKS` | `true` uses the in-browser conversation; `false` uses the WebSocket transport |
| `VITE_WS_URL` | WebSocket gateway base, defaults to `ws://localhost:8000` |
| `VITE_API_URL` | Speech gateway base. Defaults to `http://127.0.0.1:8000` in development and the same origin in production |
| `VITE_TTS_PROVIDER` | `browser` forces device speech; any other value uses the speech gateway with a device fallback |

Only `VITE_*` values are visible in the browser. Never place `GNANI_API_KEYS` in a `VITE_*`
variable.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the web app on port 5179 |
| `pnpm build` | Type-check and build the production bundle |
| `pnpm typecheck` | Type-check the web app |
| `pnpm api` | Start the FastAPI gateway on port 8000 |
| `pnpm test:api` | Run the offline gateway tests |

Live provider check (consumes provider quota):

```bash
cd services/gateway
RUN_LIVE=1 .venv/bin/python -m pytest -m live
```

## Deploying to Vercel

The repository is configured for a single Vercel project:

1. Import the repository in Vercel. Keep the root directory at the repository root; `vercel.json`
   supplies the install command, build command, output directory and routing.
2. Add these environment variables for Production and Preview:
   - `GNANI_API_KEYS` — the comma-separated keys (secret)
   - `PROVIDER_STT=gnani`
   - `PROVIDER_TTS=gnani`
   - `GNANI_BASE_URL=https://api.vachana.ai`
3. Deploy. The web app is served from `apps/web/dist`, and `api/tts.py` / `api/stt.py` expose the
   speech endpoints at `/api/tts` and `/api/stt` on the same origin.
4. Set `VITE_USE_MOCKS=true` for the scripted demo, or `false` plus `VITE_WS_URL` when a real-time
   gateway is available. `VITE_API_URL` is only needed when the speech gateway is hosted elsewhere.

The service worker is served with `must-revalidate` so new deployments are picked up, and
client-side routes fall back to `index.html` while `/api/*` stays with the functions.

## Continuous integration

`.github/workflows/ci.yml` runs the web type-check and build plus the offline gateway tests on every
push and pull request.

## Sample data

This repository is a demonstration build. Every driver, vehicle, rating, place, price and
conversation is sample data. The chat transcript and translation are scripted; real speech-to-text
and text-to-speech are available through the gateway.
