"""Market Agent. MOCK: reemplazar con NASS QuickStats + AMS Market News."""


def run(lat: float, lon: float, priority: str) -> dict:
    return {
        "bestMarketCrop": "Cotton",
        "marketScore": 87,
        "reasons": ["(mock) Tendencia de precio positiva", "(mock) Fuerte demanda regional"],
    }