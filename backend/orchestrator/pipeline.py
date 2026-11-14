"""Único módulo que conoce a todos los agentes."""
import asyncio

from agents.climate import agent as climate_agent
from agents.market import agent as market_agent
from agents.soil import agent as soil_agent
from orchestrator.engine import recommend


async def run_pipeline(lat: float, lon: float, priority: str) -> dict:
    # Los tres agentes corren en paralelo (cada uno es síncrono, van en hilos)
    climate, soil, market = await asyncio.gather(
        asyncio.to_thread(climate_agent.run, lat, lon, priority),
        asyncio.to_thread(soil_agent.run, lat, lon, priority),
        asyncio.to_thread(market_agent.run, lat, lon, priority),
    )
    # TODO: ronda de discusión entre agentes (MODEL_JUDGE) antes del engine
    final = recommend(climate, soil, market, priority)
    return {"climate": climate, "soil": soil, "market": market, "final": final}