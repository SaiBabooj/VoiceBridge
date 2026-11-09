from __future__ import annotations

import io
import math
import struct
import wave

from ..langs import to_bcp47
from .base import AudioResult, STTResult

_SCRIPTS = {
    "hi-IN": "मैं कपालेश्वर मंदिर और मरीना बीच देखना चाहता हूँ।",
    "ta-IN": "நான் கபாலீஸ்வரர் கோயிலும் மெரினா கடற்கரையும் பார்க்க விரும்புகிறேன்.",
    "en-IN": "I would like to see Kapaleeshwarar Temple and Marina Beach.",
}


class MockSTT:
    def transcribe(self, audio: bytes, filename: str, lang: str) -> STTResult:
        code = to_bcp47(lang)
        return STTResult(transcript=_SCRIPTS[code], language=code)


class MockTTS:
    def synthesize(self, text: str, lang: str, speed: float = 1.0) -> AudioResult:
        to_bcp47(lang)
        return AudioResult(data=_tone_wav(), media_type="audio/wav")


def _tone_wav(duration: float = 0.3, rate: int = 16000) -> bytes:
    frames = io.BytesIO()
    with wave.open(frames, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        samples = bytearray()
        for index in range(int(duration * rate)):
            value = int(2000 * math.sin(2 * math.pi * 220 * index / rate))
            samples += struct.pack("<h", value)
        out.writeframes(bytes(samples))
    return frames.getvalue()
