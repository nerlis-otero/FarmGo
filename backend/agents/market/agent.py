"""Market Agent: datos NASS reales. Los números los calcula el código, no el modelo."""
from app.contracts import CropId
from app.services.market_service import get_market_metrics

# oats_cover queda fuera: es cultivo de cobertura, su precio de grano no define "qué vender".
CROPS = [CropId.corn, CropId.cotton, CropId.sorghum, CropId.soybean, CropId.wheat, CropId.peanut]
TREND_TEXT = {"up": "precio al alza", "flat": "precio estable", "down": "precio a la baja"}
TREND_ADJ = {"up": 5, "flat": 0, "down": -10}


def run(_lat: float, _lon: float, _priority: str) -> dict:
    # El mercado es por estado (Texas), por eso lat/lon/priority no cambian el resultado.
    m = get_market_metrics(CROPS)
    valid = {c: v for c, v in m.crops.items() if v.revenue_per_acre is not None}
    if not valid:
        return {"bestMarketCrop": None, "marketScore": 0, "reasons": ["Sin datos de mercado"]}

    best, info = max(valid.items(), key=lambda kv: kv[1].revenue_per_acre)
    # Regla provisional: 600 USD/acre = 100 puntos, ajustada por tendencia. Acordar con la integrante 3.
    score = round(info.revenue_per_acre / 6 + TREND_ADJ.get(info.price_trend, 0))
    score = max(0, min(100, score))

    return {
        "bestMarketCrop": best.value,
        "marketScore": score,
        "reasons": [
            f"Ingreso bruto estimado: {info.revenue_per_acre} USD/acre (rendimiento promedio 2020-2025 por precio 2025)",
            f"Tendencia: {TREND_TEXT.get(info.price_trend, 'sin dato')}",
            "Datos de todo Texas, no de tu condado; no incluyen costos de producción",
        ],
    }