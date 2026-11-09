from __future__ import annotations

import json
import threading
import uuid
from collections.abc import Sequence

import httpx

from ..errors import ProviderError
from ..langs import to_bcp47
from .base import AudioResult, STTResult

VOICES = {"hi-IN": "Nalini", "ta-IN": "Asmita", "en-IN": "Pranav"}
MODEL = "timbre-v2.5"
STT_MODEL = "prisma-v3.0"

_AUTH_STATUSES = frozenset({401, 403})
_RETRY_STATUSES = _AUTH_STATUSES | {429}


class KeyRing:
    def __init__(self, keys: Sequence[str]) -> None:
        if not keys:
            raise ProviderError("CONFIG_ERROR", "No Gnani API keys configured.", 500)
        self._keys = tuple(keys)
        self._index = 0
        self._lock = threading.Lock()

    def __len__(self) -> int:
        return len(self._keys)

    def next(self) -> str:
        with self._lock:
            key = self._keys[self._index % len(self._keys)]
            self._index += 1
            return key


def _headers(key: str) -> dict[str, str]:
    return {"X-API-Key-ID": key, "X-API-Request-ID": uuid.uuid4().hex}


def _raise_for(status: int) -> ProviderError:
    if status in _AUTH_STATUSES:
        return ProviderError("AUTH_FAILED", "Gnani rejected the API key.", 502)
    if status == 429:
        return ProviderError("RATE_LIMITED", "Gnani rate limit reached.", 429)
    return ProviderError("UPSTREAM_ERROR", f"Gnani returned status {status}.", 502)


class GnaniSTT:
    def __init__(
        self,
        keys: KeyRing,
        base_url: str,
        timeout: float,
        client: httpx.Client | None = None,
    ) -> None:
        self._keys = keys
        self._url = f"{base_url}/stt/v3"
        # trust_env=False: bracketed IPv6 entries in NO_PROXY crash httpx's pattern parser.
        self._client = client or httpx.Client(timeout=timeout, trust_env=False)

    def transcribe(self, audio: bytes, filename: str, lang: str) -> STTResult:
        code = to_bcp47(lang)
        last = ProviderError("UPSTREAM_ERROR", "Gnani request failed.", 502)
        for _ in range(len(self._keys)):
            key = self._keys.next()
            try:
                response = self._client.post(
                    self._url,
                    headers=_headers(key),
                    files={"audio_file": (filename, audio)},
                    data={"language_code": code, "model": STT_MODEL, "format": "verbatim"},
                )
            except httpx.HTTPError as exc:
                raise ProviderError(
                    "UPSTREAM_UNAVAILABLE", "Speech service is unreachable.", 503
                ) from exc
            if response.status_code == 200:
                return self._parse(response, code)
            last = _raise_for(response.status_code)
            if response.status_code not in _RETRY_STATUSES:
                raise last
        raise last

    @staticmethod
    def _parse(response: httpx.Response, code: str) -> STTResult:
        try:
            body = response.json()
        except json.JSONDecodeError as exc:
            raise ProviderError("UPSTREAM_ERROR", "Gnani returned invalid JSON.", 502) from exc
        transcript = str(body.get("transcript") or "").strip()
        if not transcript:
            raise ProviderError("STT_EMPTY", "No speech was recognised.", 422)
        return STTResult(transcript=transcript, language=str(body.get("detected_language_code") or code))


class GnaniTTS:
    def __init__(
        self,
        keys: KeyRing,
        base_url: str,
        timeout: float,
        client: httpx.Client | None = None,
    ) -> None:
        self._keys = keys
        self._url = f"{base_url}/api/v1/tts/inference"
        self._client = client or httpx.Client(timeout=timeout, trust_env=False)

    def synthesize(self, text: str, lang: str, speed: float = 1.0) -> AudioResult:
        code = to_bcp47(lang)
        body = {
            "text": text,
            "model": MODEL,
            "voice": VOICES[code],
            "language": code,
            "speed": speed,
            "audio_config": {
                "sample_rate": 48000,
                "encoding": "linear_pcm",
                "num_channels": 1,
                "sample_width": 2,
                "container": "mp3",
                "bitrate": "128k",
            },
        }
        last = ProviderError("UPSTREAM_ERROR", "Gnani request failed.", 502)
        for _ in range(len(self._keys)):
            key = self._keys.next()
            try:
                response = self._client.post(self._url, headers=_headers(key), json=body)
            except httpx.HTTPError as exc:
                raise ProviderError(
                    "UPSTREAM_UNAVAILABLE", "Speech service is unreachable.", 503
                ) from exc
            if response.status_code == 200 and response.content:
                media_type = response.headers.get("content-type", "audio/mpeg").split(";")[0]
                return AudioResult(data=response.content, media_type=media_type or "audio/mpeg")
            last = _raise_for(response.status_code) if response.status_code != 200 else ProviderError(
                "TTS_EMPTY", "Gnani returned empty audio.", 502
            )
            if response.status_code not in _RETRY_STATUSES:
                raise last
        raise last
