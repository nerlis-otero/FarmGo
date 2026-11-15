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


async def run_pipeline(
    lat: float, lon: float, priority: str, current_crops: list[str] | None = None
) -> MultiAgentReport:
    # Round coordinates to protect the farmer's location privacy.
    lat, lon = round(lat, 2), round(lon, 2)
    priority_key = _priority_key(priority)
    current_crops = current_crops or []

    results = await asyncio.gather(
        asyncio.to_thread(climate_agent.run, lat, lon, priority_key),
        asyncio.to_thread(soil_agent.run, lat, lon, priority_key, current_crops),
        asyncio.to_thread(market_agent.run, lat, lon, priority_key),
        return_exceptions=True,
    )
    names = ("climate", "soil", "market")
    analyses: dict[str, dict] = {}
    for name, result in zip(names, results):
        if isinstance(result, asyncio.CancelledError):
            raise result
        if isinstance(result, Exception):
            logger.error("%s agent failed: %s", name, result)
            analyses[name] = {"error": f"{name} agent failed"}
        else:
            analyses[name] = result

    discussion_results = await discuss(analyses, priority_key)
    try:
        verdict_result = await asyncio.to_thread(
            judge, analyses, discussion_results, priority_key
        )
        verdict = FarmerVerdict(
            best_crop_to_grow=verdict_result.get("bestCropToGrow"),
            best_crop_to_sell=verdict_result.get("bestCropToSell"),
            recommended_rotation=verdict_result.get("recommendedRotation"),
            best_overall_crop=verdict_result.get("bestOverallCrop"),
            reasoning=verdict_result["reasoning"],
            confidence=verdict_result["confidence"],
            things_to_consider=_strings(verdict_result.get("thingsToConsider")),
            gaps=_strings(verdict_result.get("gaps")),
            judge_used=True,
        )
    except Exception as error:
        logger.error("Final agent verdict failed: %s", error)
        verdict = _fallback_verdict(analyses)

    discussions = {
        name: AgentDiscussionSummary(
            agreements=_strings(result.get("agrees_with")),
            disagreements=_strings(result.get("disagreements")),
            position=result.get("final_position") if isinstance(result.get("final_position"), str) else None,
            error=(
                f"The {name} agent could not review the other analyses."
                if "error" in result
                else None
            ),
        )
        for name, result in discussion_results.items()
    }

    return MultiAgentReport(
        climate=_analysis_summary("climate", analyses["climate"]),
        soil=_analysis_summary("soil", analyses["soil"]),
        market=_analysis_summary("market", analyses["market"]),
        discussion=discussions,
        verdict=verdict,
    )

