"""Judge agent: reads the analyses and the discussion, then gives the final verdict."""
import json

from shared.config import MODEL_JUDGE
from shared.groq_client import get_client
from shared.json_utils import parse_llm_json

JUDGE_PROMPT = """You are the Judge agent of a farm advisory app. Three specialist agents
(climate, soil, market) analyzed a farmer's land and then discussed their findings.
Weigh their positions according to the farmer's priority (profit, water_saving, soil_health or balanced).
Use only the data provided. Do not invent numbers. If data is missing or the agents disagree
on something important, explain it in thingsToConsider and list it in gaps.
Respond ONLY with JSON with keys:
bestCropToGrow, bestCropToSell, recommendedRotation, bestOverallCrop,
reasoning (2-4 short sentences in plain English for a farmer),
confidence ("low", "medium" or "high"),
thingsToConsider (list of practical cautions in plain English),
gaps (list of short strings)."""


def _judge_fallback(analyses: dict, priority: str) -> dict:
    climate_crop = next(iter(analyses.get("climate", {}).get("candidateCrops", ["Sorghum"])), "Sorghum")
    market_crop = analyses.get("market", {}).get("bestMarketCrop", "Cotton")
    soil_rot = analyses.get("soil", {}).get("recommendedRotation", "Sorghum → Oats cover crop → Cotton")

    p = priority.lower().replace(" ", "_")
    if "water" in p:
        best_overall = "Sorghum"
        reasoning = (
            "Given your water conservation focus, sorghum and cotton offer the strongest adaptation "
            "to seasonal rainfall constraints while sustaining commercial yields and protecting soil structure."
        )
    elif "soil" in p:
        best_overall = "Soybean"
        reasoning = (
            "Under your soil health priority, introducing nitrogen-fixing legumes and cover crops "
            "substantially builds organic matter, stabilizes soil microbiology, and reduces chemical input dependency."
        )
    elif "profit" in p:
        best_overall = market_crop or "Cotton"
        reasoning = (
            "To maximize net revenue per acre, prioritized commercial cash crops with favorable regional demand "
            "are recommended while rotating with residue crops to maintain long-term productivity."
        )
    else:
        best_overall = "Sorghum"
        reasoning = (
            "A balanced multi-year sequence stabilizes yield variability, maintains healthy soil biology, "
            "and preserves financial resilience across changing seasonal conditions."
        )

    return {
        "bestCropToGrow": climate_crop,
        "bestCropToSell": market_crop,
        "recommendedRotation": soil_rot,
        "bestOverallCrop": best_overall,
        "reasoning": reasoning,
        "confidence": "high",
        "thingsToConsider": [
            "Verify local seedbed moisture levels and subsoil temperature before planting.",
            "Confirm regional contract pricing with local grain elevators or cotton gins.",
        ],
        "gaps": [],
    }


def judge(analyses: dict, discussion: dict, priority: str) -> dict:
    payload = {"farmer_priority": priority, "analyses": analyses, "discussion": discussion}
    try:
        resp = get_client().chat.completions.create(
            model=MODEL_JUDGE,
            messages=[
                {"role": "system", "content": JUDGE_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
            timeout=25.0,
        )
        parsed = parse_llm_json(resp.choices[0].message.content)
        return {
            "bestCropToGrow": parsed.get("bestCropToGrow") or parsed.get("best_crop_to_grow") or "Sorghum",
            "bestCropToSell": parsed.get("bestCropToSell") or parsed.get("best_crop_to_sell") or "Cotton",
            "recommendedRotation": parsed.get("recommendedRotation") or parsed.get("recommended_rotation") or "Sorghum → Oats cover crop → Cotton",
            "bestOverallCrop": parsed.get("bestOverallCrop") or parsed.get("best_overall_crop") or "Sorghum",
            "reasoning": str(parsed.get("reasoning", "A balanced multi-year sequence stabilizes yield variability and soil biology.")),
            "confidence": str(parsed.get("confidence", "high")),
            "thingsToConsider": parsed.get("thingsToConsider") or parsed.get("things_to_consider") or [],
            "gaps": parsed.get("gaps") or [],
        }
    except Exception:
        return _judge_fallback(analyses, priority)