"""
FarmFuture AI - API minima (integrante 1).

Las ubicaciones marcadas usan clima de NASA POWER y los datos de cultivo del repositorio.
Las fincas de ejemplo mantienen el mock contractual.

Correr desde la carpeta backend/:
    python -m uvicorn app.main:app --reload --port 8000
"""
import json
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests

from app.contracts import PRIORITY_WEIGHTS, RecommendRequest, RecommendResponse
from app.location_analysis import recommend_for_location

ROOT = Path(__file__).resolve().parents[2]  # raiz del repo
MOCK_PATH = ROOT / "data" / "mocks" / "recommend_farm_1.json"
FARMS_PATH = ROOT / "data" / "farms.json"

app = FastAPI(title="FarmFuture AI", version="0.1.0")
logger = logging.getLogger(__name__)

# Permite que el frontend (Next.js en el puerto 3000) llame al API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_farms() -> list[dict]:
    return json.loads(FARMS_PATH.read_text(encoding="utf-8"))["farms"]


def load_mock() -> RecommendResponse:
    return RecommendResponse(**json.loads(MOCK_PATH.read_text(encoding="utf-8")))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/farms")
def farms() -> list[dict]:
    """Fincas de ejemplo (para los botones del frontend)."""
    return load_farms()


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest) -> RecommendResponse:
    if req.lat is not None and req.lon is not None:
        try:
            return recommend_for_location(
                req.lat,
                req.lon,
                req.priority,
                req.current_crops,
            )
        except (requests.RequestException, OSError, ValueError) as error:
            logger.warning(
                "Could not build a recommendation for coordinates %.4f, %.4f: %s",
                req.lat,
                req.lon,
                error,
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    "Location-based climate data is temporarily unavailable. "
                    "Try again later or use the saved demo results."
                ),
            ) from error

    if req.farm_id and req.farm_id not in {f["farm_id"] for f in load_farms()}:
        raise HTTPException(status_code=404, detail=f"Finca desconocida: {req.farm_id}")

    resp = load_mock()

    # Recalcula el total segun la prioridad pedida, para que el selector del frontend
    # cambie los resultados aunque los datos sean de prueba.
    w = PRIORITY_WEIGHTS[req.priority]
    rotations = []
    for r in resp.rotations:
        s = r.scores
        total = round(s.climate * w["climate"] + s.soil * w["soil"] + s.market * w["market"], 1)
        if r.is_current:
            baseline_matches = r.sequence == req.current_crops
            baseline_scores = (
                s.model_copy(update={"total": total})
                if baseline_matches
                else s.model_copy(update={"climate": 0, "soil": 0, "market": 0, "total": 0})
            )
            rotations.append(
                r.model_copy(
                    update={
                        "sequence": req.current_crops,
                        "label": "Your current crops" if req.current_crops else "No crops planted yet",
                        "why": (
                            "This is the saved sample baseline for the crops you selected."
                            if baseline_matches
                            else "Your selected crops are shown as the current baseline; this sample does not score them."
                        ),
                        "gaps": (
                            r.gaps
                            if baseline_matches
                            else [*r.gaps, "The selected-crop baseline is not scored by the saved sample data."]
                        ),
                        "scores": baseline_scores,
                    }
                )
            )
        else:
            rotations.append(r.model_copy(update={"scores": s.model_copy(update={"total": total})}))

    best = max((r for r in rotations if not r.is_current), key=lambda r: r.scores.total)
    return resp.model_copy(
        update={
            "farm_id": req.farm_id or "custom",
            "priority": req.priority,
            "rotations": rotations,
            "best_rotation_id": best.id,
        }
    )