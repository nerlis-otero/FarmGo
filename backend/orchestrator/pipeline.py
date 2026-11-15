"""Único módulo que conoce a todos los agentes."""
import asyncio

from agents.climate import agent as climate_agent
from agents.market import agent as market_agent
from agents.soil import agent as soil_agent
from orchestrator.engine import recommend
from orchestrator.discussion import discuss


async def run_pipeline(lat: float, lon: float, priority: str) -> dict:
    # Los tres agentes corren en paralelo (cada uno es síncrono, van en hilos)
    climate, soil, market = await asyncio.gather(
        asyncio.to_thread(climate_agent.run, lat, lon, priority),
        asyncio.to_thread(soil_agent.run, lat, lon, priority),
        asyncio.to_thread(market_agent.run, lat, lon, priority),
    )
    final = recommend(climate, soil, market, priority)
    try:
        discussion = await asyncio.to_thread(discuss, climate, soil, market, priority)
    except Exception:
        discussion = None  # si falla la discusión, la recomendación igual sale
    return {"climate": climate, "soil": soil, "market": market, "final": final, "discussion": discussion}

