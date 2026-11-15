import asyncio
from pathlib import Path
import sys
from unittest.mock import AsyncMock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from orchestrator.pipeline import run_pipeline  # noqa: E402


def test_pipeline_returns_agent_analyses_discussion_and_final_verdict():
    climate = {"candidateCrops": ["Sorghum"], "climateScore": 82, "reasons": ["Dry summers"]}
    soil = {
        "recommendedRotation": "Sorghum → Soybean",
        "soilScore": 76,
        "reasons": ["Includes a legume"],
    }
    market = {"bestMarketCrop": "Cotton", "marketScore": 68, "reasons": ["Texas-wide data"]}
    discussion = {
        name: {
            "agrees_with": ["Review water needs"],
            "disagreements": [],
            "final_position": "Sorghum is a reasonable option.",
        }
        for name in ("climate", "soil", "market")
    }
    judge = {
        "bestCropToGrow": "Sorghum",
        "bestCropToSell": "Cotton",
        "recommendedRotation": "Sorghum → Soybean",
        "bestOverallCrop": "Sorghum",
        "reasoning": "Sorghum fits the climate results. Check local soil before planting.",
        "confidence": "medium",
        "thingsToConsider": ["Confirm local soil conditions."],
        "gaps": [],
    }

    with (
        patch("agents.climate.agent.run", return_value=climate),
        patch("agents.soil.agent.run", return_value=soil),
        patch("agents.market.agent.run", return_value=market),
        patch("orchestrator.pipeline.discuss", new_callable=AsyncMock, return_value=discussion),
        patch("orchestrator.pipeline.judge", return_value=judge),
    ):
        report = asyncio.run(run_pipeline(33.543, -101.843, "Water Saving"))

    assert report.climate.recommendation == "Sorghum"
    assert report.soil.score == 76
    assert report.market.recommendation == "Cotton"
    assert report.discussion["climate"].position == "Sorghum is a reasonable option."
    assert report.verdict.best_crop_to_grow == "Sorghum"
    assert report.verdict.things_to_consider == ["Confirm local soil conditions."]
    assert report.verdict.judge_used is True


def test_pipeline_marks_fallback_verdict_low_confidence():
    climate = {"candidateCrops": ["Sorghum"], "climateScore": 82, "reasons": []}
    soil = {"recommendedRotation": "Sorghum → Soybean", "soilScore": 76, "reasons": []}
    market = {"bestMarketCrop": "Cotton", "marketScore": 68, "reasons": []}

    with (
        patch("agents.climate.agent.run", return_value=climate),
        patch("agents.soil.agent.run", return_value=soil),
        patch("agents.market.agent.run", return_value=market),
        patch("orchestrator.pipeline.discuss", new_callable=AsyncMock, return_value={}),
        patch("orchestrator.pipeline.judge", side_effect=RuntimeError("judge unavailable")),
    ):
        report = asyncio.run(run_pipeline(33.5, -101.8, "Balanced"))

    assert report.verdict.judge_used is False
    assert report.verdict.confidence == "low"
    assert "The final judge could not complete its review." in report.verdict.gaps
