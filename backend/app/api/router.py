from fastapi import APIRouter

from app.api.v1 import (
    auth,
    certificates,
    emails,
    health,
    problems,
    registration,
    settings,
    stats,
    submissions,
    teams,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(registration.router)
api_router.include_router(auth.router)
api_router.include_router(teams.router)
api_router.include_router(submissions.router)
api_router.include_router(problems.router)
api_router.include_router(stats.router)
api_router.include_router(emails.router)
api_router.include_router(certificates.router)
api_router.include_router(settings.router)
