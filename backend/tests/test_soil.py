import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import CropId, SoilRotationMetrics
from app.services.soil_service import get_soil_rotation_metrics


def test_get_soil_rotation_metrics_farm_1():
    # Coordenadas de farm_1 (Lubbock)
    metrics = get_soil_rotation_metrics(33.5779, -101.8552)

    assert isinstance(metrics, SoilRotationMetrics)
    assert metrics.soil.texture is not None
    assert metrics.soil.drainage_class is not None
    assert metrics.soil.organic_matter_pct is not None
    assert metrics.soil.erodibility_k is not None

    # Debe deducir una rotación actual de 3 cultivos válidos
    assert metrics.current_rotation is not None
    assert len(metrics.current_rotation) == 3
    for crop in metrics.current_rotation:
        assert isinstance(crop, CropId)


def test_get_soil_rotation_metrics_custom_point():
    # Coordenadas arbitrarias dentro de Texas
    metrics = get_soil_rotation_metrics(30.2672, -97.7431)

    assert isinstance(metrics, SoilRotationMetrics)
    assert metrics.soil.texture is not None
    assert len(metrics.current_rotation) == 3
