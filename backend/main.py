from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator.pipeline import run_pipeline

app = FastAPI(title="Cambio de campo - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend en desarrollo
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendRequest(BaseModel):
    lat: float
    lon: float
    priority: Literal["profit", "water_saving", "soil_health", "balanced"] = "balanced"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recommend")
async def recommend_endpoint(req: RecommendRequest):
    try:
        return await run_pipeline(req.lat, req.lon, req.priority)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))