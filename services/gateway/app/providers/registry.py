from __future__ import annotations

from ..config import Settings
from ..errors import ProviderError
from .base import STTProvider, TTSProvider
from .gnani import GnaniSTT, GnaniTTS, KeyRing
from .mock import MockSTT, MockTTS


def _ring(settings: Settings) -> KeyRing:
    if not settings.api_keys:
        raise ProviderError("CONFIG_ERROR", "GNANI_API_KEYS is not set.", 500)
    return KeyRing(settings.api_keys)


def build_stt(settings: Settings) -> STTProvider:
    if settings.stt_provider == "gnani":
        return GnaniSTT(_ring(settings), settings.base_url, settings.timeout)
    if settings.stt_provider == "mock":
        return MockSTT()
    raise ProviderError("CONFIG_ERROR", f"Unknown STT provider: {settings.stt_provider}.", 500)


def build_tts(settings: Settings) -> TTSProvider:
    if settings.tts_provider == "gnani":
        return GnaniTTS(_ring(settings), settings.base_url, settings.timeout)
    if settings.tts_provider == "mock":
        return MockTTS()
    raise ProviderError("CONFIG_ERROR", f"Unknown TTS provider: {settings.tts_provider}.", 500)
