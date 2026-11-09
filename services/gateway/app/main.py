from __future__ import annotations

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from .config import Settings
from .errors import ProviderError
from .providers.base import STTProvider, TTSProvider
from .providers.registry import build_stt, build_tts

MAX_AUDIO_BYTES = 10 * 1024 * 1024


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
    stt_provider = stt or build_stt(resolved)
    tts_provider = tts or build_tts(resolved)

    app = FastAPI(title="VoiceBridge gateway", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["content-type"],
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
    def synthesize(body: TTSRequest) -> Response:
        text = body.text.strip()
        if not text:
            raise ProviderError("TEXT_EMPTY", "Text is required.", 422)
        audio = tts_provider.synthesize(text, body.lang, body.speed)
        return Response(content=audio.data, media_type=audio.media_type)

    @app.post("/api/stt")
    def transcribe(
        audio: UploadFile = File(...),
        lang: str = Form(...),
    ) -> dict[str, str]:
        data = audio.file.read(MAX_AUDIO_BYTES + 1)
        if not data:
            raise ProviderError("AUDIO_EMPTY", "No audio received.", 422)
        if len(data) > MAX_AUDIO_BYTES:
            raise ProviderError("AUDIO_TOO_LARGE", "Audio exceeds 10 MB.", 413)
        result = stt_provider.transcribe(data, audio.filename or "audio.wav", lang)
        return {"transcript": result.transcript, "lang": result.language}

    return app


app = create_app()
