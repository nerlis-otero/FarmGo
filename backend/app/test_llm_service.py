from services.llm_service import explain_recommendation

result = explain_recommendation(
    crop="Corn",
    climate_score=88,
    soil_score=81,
    market_score=77
)

print(result)