from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip("'\""))


def _split(value: str) -> tuple[str, ...]:
    return tuple(part.strip() for part in value.split(",") if part.strip())


@dataclass(frozen=True)
class Settings:
    api_keys: tuple[str, ...]
    stt_provider: str
    tts_provider: str
    base_url: str
    timeout: float
    cors_origins: tuple[str, ...]

    @classmethod
    def load(cls) -> "Settings":
        _load_env_file(REPO_ROOT / ".env")
        return cls(
            api_keys=_split(os.getenv("GNANI_API_KEYS", "")),
            stt_provider=os.getenv("PROVIDER_STT", "mock").strip().lower(),
            tts_provider=os.getenv("PROVIDER_TTS", "mock").strip().lower(),
            base_url=os.getenv("GNANI_BASE_URL", "https://api.vachana.ai").rstrip("/"),
            timeout=float(os.getenv("GNANI_TIMEOUT", "30")),
            cors_origins=_split(
                os.getenv(
                    "CORS_ORIGINS",
                    "http://localhost:5179,http://127.0.0.1:5179",
                )
            ),
        )
