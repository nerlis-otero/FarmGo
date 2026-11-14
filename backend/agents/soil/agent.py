"""Soil & Rotation Agent. MOCK: reemplazar con SSURGO + CropScape."""


def run(lat: float, lon: float, priority: str) -> dict:
    return {
        "recommendedRotation": "Corn → Soybean",
        "soilScore": 89,
        "reasons": ["(mock) Fijación de nitrógeno", "(mock) Reduce el agotamiento del suelo"],
    }