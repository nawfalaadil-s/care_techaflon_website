from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "database" in payload
    assert isinstance(payload["database"]["connected"], bool)


def test_root_returns_app_info() -> None:
    response = client.get("/")
    assert response.status_code == 200
    payload = response.json()
    assert "app" in payload
    assert payload["health"] == "/api/health"
