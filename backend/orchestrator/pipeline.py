"""Only module that knows all the agents."""
import asyncio

from agents.climate import agent as climate_agent
from agents.market import agent as market_agent
from agents.soil import agent as soil_agent
from orchestrator.discussion import discuss
from orchestrator.judge import judge


async def run_pipeline(lat: float, lon: float, priority: str) -> dict:
    # Se redondea la ubicación: no hace falta más precisión y protege la privacidad del granjero
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