from __future__ import annotations

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import ProviderError
from app.main import create_app, extract_keys
from app.providers.gnani import GnaniSTT, GnaniTTS, KeyRing
from app.providers.mock import MockSTT, MockTTS
from app.providers.registry import build_stt, build_tts


def settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "api_keys": ("key-a", "key-b"),
        "stt_provider": "gnani",
        "tts_provider": "gnani",
        "base_url": "https://api.test",
        "timeout": 5.0,
        "cors_origins": ("http://localhost:5179",),
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


def test_key_ring_round_robins() -> None:
    ring = KeyRing(["a", "b"])
    assert [ring.next(), ring.next(), ring.next()] == ["a", "b", "a"]


def test_gnani_tts_rotates_on_rate_limit() -> None:
    seen: list[str] = []
    bodies: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.headers["x-api-key-id"])
        bodies.append(json.loads(request.content))
        if len(seen) == 1:
            return httpx.Response(429)
        return httpx.Response(
            200, content=b"ID3fake-mp3", headers={"content-type": "audio/mpeg"}
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = GnaniTTS(KeyRing(["key-a", "key-b"]), "https://api.test", 5, client=client)

    result = provider.synthesize("नमस्ते", "hi", 1.0)

    assert seen == ["key-a", "key-b"]
    assert result.data == b"ID3fake-mp3"
    assert result.media_type == "audio/mpeg"
    assert bodies[0]["voice"] == "Nalini"
    assert bodies[0]["model"] == "timbre-v2.5"
    assert bodies[0]["language"] == "hi-IN"
    assert bodies[0]["audio_config"] == {
        "sample_rate": 48000,
        "encoding": "linear_pcm",
        "num_channels": 1,
        "sample_width": 2,
        "container": "mp3",
        "bitrate": "128k",
    }


def test_gnani_tts_maps_auth_errors_without_leaking_keys() -> None:
    client = httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(401)))
    provider = GnaniTTS(KeyRing(["secret-one", "secret-two"]), "https://api.test", 5, client=client)

    with pytest.raises(ProviderError) as excinfo:
        provider.synthesize("hello", "en")

    assert excinfo.value.code == "AUTH_FAILED"
    assert "secret" not in excinfo.value.message


def test_gnani_stt_posts_multipart_with_language_and_model() -> None:
    captured: dict[str, bytes] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.read()
        return httpx.Response(
            200,
            json={
                "success": True,
                "transcript": "  வணக்கம்  ",
                "detected_language_code": "ta-IN",
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = GnaniSTT(KeyRing(["key-a"]), "https://api.test", 5, client=client)

    result = provider.transcribe(b"RIFFdata", "clip.wav", "ta")

    assert result.transcript == "வணக்கம்"
    assert result.language == "ta-IN"
    body = captured["body"]
    assert b'name="language_code"' in body and b"ta-IN" in body
    assert b'name="model"' in body and b"prisma-v3.0" in body
    assert b"RIFFdata" in body


def test_gnani_stt_empty_transcript_is_reported() -> None:
    client = httpx.Client(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"transcript": ""}))
    )
    provider = GnaniSTT(KeyRing(["key-a"]), "https://api.test", 5, client=client)

    with pytest.raises(ProviderError) as excinfo:
        provider.transcribe(b"data", "clip.wav", "hi")

    assert excinfo.value.code == "STT_EMPTY"


def test_mock_providers_are_usable_offline() -> None:
    stt = MockSTT()
    assert stt.transcribe(b"", "a.wav", "hi").transcript
    with pytest.raises(ProviderError):
        stt.transcribe(b"", "a.wav", "fr")

    audio = MockTTS().synthesize("hello", "en")
    assert audio.data[:4] == b"RIFF"
    assert audio.media_type == "audio/wav"


def test_registry_requires_keys_for_gnani() -> None:
    with pytest.raises(ProviderError) as excinfo:
        build_tts(settings(api_keys=()))
    assert excinfo.value.code == "CONFIG_ERROR"


def test_registry_selects_mock_by_env() -> None:
    resolved = settings(stt_provider="mock", tts_provider="mock", api_keys=())
    assert isinstance(build_stt(resolved), MockSTT)
    assert isinstance(build_tts(resolved), MockTTS)


def test_gateway_tts_endpoint_returns_audio() -> None:
    app = create_app(settings=settings(api_keys=()), stt=MockSTT(), tts=MockTTS())
    client = TestClient(app)

    response = client.post("/api/tts", json={"text": "नमस्ते", "lang": "hi"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.content[:4] == b"RIFF"


def test_gateway_stt_endpoint_returns_transcript() -> None:
    app = create_app(settings=settings(api_keys=()), stt=MockSTT(), tts=MockTTS())
    client = TestClient(app)

    response = client.post(
        "/api/stt",
        files={"audio": ("clip.wav", b"RIFFdata", "audio/wav")},
        data={"lang": "ta"},
    )

    assert response.status_code == 200
    assert response.json()["lang"] == "ta-IN"
    assert response.json()["transcript"]


def test_gateway_rejects_unsupported_language() -> None:
    app = create_app(settings=settings(api_keys=()), stt=MockSTT(), tts=MockTTS())
    client = TestClient(app)

    response = client.post("/api/tts", json={"text": "hello", "lang": "fr"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_LANGUAGE"


def test_gateway_reports_provider_modes() -> None:
    app = create_app(settings=settings(api_keys=(), stt_provider="mock", tts_provider="mock"))
    body = TestClient(app).get("/health").json()
    assert body == {"status": "ok", "providers": {"stt": "mock", "tts": "mock"}}


def test_extract_keys_trims_and_limits() -> None:
    assert extract_keys(" key-a, key-b ,,") == ("key-a", "key-b")
    assert extract_keys("") == ()

    with pytest.raises(ProviderError) as too_many:
        extract_keys("a,b,c,d,e")
    assert too_many.value.code == "INVALID_KEY"

    with pytest.raises(ProviderError) as too_long:
        extract_keys("x" * 513)
    assert too_long.value.code == "INVALID_KEY"
    assert "xxxx" not in too_long.value.message


def test_gateway_starts_without_owner_keys_and_asks_for_one() -> None:
    app = create_app(settings=settings(api_keys=()))
    client = TestClient(app)

    response = client.post("/api/tts", json={"text": "hello", "lang": "en"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "KEY_REQUIRED"


def test_gateway_uses_request_scoped_key(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[tuple[str, ...]] = []

    def fake_provider(_: Settings, keys: tuple[str, ...]) -> MockTTS:
        seen.append(tuple(keys))
        return MockTTS()

    monkeypatch.setattr("app.main.build_tts_with_keys", fake_provider)
    app = create_app(settings=settings(api_keys=()))
    client = TestClient(app)

    response = client.post(
        "/api/tts",
        json={"text": "hello", "lang": "en"},
        headers={"x-gnani-key": " key-a , key-b "},
    )

    assert response.status_code == 200
    assert response.content[:4] == b"RIFF"
    assert seen == [("key-a", "key-b")]


def test_gateway_rejects_invalid_key_header_without_echoing_it() -> None:
    app = create_app(settings=settings(api_keys=()))
    client = TestClient(app)

    response = client.post(
        "/api/tts",
        json={"text": "hello", "lang": "en"},
        headers={"x-gnani-key": "secret" * 100},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_KEY"
    assert "secret" not in response.text
