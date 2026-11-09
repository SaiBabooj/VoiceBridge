class ProviderError(Exception):
    """Stable, key-free error surfaced by the gateway."""

    def __init__(self, code: str, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
