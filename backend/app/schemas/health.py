from pydantic import BaseModel


class DatabaseHealth(BaseModel):
    connected: bool
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    database: DatabaseHealth
    timestamp: str
