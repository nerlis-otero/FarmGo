"""Prueba el API con mocks. Correr desde la raiz del repo: python -m pytest backend/tests"""
import sys
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app.contracts import (  # noqa: E402
    AgentAnalysisSummary,
    FarmerVerdict,
    MultiAgentReport,
    RecommendResponse,
)
from app.main import app  # noqa: E402

client = TestClient(app)


def load_mock():
    return json.loads((ROOT / "data" / "mocks" / "recommend_farm_1.json").read_text())


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
    current = next(rotation for rotation in data["rotations"] if rotation["is_current"])
    assert current["sequence"] == []
    assert current["scores"]["total"] == 0
    assert data["best_rotation_id"] != current["id"]


def test_current_crops_update_sample_baseline_without_claiming_a_score():
    response = client.post(
        "/recommend",
        json={"farm_id": "farm_1", "priority": "Balanced", "current_crops": ["cotton"]},
    )
    assert response.status_code == 200
    current = next(rotation for rotation in response.json()["rotations"] if rotation["is_current"])
    assert current["sequence"] == ["cotton"]
    assert current["scores"]["total"] == 0
    assert "does not score them" in current["why"]


def test_priority_changes_totals():
    a = client.post("/recommend", json={"farm_id": "farm_1", "priority": "Profit"}).json()
    b = client.post("/recommend", json={"farm_id": "farm_1", "priority": "Soil Health"}).json()
    assert a["priority"] == "Profit" and b["priority"] == "Soil Health"
    assert [x["scores"]["total"] for x in a["rotations"]] != [x["scores"]["total"] for x in b["rotations"]]


def test_recommend_with_point():
    agent_report = MultiAgentReport(
        climate=AgentAnalysisSummary(status="complete", score=80, recommendation="Sorghum"),
        soil=AgentAnalysisSummary(status="complete", score=75, recommendation="Sorghum → Soybean"),
        market=AgentAnalysisSummary(status="complete", score=65, recommendation="Cotton"),
        discussion={},
        verdict=FarmerVerdict(
            best_crop_to_grow="Sorghum",
            best_crop_to_sell="Cotton",
            recommended_rotation="Sorghum → Soybean",
            reasoning="Sorghum fits the climate results. Check local soil conditions before planting.",
            confidence="medium",
            things_to_consider=["Confirm local soil conditions."],
            gaps=[],
            judge_used=True,
        ),
    )
    with patch(
        "app.main.recommend_for_location",
        return_value=RecommendResponse(**load_mock()),
    ) as recommend_location:
        with patch("app.main.run_pipeline", new_callable=AsyncMock, return_value=agent_report):
            r = client.post(
                "/recommend",
                json={
                    "lat": 33.5,
                    "lon": -101.8,
                    "priority": "Balanced",
                    "current_crops": ["cotton"],
                },
            )
    assert r.status_code == 200
    recommend_location.assert_called_once()
    assert recommend_location.call_args.args == (
        33.5,
        -101.8,
        "Balanced",
        ["cotton"],
    )
    assert r.json()["agent_report"]["verdict"]["best_crop_to_grow"] == "Sorghum"
    assert r.json()["agent_report"]["verdict"]["things_to_consider"] == [
        "Confirm local soil conditions."
    ]


def test_location_data_failure_returns_service_unavailable():
    with patch("app.main.recommend_for_location", side_effect=ValueError("NASA is unavailable")):
        r = client.post("/recommend", json={"lat": 33.5, "lon": -101.8, "priority": "Balanced"})
    assert r.status_code == 503
    assert "Location-based climate data" in r.json()["detail"]


def test_unknown_farm_is_404():
    r = client.post("/recommend", json={"farm_id": "farm_99", "priority": "Balanced"})
    assert r.status_code == 404


def test_missing_farm_and_point_is_422():
    r = client.post("/recommend", json={"priority": "Balanced"})
    assert r.status_code == 422

def test_market_default_returns_all_crops_with_data():
    r = client.get("/market")
    assert r.status_code == 200
    body = r.json()
    assert set(body["crops"]) == {
        "corn", "cotton", "sorghum", "soybean", "wheat", "peanut", "oats_cover"
    }
    assert all(c["revenue_per_acre"] > 0 for c in body["crops"].values())
