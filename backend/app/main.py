from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


def _install_security_headers(app: FastAPI) -> None:
    """Baseline hardening headers on every API response."""

    @app.middleware("http")
    async def security_headers(request, call_next):  # noqa: ANN001, ANN202
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        # API payloads are session- or PII-scoped; never let a proxy/CDN cache them.
        response.headers.setdefault("Cache-Control", "no-store")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if settings.ENVIRONMENT == "production":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


def create_app() -> FastAPI:
    if settings.ENVIRONMENT == "production" and settings.SECRET_KEY in (
        "",
        "change-me-in-production",
    ):
        raise RuntimeError(
            "SECRET_KEY must be set to a strong value when ENVIRONMENT=production."
        )

    docs_enabled = settings.DEBUG and settings.ENVIRONMENT != "production"
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    _install_security_headers(app)

    app.include_router(api_router, prefix="/api")

    @app.get("/")
    def root() -> dict[str, str]:
        info = {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "health": "/api/health",
        }
        if settings.DEBUG and settings.ENVIRONMENT != "production":
            info["docs"] = "/docs"
        return info

    return app


app = create_app()
