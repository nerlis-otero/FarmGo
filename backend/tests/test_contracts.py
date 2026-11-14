"""Verifica que los mocks cumplen el contrato. Correr: pytest backend/tests"""
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend" / "app"))

from contracts import PRIORITY_WEIGHTS, RecommendRequest, RecommendResponse  # noqa: E402


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def test_weights_sum_to_one():
    for priority, w in PRIORITY_WEIGHTS.items():
        assert abs(sum(w.values()) - 1.0) < 1e-9, priority


def test_mock_response_is_valid():
    resp = RecommendResponse(**load("data/mocks/recommend_farm_1.json"))
    assert len(resp.rotations) == 3
    assert sum(r.is_current for r in resp.rotations) == 1
    assert resp.best_rotation_id in {r.id for r in resp.rotations}


def test_mock_totals_match_weights():
    resp = RecommendResponse(**load("data/mocks/recommend_farm_1.json"))
    w = PRIORITY_WEIGHTS[resp.priority]
    for r in resp.rotations:
        expected = r.scores.climate * w["climate"] + r.scores.soil * w["soil"] + r.scores.market * w["market"]
        assert abs(r.scores.total - expected) <= 0.15, r.id


def test_mock_request_is_valid():
    RecommendRequest(**load("data/mocks/recommend_request.json"))


def test_request_needs_farm_or_point():
    with pytest.raises(ValueError):
        RecommendRequest(priority="Balanced")
