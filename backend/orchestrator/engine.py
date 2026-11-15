"""Recommendation Engine: no consulta datos, solo combina las salidas de los agentes."""

WEIGHTS = {
    "profit":       {"climate": 0.2, "soil": 0.2, "market": 0.6},
    "water_saving": {"climate": 0.6, "soil": 0.2, "market": 0.2},
    "soil_health":  {"climate": 0.2, "soil": 0.6, "market": 0.2},
    "balanced":     {"climate": 1 / 3, "soil": 1 / 3, "market": 1 / 3},
}


def recommend(climate: dict, soil: dict, market: dict, priority: str) -> dict:
    w = WEIGHTS.get(priority, WEIGHTS["balanced"])
    overall = (
        w["climate"] * climate["climateScore"]
        + w["soil"] * soil["soilScore"]
        + w["market"] * market["marketScore"]
    )
    return {
        "priority": priority,
        "overallScore": round(overall, 1),
        "bestCropToGrow": (climate["candidateCrops"] or [None])[0],
        "bestCropToSell": market["bestMarketCrop"],
        "recommendedRotation": soil["recommendedRotation"],
    }