"""
FarmFuture AI - API minima (integrante 1).

Por ahora /recommend devuelve datos de prueba (mocks) en el formato final del contrato.
Cuando existan los modulos reales, solo se reemplaza el cuerpo de recommend().

Correr desde la carpeta backend/:
    python -m uvicorn app.main:app --reload --port 8000
"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.contracts import PRIORITY_WEIGHTS, CropId, MarketMetrics, RecommendRequest, RecommendResponse
from app.services.market_service import get_market_metrics

ROOT = Path(__file__).resolve().parents[2]  # raiz del repo
MOCK_PATH = ROOT / "data" / "mocks" / "recommend_farm_1.json"
FARMS_PATH = ROOT / "data" / "farms.json"

app = FastAPI(title="FarmFuture AI", version="0.1.0")

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


@app.post(
    "/recommend",
    responses={404: {"description": "Finca desconocida"}},
)
def recommend(req: RecommendRequest) -> RecommendResponse:
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
        rotations.append(r.model_copy(update={"scores": s.model_copy(update={"total": total})}))

    best = max(rotations, key=lambda r: r.scores.total)
    return resp.model_copy(
        update={
            "farm_id": req.farm_id or "custom",
            "priority": req.priority,
            "rotations": rotations,
            "best_rotation_id": best.id,
        }
    )

@app.get("/market", response_model=MarketMetrics)
def market(crops: str = "corn,cotton,sorghum") -> MarketMetrics:
    try:
        ids = [CropId(c.strip()) for c in crops.split(",")]
    except ValueError:
        raise HTTPException(status_code=422, detail="Cultivo desconocido")
    return get_market_metrics(ids)