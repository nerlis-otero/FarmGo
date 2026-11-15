"""
FarmFuture AI: contratos de datos (fuente de verdad en código).

Reglas:
- Todos los módulos reciben y devuelven EXACTAMENTE estos modelos.
- Si necesitas cambiar un campo, avisa al integrante 1 y actualiza este archivo,
  frontend/src/types/contracts.ts y docs/contracts.md en el mismo PR.
- Los datos que falten NO se inventan: se dejan en None y se anotan en `gaps`.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional, Protocol

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Identificadores fijos
# ---------------------------------------------------------------------------
class CropId(str, Enum):
    corn = "corn"
    cotton = "cotton"
    sorghum = "sorghum"
    soybean = "soybean"
    wheat = "wheat"
    peanut = "peanut"
    oats_cover = "oats_cover"
    forage_grass = "forage_grass"


class Priority(str, Enum):
    profit = "Profit"
    water_saving = "Water Saving"
    soil_health = "Soil Health"
    balanced = "Balanced"


# Pesos por prioridad (propuesta inicial; ajustar en la reunión de arranque).
# Cada fila debe sumar 1.0.
PRIORITY_WEIGHTS: dict[Priority, dict[str, float]] = {
    Priority.profit:       {"climate": 0.25, "soil": 0.15, "market": 0.60},
    Priority.water_saving: {"climate": 0.55, "soil": 0.30, "market": 0.15},
    Priority.soil_health:  {"climate": 0.20, "soil": 0.60, "market": 0.20},
    Priority.balanced:     {"climate": 0.35, "soil": 0.35, "market": 0.30},
}


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------
class Farm(BaseModel):
    farm_id: str                       # farm_1, farm_2, farm_3 (o "custom")
    lat: float
    lon: float
    county_fips: str = Field(min_length=5, max_length=5)  # llave del clima


class RecommendRequest(BaseModel):
    """POST /recommend. Se envía farm_id O (lat y lon)."""
    farm_id: Optional[str] = None
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lon: Optional[float] = Field(default=None, ge=-180, le=180)
    priority: Priority
    current_crops: list[CropId] = Field(default_factory=list)

    @model_validator(mode="after")
    def _farm_or_point(self):
        if not self.farm_id and (self.lat is None or self.lon is None):
            raise ValueError("Envía farm_id o lat y lon")
        if (self.lat is None) != (self.lon is None):
            raise ValueError("Envía lat y lon juntos")
        return self


# ---------------------------------------------------------------------------
# Salidas de los módulos de datos
# ---------------------------------------------------------------------------
class ClimateMetrics(BaseModel):
    """Módulo del integrante 2. Fuentes: NASA POWER + NDVI de MODIS."""
    county_fips: str
    period_start_year: int
    period_end_year: int
    seasonal_rain_mm: dict[Literal["winter", "spring", "summer", "fall"], float]
    mean_temp_c_by_month: list[float] = Field(min_length=12, max_length=12)
    dry_months: int = Field(ge=0, le=12)
    # Humedad del suelo de POWER: MODELADA, no observada por satélite.
    soil_moisture_modeled_by_month: Optional[list[float]] = Field(default=None, min_length=12, max_length=12)
    ndvi_monthly: Optional[list[Optional[float]]] = Field(default=None, min_length=12, max_length=12)
    bare_field_months: list[int] = Field(default_factory=list)  # meses 1-12 con NDVI bajo
    gaps: list[str] = Field(default_factory=list)


class SoilMetrics(BaseModel):
    """Fuente: SSURGO (Soil Data Access)."""
    texture: Optional[str] = None
    drainage_class: Optional[str] = None
    organic_matter_pct: Optional[float] = None
    slope_pct: Optional[float] = None
    erodibility_k: Optional[float] = None


class CropHistoryItem(BaseModel):
    year: int
    crop_id: Optional[CropId] = None   # None si el cultivo no está en nuestra lista
    cdl_name: str                      # nombre original de CropScape


class SoilRotationMetrics(BaseModel):
    """Módulo del integrante 3. Fuentes: SSURGO + CropScape."""
    soil: SoilMetrics
    crop_history: list[CropHistoryItem] = Field(default_factory=list)
    current_rotation: Optional[list[CropId]] = None  # deducida del historial
    gaps: list[str] = Field(default_factory=list)


class CropMarket(BaseModel):
    price: Optional[float] = None
    price_unit: Optional[str] = None          # ej. "USD/bushel"
    typical_yield: Optional[float] = None
    yield_unit: Optional[str] = None          # ej. "bushels/acre"
    price_trend: Optional[Literal["up", "flat", "down"]] = None


class MarketMetrics(BaseModel):
    """Módulo del integrante 4. Fuente: USDA NASS QuickStats."""
    crops: dict[CropId, CropMarket]
    gaps: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Motor de puntuación (código, integrante 3) y modelo de lenguaje (integrante 1)
# ---------------------------------------------------------------------------
class DimensionScores(BaseModel):
    climate: float = Field(ge=0, le=100)
    soil: float = Field(ge=0, le=100)
    market: float = Field(ge=0, le=100)
    total: float = Field(ge=0, le=100)  # suma ponderada según PRIORITY_WEIGHTS


class ScoredRotation(BaseModel):
    """Salida del motor de puntuación. El modelo de lenguaje NO calcula esto."""
    id: str                            # "current", "rot_01", "rot_02"...
    label: str
    sequence: list[CropId] = Field(min_length=1)  # 3 temporadas
    is_current: bool
    scores: DimensionScores
    rules_applied: list[str] = Field(default_factory=list)  # ej. "legume_after_cereal"
    facts: list[str] = Field(default_factory=list)          # hechos con cifras, citables


class LLMRotationExplanation(BaseModel):
    """Lo único que devuelve el modelo de lenguaje, por rotación."""
    rotation_id: str
    why: str
    evidence: list[str]
    benefits: list[str]
    gaps: list[str]
    risks: list[str]


class LLMOutput(BaseModel):
    explanations: list[LLMRotationExplanation]


# ---------------------------------------------------------------------------
# Salida final de POST /recommend
# ---------------------------------------------------------------------------
class RotationResult(BaseModel):
    id: str
    label: str
    sequence: list[CropId]
    is_current: bool
    scores: DimensionScores
    why: str
    evidence: list[str]
    benefits: list[str]
    gaps: list[str]
    risks: list[str]


class RecommendResponse(BaseModel):
    farm_id: str
    priority: Priority
    best_rotation_id: str
    rotations: list[RotationResult] = Field(min_length=3, max_length=3)
    data_notes: list[str] = Field(default_factory=list)  # ej. "Humedad del suelo modelada"
    disclaimer: str


# ---------------------------------------------------------------------------
# Firmas de funciones (cada módulo implementa la suya)
# ---------------------------------------------------------------------------
class ClimateModule(Protocol):          # integrante 2
    def get_climate_metrics(self, lat: float, lon: float, county_fips: str) -> ClimateMetrics: ...


class SoilRotationModule(Protocol):     # integrante 3
    def get_soil_rotation_metrics(self, lat: float, lon: float) -> SoilRotationMetrics: ...


class MarketModule(Protocol):           # integrante 4
    def get_market_metrics(self, crop_ids: list[CropId]) -> MarketMetrics: ...


class ScoringEngine(Protocol):          # integrante 3
    def score_rotations(
        self,
        priority: Priority,
        climate: ClimateMetrics,
        soil: SoilRotationMetrics,
        market: MarketMetrics,
    ) -> list[ScoredRotation]: ...      # siempre 3: la actual + 2 sugeridas


class Explainer(Protocol):              # integrante 1
    def explain_rotations(
        self, priority: Priority, rotations: list[ScoredRotation]
    ) -> LLMOutput: ...
