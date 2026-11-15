import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import CropId  # noqa: E402
from app.services.market_service import get_market_metrics  # noqa: E402


def test_market_three_crops():
    m = get_market_metrics([CropId.corn, CropId.cotton, CropId.sorghum])
    assert m.crops[CropId.corn].price == 4.6
    assert m.crops[CropId.cotton].price_unit == "$ / LB"
    assert m.crops[CropId.sorghum].revenue_per_acre > 0


def test_missing_crop_goes_to_gaps():
    m = get_market_metrics([CropId.soybean])
    assert m.crops[CropId.soybean].price is None
    assert any("soybean" in g for g in m.gaps)