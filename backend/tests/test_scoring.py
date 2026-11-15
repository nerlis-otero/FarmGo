import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import (
    ClimateMetrics,
    CropId,
    CropMarket,
    MarketMetrics,
    Priority,
    ScoredRotation,
)
from app.services.scoring_service import score_rotations
from app.services.soil_service import get_soil_rotation_metrics


def _sample_climate() -> ClimateMetrics:
    return ClimateMetrics(
        county_fips="48303",
        period_start_year=2021,
        period_end_year=2024,
        seasonal_rain_mm={"winter": 60.0, "spring": 140.0, "summer": 180.0, "fall": 90.0},
        mean_temp_c_by_month=[6.2, 8.5, 13.1, 17.8, 22.4, 26.8, 28.5, 27.9, 23.5, 17.2, 11.0, 6.8],
        dry_months=5,
    )


def _sample_market() -> MarketMetrics:
    return MarketMetrics(
        crops={
            CropId.corn: CropMarket(price=4.8, typical_yield=130.0, revenue_per_acre=624.0, price_trend="flat"),
            CropId.cotton: CropMarket(price=0.72, typical_yield=650.0, revenue_per_acre=468.0, price_trend="down"),
            CropId.sorghum: CropMarket(price=9.2, typical_yield=60.0, revenue_per_acre=309.0, price_trend="up"),
            CropId.soybean: CropMarket(price=11.5, typical_yield=35.0, revenue_per_acre=402.5, price_trend="up"),
            CropId.wheat: CropMarket(price=6.1, typical_yield=38.0, revenue_per_acre=231.8, price_trend="flat"),
            CropId.peanut: CropMarket(price=0.28, typical_yield=3200.0, revenue_per_acre=896.0, price_trend="up"),
            CropId.oats_cover: CropMarket(),
            CropId.forage_grass: CropMarket(),
        }
    )


def test_score_rotations_returns_exactly_three():
    soil = get_soil_rotation_metrics(33.5779, -101.8552)
    climate = _sample_climate()
    market = _sample_market()

    rotations = score_rotations(Priority.water_saving, climate, soil, market)

    assert len(rotations) == 3
    for r in rotations:
        assert isinstance(r, ScoredRotation)
        assert len(r.sequence) == 3
        assert 0.0 <= r.scores.total <= 100.0
        assert 0.0 <= r.scores.climate <= 100.0
        assert 0.0 <= r.scores.soil <= 100.0
        assert 0.0 <= r.scores.market <= 100.0
        assert len(r.facts) > 0

    # Primera debe ser la actual
    assert rotations[0].id == "current"
    assert rotations[0].is_current is True

    # Siguientes dos deben ser sugerencias
    assert rotations[1].id == "rot_01"
    assert rotations[1].is_current is False
    assert rotations[2].id == "rot_02"
    assert rotations[2].is_current is False


def test_priority_weights_change_ranking_and_scores():
    soil = get_soil_rotation_metrics(33.5779, -101.8552)
    climate = _sample_climate()
    market = _sample_market()

    res_water = score_rotations(Priority.water_saving, climate, soil, market)
    res_profit = score_rotations(Priority.profit, climate, soil, market)

    # Los totales calculados cambian según los pesos de la prioridad
    water_sug_total = res_water[1].scores.total
    profit_sug_total = res_profit[1].scores.total
    assert water_sug_total != profit_sug_total
