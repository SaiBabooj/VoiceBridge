from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class STTResult:
    transcript: str
    language: str


@dataclass(frozen=True)
class AudioResult:
    data: bytes
    media_type: str


class STTProvider(Protocol):
    def transcribe(self, audio: bytes, filename: str, lang: str) -> STTResult: ...


class TTSProvider(Protocol):
    def synthesize(self, text: str, lang: str, speed: float = 1.0) -> AudioResult: ...
