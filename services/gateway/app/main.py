from __future__ import annotations

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from .config import Settings
from .errors import ProviderError
from .providers.base import STTProvider, TTSProvider
from .providers.registry import build_stt, build_stt_with_keys, build_tts, build_tts_with_keys

MAX_AUDIO_BYTES = 10 * 1024 * 1024
MAX_KEYS = 4
MAX_KEY_LENGTH = 512


def extract_keys(raw: str) -> tuple[str, ...]:
    keys = tuple(part.strip() for part in raw.split(",") if part.strip())
    if len(keys) > MAX_KEYS:
        raise ProviderError("INVALID_KEY", "Too many API keys.", 400)
    if any(
        len(key) > MAX_KEY_LENGTH or any(ord(char) < 32 or ord(char) == 127 for char in key)
        for key in keys
    ):
        raise ProviderError("INVALID_KEY", "The API key is not valid.", 400)
    return keys


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    lang: str = Field(min_length=2, max_length=8)
    speed: float = Field(default=1.0, ge=0.85, le=1.15)


def create_app(
    settings: Settings | None = None,
    stt: STTProvider | None = None,
    tts: TTSProvider | None = None,
) -> FastAPI:
    resolved = settings or Settings.load()

    def optional(provider: STTProvider | TTSProvider | None, builder):
        if provider is not None:
            return provider
        try:
            return builder(resolved)
        except ProviderError:
            # A deployment may intentionally run without owner keys and rely on per-request keys.
            return None

    stt_provider = optional(stt, build_stt)
    tts_provider = optional(tts, build_tts)

    app = FastAPI(title="VoiceBridge gateway", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["content-type", "x-gnani-key"],
    )

    @app.exception_handler(ProviderError)
    def provider_error(_: Request, exc: ProviderError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.get("/health")
    def health() -> dict[str, object]:
        return {
            "status": "ok",
            "providers": {"stt": resolved.stt_provider, "tts": resolved.tts_provider},
        }

    @app.post("/api/tts")
    def synthesize(body: TTSRequest, request: Request) -> Response:
        text = body.text.strip()
        if not text:
            raise ProviderError("TEXT_EMPTY", "Text is required.", 422)
        keys = extract_keys(request.headers.get("x-gnani-key", ""))
        provider = build_tts_with_keys(resolved, keys) if keys else tts_provider
        if provider is None:
            raise ProviderError("KEY_REQUIRED", "Add a Gnani API key to hear real voices.", 401)
        audio = provider.synthesize(text, body.lang, body.speed)
        return Response(content=audio.data, media_type=audio.media_type)

    @app.post("/api/stt")
    def transcribe(
        request: Request,
        audio: UploadFile = File(...),
        lang: str = Form(...),
    ) -> dict[str, str]:
        data = audio.file.read(MAX_AUDIO_BYTES + 1)
        if not data:
            raise ProviderError("AUDIO_EMPTY", "No audio received.", 422)
        if len(data) > MAX_AUDIO_BYTES:
            raise ProviderError("AUDIO_TOO_LARGE", "Audio exceeds 10 MB.", 413)
        keys = extract_keys(request.headers.get("x-gnani-key", ""))
        provider = build_stt_with_keys(resolved, keys) if keys else stt_provider
        if provider is None:
            raise ProviderError("KEY_REQUIRED", "Add a Gnani API key to use speech-to-text.", 401)
        result = provider.transcribe(data, audio.filename or "audio.wav", lang)
        return {"transcript": result.transcript, "lang": result.language}

    return app


app = create_app()
