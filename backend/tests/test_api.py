"""Prueba el API con mocks. Correr desde la raiz del repo: python -m pytest backend/tests"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_farms():
    r = client.get("/farms")
    assert r.status_code == 200
    assert {f["farm_id"] for f in r.json()} == {"farm_1", "farm_2", "farm_3"}


def test_recommend_returns_three_rotations():
    r = client.post("/recommend", json={"farm_id": "farm_1", "priority": "Water Saving"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["rotations"]) == 3
    assert sum(x["is_current"] for x in data["rotations"]) == 1
    assert data["best_rotation_id"] in {x["id"] for x in data["rotations"]}


def test_priority_changes_totals():
    a = client.post("/recommend", json={"farm_id": "farm_1", "priority": "Profit"}).json()
    b = client.post("/recommend", json={"farm_id": "farm_1", "priority": "Soil Health"}).json()
    assert a["priority"] == "Profit" and b["priority"] == "Soil Health"
    assert [x["scores"]["total"] for x in a["rotations"]] != [x["scores"]["total"] for x in b["rotations"]]


def test_recommend_with_point():
    r = client.post("/recommend", json={"lat": 33.5, "lon": -101.8, "priority": "Balanced"})
    assert r.status_code == 200
    assert r.json()["farm_id"] == "custom"


def test_unknown_farm_is_404():
    r = client.post("/recommend", json={"farm_id": "farm_99", "priority": "Balanced"})
    assert r.status_code == 404


def test_missing_farm_and_point_is_422():
    r = client.post("/recommend", json={"priority": "Balanced"})
    assert r.status_code == 422