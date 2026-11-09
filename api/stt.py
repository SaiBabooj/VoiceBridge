from __future__ import annotations

import sys
from pathlib import Path

# Vercel bundles this entry point; the shared gateway package lives outside api/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services" / "gateway"))

from app.main import app  # noqa: E402

__all__ = ["app"]
