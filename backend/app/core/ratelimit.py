"""In-process sliding-window rate limiting (stdlib only).

Keyed per ``(bucket, client IP)`` with monotonic timestamps. This protects
auth and public write endpoints from brute-force/abuse bursts in a single
uvicorn worker — the deployment target for this event. For multi-worker
production the same interface can be backed by Redis without touching
call sites.

Enable/disable globally via ``RATE_LIMIT_ENABLED`` (tests disable it so
the shared TestClient IP never trips unrelated suites).
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import HTTPException, Request, status

from app.core.config import settings


def _enabled() -> bool:
    return os.environ.get("RATE_LIMIT_ENABLED", "true").lower() not in {
        "0",
        "false",
        "no",
    }


class RateLimiter:
    """Sliding-window counter: ``limit`` hits per ``window_seconds``."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        """Raise 429 when ``key`` exceeds the budget; otherwise record a hit."""
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - self.window
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= self.limit:
            retry_after = max(1, int(self.window - (now - bucket[0])) + 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)

    def reset(self) -> None:
        """Clear all counters (used by tests)."""
        self._hits.clear()


def client_ip(request: Request) -> str:
    """Best-effort client identity.

    Only trusts ``X-Forwarded-For`` in production (where the app sits behind
    the platform's reverse proxy, which *appends* the real client IP last).
    Elsewhere the socket peer is used directly so a spoofed header can never
    rotate rate-limit buckets.
    """
    if settings.ENVIRONMENT == "production":
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, limit: int, window_seconds: int):
    """Build a FastAPI dependency enforcing ``limit`` per IP per window.

    The returned dependency also carries ``bucket`` and ``reset`` attributes so
    tests and ops can introspect/clear the underlying counter without reaching
    into the closure.
    """
    limiter = RateLimiter(limit, window_seconds)

    def dependency(request: Request) -> None:
        if not _enabled():
            return
        limiter.check(f"{bucket}:{client_ip(request)}")

    def reset() -> None:
        limiter.reset()

    # Expose for .reset() calls in tests / operational tooling.
    dependency.bucket = bucket  # type: ignore[attr-defined]
    dependency.reset = reset  # type: ignore[attr-defined]
    return dependency
