from pathlib import Path
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import CropId, Priority  # noqa: E402
from app.location_analysis import recommend_for_location  # noqa: E402


def weather(precipitation: float) -> dict:
    return {
        "period": "20230101-20251231",
        "monthly_means": {
            "T2M": {f"{month:02}": 22.0 for month in range(1, 13)},
            "PRECTOTCORR": {f"{month:02}": precipitation for month in range(1, 13)},
        },
    }


def test_marked_coordinates_change_climate_scores_and_are_reported():
    with patch("app.location_analysis.get_nasa_power", return_value=weather(0.1)) as nasa:
        dry = recommend_for_location(33.5, -101.8, Priority.water_saving, [CropId.cotton])
    nasa.assert_called_once_with(33.5, -101.8)

    with patch("app.location_analysis.get_nasa_power", return_value=weather(3.0)):
        wet = recommend_for_location(31.5, -97.1, Priority.water_saving, [CropId.cotton])

    assert dry.farm_id == wet.farm_id == "custom"
    assert dry.rotations[0].sequence == [CropId.cotton]
    assert dry.rotations[1].scores.climate != wet.rotations[1].scores.climate
    assert any("33.5000, -101.8000" in note for note in dry.data_notes)
    assert len(dry.rotations) == 3


def test_nass_numbers_with_thousands_separator_are_parsed():
    # Maní: NASS publica "2,490" LB/ACRE; antes se descartaba y el puntaje usaba solo el precio.
    from app.location_analysis import _market_crop_score, _number  # noqa: E402

    assert _number("2,490") == 2490.0
    assert _number(" (D)") is None  # dato no publicado
    score, trend = _market_crop_score(CropId.peanut)
    assert 0 <= score <= 100 and trend in {"rising", "falling", "fairly steady"}
    assert score != 65.8  # 65.8 = puntaje con solo el precio (rendimiento ignorado)
