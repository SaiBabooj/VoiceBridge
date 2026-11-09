from __future__ import annotations

from .errors import ProviderError

BCP47 = {"hi": "hi-IN", "ta": "ta-IN", "en": "en-IN"}


def to_bcp47(lang: str) -> str:
    code = lang.strip().lower()
    if code in BCP47:
        return BCP47[code]
    if code in BCP47.values():
        return code
    raise ProviderError("UNSUPPORTED_LANGUAGE", f"Unsupported language: {lang}", 422)
