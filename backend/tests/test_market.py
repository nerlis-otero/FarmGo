import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import CropId  # noqa: E402
from app.services import market_service  # noqa: E402
from app.services.market_service import get_market_metrics  # noqa: E402

NEW_CROPS = [CropId.soybean, CropId.wheat, CropId.peanut, CropId.oats_cover]


def test_market_three_crops():
    m = get_market_metrics([CropId.corn, CropId.cotton, CropId.sorghum])
    assert m.crops[CropId.corn].price == 4.6
    assert m.crops[CropId.cotton].price_unit == "$ / LB"
    assert m.crops[CropId.sorghum].revenue_per_acre > 0


def test_market_new_crops_have_complete_data():
    m = get_market_metrics(NEW_CROPS)
    for crop in NEW_CROPS:
        info = m.crops[crop]
        assert info.price is not None and info.typical_yield is not None, crop
        assert info.revenue_per_acre > 0, crop
        assert info.price_trend in {"up", "flat", "down"}, crop


def test_market_new_crops_values_and_units():
    m = get_market_metrics(NEW_CROPS)
    soy, wheat, peanut, oats = (m.crops[c] for c in NEW_CROPS)

    assert (soy.price, soy.price_unit, soy.yield_unit) == (9.65, "$ / BU", "BU / ACRE")
    assert (wheat.price, wheat.typical_yield) == (4.84, 33.7)
    # Maní: precio en $/LB y rendimiento en LB/ACRE (NASS escribe "2,490" con coma)
    assert (peanut.price, peanut.price_unit, peanut.yield_unit) == (0.3, "$ / LB", "LB / ACRE")
    assert peanut.typical_yield == 2891.7
    assert peanut.revenue_per_acre == round(0.3 * 17350 / 6, 2)
    # Avena: NASS no publicó el precio 2025 -> se usa 2024
    assert oats.price == 6.21


def test_oats_gaps_explain_missing_2025_price_and_grain_vs_cover():
    gaps = get_market_metrics([CropId.oats_cover]).gaps
    assert any("oats_cover" in g and "2025" in g and "2024" in g for g in gaps)
    assert any("cobertura" in g for g in gaps)


def test_complete_crops_add_no_extra_gaps():
    base = get_market_metrics([CropId.corn]).gaps
    assert get_market_metrics([CropId.soybean, CropId.wheat, CropId.peanut]).gaps == base


def test_missing_crop_goes_to_gaps():
    # forage_grass es el único cultivo del contrato sin archivos NASS
    m = get_market_metrics([CropId.forage_grass])
    assert m.crops[CropId.forage_grass].price is None
    assert any("forage_grass" in g for g in m.gaps)


def test_csv_fallback_matches_pandas(monkeypatch):
    crops = [CropId.corn, CropId.cotton, CropId.sorghum, *NEW_CROPS]
    with_pandas = get_market_metrics(crops)
    monkeypatch.setattr(market_service, "HAS_PANDAS", False)
    assert get_market_metrics(crops) == with_pandas
