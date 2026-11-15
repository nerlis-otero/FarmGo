"""Market Agent: real USDA NASS data adapted to farmer priority."""
from app.contracts import CropId
from app.services.market_service import get_market_metrics

# Commercial crops evaluated
CROPS = [CropId.corn, CropId.cotton, CropId.sorghum, CropId.soybean, CropId.wheat, CropId.peanut]
TREND_TEXT = {"up": "price trending upward", "flat": "stable price", "down": "price trending downward"}
TREND_ADJ = {"up": 5, "flat": 0, "down": -10}

# Suitability and restriction multipliers based on farmer goal
WATER_SAVING_MULTIPLIERS = {
    CropId.cotton: 2.2,    # High drought tolerance, excellent commercial return under dryland
    CropId.sorghum: 2.5,   # Most drought-resilient grain crop in Texas
    CropId.wheat: 1.8,     # Winter crop with low seasonal water demand
    CropId.corn: 0.5,      # High water stress risk
    CropId.peanut: 0.3,    # Intensive water requirements (elevated loss risk)
    CropId.soybean: 0.9,
}

SOIL_HEALTH_MULTIPLIERS = {
    CropId.soybean: 3.5,   # Optimal legume rotation, fixes N and creates protective residue
    CropId.sorghum: 2.2,   # Adds significant root biomass and organic matter
    CropId.wheat: 1.5,
    CropId.peanut: 0.8,    # Disturbs soil structure at digging; lower conservation rating
    CropId.cotton: 0.7,
    CropId.corn: 0.7,
}


def run(_lat: float, _lon: float, priority: str) -> dict:
    p = priority.lower().replace(" ", "_")
    m = get_market_metrics(CROPS)
    valid = {c: v for c, v in m.crops.items() if v.revenue_per_acre is not None}
    if not valid:
        return {"bestMarketCrop": None, "marketScore": 0, "reasons": ["No market data available"]}

    # Ranking weighted by farmer priority
    def _rank_score(item):
        crop, info = item
        rev = info.revenue_per_acre
        trend = TREND_ADJ.get(info.price_trend, 0)
        if "water" in p:
            multiplier = WATER_SAVING_MULTIPLIERS.get(crop, 1.0)
            return (rev * multiplier) + trend
        elif "soil" in p:
            multiplier = SOIL_HEALTH_MULTIPLIERS.get(crop, 1.0)
            return (rev * multiplier) + trend
        elif "profit" in p:
            return rev + (trend * 2)
        else:  # balanced
            return rev + trend

    best, info = max(valid.items(), key=_rank_score)

    # Calibrated score scale (600 USD/acre = ~90 pts base)
    score = round(min(100, (info.revenue_per_acre / 7.5) + 20 + TREND_ADJ.get(info.price_trend, 0)))
    score = max(0, min(100, score))

    priority_context = ""
    if "water" in p:
        priority_context = "Selected for strong return-to-water efficiency under your water-saving goal."
    elif "soil" in p:
        priority_context = "Selected for solid market value combined with biological soil health benefits."
    elif "profit" in p:
        priority_context = "Selected to maximize gross revenue per acre based on Texas harvest prices."
    else:
        priority_context = "Selected for balanced gross margin, price stability, and risk management."

    return {
        "bestMarketCrop": best.value,
        "marketScore": score,
        "reasons": [
            f"Estimated gross revenue: ${info.revenue_per_acre} USD/acre (2020-2025 avg yield at 2025 prices)",
            f"Market trend: {TREND_TEXT.get(info.price_trend, 'no trend data')}",
            priority_context,
            "Official USDA NASS Texas state-level data (gross revenue before production costs)",
        ],
    }