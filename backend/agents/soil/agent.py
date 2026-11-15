"""Soil & Rotation Agent: alimentado por SSURGO + CropScape (Integrante 3)."""
from app.services.soil_service import get_soil_rotation_metrics


def run(lat: float, lon: float, priority: str) -> dict:
    metrics = get_soil_rotation_metrics(lat, lon)
    soil = metrics.soil

    reasons = [
        f"Textura del suelo: {soil.texture or 'Franco'} con {soil.organic_matter_pct or 1.5}% de materia orgánica.",
        f"Drenaje clasificado como: {soil.drainage_class or 'Bien drenado'}.",
    ]
    if soil.erodibility_k and soil.erodibility_k >= 0.28:
        reasons.append(f"Factor de erodabilidad K={soil.erodibility_k}: requiere cobertura activa contra erosión.")

    crops = [c.value.replace('_', ' ').title() for c in (metrics.current_rotation or [])]
    rec_rotation = " → ".join(crops) if crops else "Sorghum → Soybean → Oats Cover"

    return {
        "recommendedRotation": rec_rotation,
        "soilScore": 85 if (soil.organic_matter_pct or 1.0) >= 1.5 else 72,
        "reasons": reasons,
    }
