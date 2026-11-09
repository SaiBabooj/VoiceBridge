# VoiceBridge gateway

Server-side proxy for Gnani speech services. The browser never sees `GNANI_API_KEYS`.

## Purpose

- `POST /api/tts` — Timbre text-to-speech, returns `audio/mpeg`.
- `POST /api/stt` — Prisma speech-to-text, multipart `audio` + `lang` (`hi`, `ta`, `en` or BCP-47).
- `GET /health` — which providers are active.

Both endpoints go through provider interfaces (`app/providers/base.py`). The provider is chosen by
`PROVIDER_STT` / `PROVIDER_TTS` (`gnani` or `mock`). Mock providers need no network or keys.

## Setup

```bash
python3 -m venv services/gateway/.venv
services/gateway/.venv/bin/pip install -r services/gateway/requirements-dev.txt
```

Create `.env` at the repository root (it is gitignored):

```dotenv
GNANI_API_KEYS=key-one,key-two
PROVIDER_STT=gnani
PROVIDER_TTS=gnani
CORS_ORIGINS=http://localhost:5179,http://127.0.0.1:5179
```

`GNANI_API_KEYS` is comma separated. Keys are rotated round-robin and only retried on 401/403/429.
Keys are never logged, echoed in errors, or returned by any endpoint.

## Run

```bash
pnpm api        # http://127.0.0.1:8000
```

## Test

```bash
services/gateway/.venv/bin/pytest services/gateway          # offline, mocked transport
RUN_LIVE=1 services/gateway/.venv/bin/pytest -m live services/gateway   # real API calls
```

## Verified API facts

- Base URL `https://api.vachana.ai`, header `X-API-Key-ID` (plus `X-API-Request-ID`).
- STT: `POST /stt/v3`, multipart `audio_file`, form `language_code`, model `prisma-v3.0`, ≤30 s.
- TTS: `POST /api/v1/tts/inference`, JSON `{text, model: "timbre-v2.5", voice, language, speed, audio_config}`.
- Voices used: Hindi `Nalini`, Tamil `Asmita`, English `Pranav`.

## Scope

The chat conversation and translation are scripted sample data. `POST /api/stt` is ready for the
full pipeline; the UI uses Timbre for playback when `VITE_TTS_PROVIDER=gnani` and falls back to the
device voice otherwise.
