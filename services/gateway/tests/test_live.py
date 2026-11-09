from __future__ import annotations

import os

import pytest

from app.config import Settings
from app.providers.registry import build_stt, build_tts

pytestmark = pytest.mark.live


@pytest.mark.skipif(
    os.getenv("RUN_LIVE") != "1", reason="Set RUN_LIVE=1 to call the real Gnani API."
)
def test_live_tts_then_stt_roundtrip() -> None:
    settings = Settings.load()
    if not settings.api_keys:
        pytest.skip("GNANI_API_KEYS is not set.")

    tts = build_tts(settings)
    audio = tts.synthesize("नमस्ते, मैं कपालेश्वर मंदिर जाना चाहता हूँ।", "hi")
    assert len(audio.data) > 1000

    stt = build_stt(settings)
    result = stt.transcribe(audio.data, "roundtrip.mp3", "hi")
    assert result.transcript
