"""Only module that knows all the agents."""
import asyncio
import logging

from agents.climate import agent as climate_agent
from agents.market import agent as market_agent
from agents.soil import agent as soil_agent
from app.contracts import (
    AgentAnalysisSummary,
    AgentDiscussionSummary,
    FarmerVerdict,
    MultiAgentReport,
)
from orchestrator.discussion import discuss
from orchestrator.judge import judge

logger = logging.getLogger(__name__)


def _priority_key(priority: str) -> str:
    return {
        "Profit": "profit",
        "Water Saving": "water_saving",
        "Soil Health": "soil_health",
        "Balanced": "balanced",
    }.get(priority, priority)


def _strings(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _analysis_summary(name: str, result: dict) -> AgentAnalysisSummary:
    if "error" in result:
        return AgentAnalysisSummary(
            status="unavailable",
            error=f"The {name} agent could not complete its analysis.",
        )

    score_key = {"climate": "climateScore", "soil": "soilScore", "market": "marketScore"}[name]
    recommendation_key = {
        "climate": "candidateCrops",
        "soil": "recommendedRotation",
        "market": "bestMarketCrop",
    }[name]
    raw_recommendation = result.get(recommendation_key)
    alternatives = (
        _strings(raw_recommendation)
        if isinstance(raw_recommendation, list)
        else []
    )
    recommendation = (
        ", ".join(alternatives)
        if alternatives
        else raw_recommendation.strip()
        if isinstance(raw_recommendation, str) and raw_recommendation.strip()
        else None
    )
    raw_score = result.get(score_key)
    score = raw_score if isinstance(raw_score, (int, float)) and 0 <= raw_score <= 100 else None
    return AgentAnalysisSummary(
        status="complete",
        score=score,
        recommendation=recommendation,
        alternatives=alternatives,
        reasons=_strings(result.get("reasons")),
    )


def _fallback_verdict(analyses: dict) -> FarmerVerdict:
    gaps = [
        f"The {name} agent's analysis is unavailable."
        for name, result in analyses.items()
        if "error" in result
    ]
    gaps.append("The final judge could not complete its review.")
    considerations = [
        "Treat this as a preliminary summary; confirm the plan with a local agricultural specialist."
    ]
    return FarmerVerdict(
        best_crop_to_grow=next(
            iter(_strings(analyses.get("climate", {}).get("candidateCrops"))),
            None,
        ),
        best_crop_to_sell=analyses.get("market", {}).get("bestMarketCrop"),
        recommended_rotation=analyses.get("soil", {}).get("recommendedRotation"),
        reasoning=(
            "The available specialist results are shown, but the final cross-check could not be "
            "completed. Review the cautions before choosing a crop plan."
        ),
        confidence="low",
        things_to_consider=considerations,
        gaps=gaps,
        judge_used=False,
    )


async def run_pipeline(lat: float, lon: float, priority: str) -> MultiAgentReport:
    # Round coordinates to protect the farmer's location privacy.
    lat, lon = round(lat, 2), round(lon, 2)

    # Round 1: three agents in parallel
    climate, soil, market = await asyncio.gather(
        asyncio.to_thread(climate_agent.run, lat, lon, priority),
        asyncio.to_thread(soil_agent.run, lat, lon, priority),
        asyncio.to_thread(market_agent.run, lat, lon, priority),
    )
    analyses = {"climate": climate, "soil": soil, "market": market}

    # Round 2: each agent responds to the others, in parallel
    discussion = await discuss(analyses, priority)

    # Final verdict
    verdict = await asyncio.to_thread(judge, analyses, discussion, priority)

    return {"analyses": analyses, "discussion": discussion, "verdict": verdict}
    final = recommend(climate, soil, market, priority)
    try:
        discussion = await asyncio.to_thread(discuss, climate, soil, market, priority)
    except Exception:
        discussion = None  # si falla la discusión, la recomendación igual sale
    return {"climate": climate, "soil": soil, "market": market, "final": final, "discussion": discussion}

