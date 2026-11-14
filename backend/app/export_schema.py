"""Genera los JSON Schema a partir de contracts.py.

Uso (desde la raíz del repo):
    python backend/app/export_schema.py
"""
import json
from pathlib import Path

from contracts import (
    ClimateMetrics, LLMOutput, MarketMetrics, RecommendRequest,
    RecommendResponse, ScoredRotation, SoilRotationMetrics,
)

OUT = Path(__file__).resolve().parents[2] / "docs" / "schemas"
OUT.mkdir(parents=True, exist_ok=True)

MODELS = {
    "recommend_request": RecommendRequest,
    "recommend_response": RecommendResponse,
    "climate_metrics": ClimateMetrics,
    "soil_rotation_metrics": SoilRotationMetrics,
    "market_metrics": MarketMetrics,
    "scored_rotation": ScoredRotation,
    "llm_output": LLMOutput,
}

for name, model in MODELS.items():
    (OUT / f"{name}.schema.json").write_text(
        json.dumps(model.model_json_schema(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("escrito", OUT / f"{name}.schema.json")
