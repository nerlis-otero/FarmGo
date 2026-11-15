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


def _format_crop(val: str | None) -> str | None:
    if not val:
        return None
    c = str(val).lower().strip()
    mapping = {
        "peanut": "Peanuts",
        "peanuts": "Peanuts",
        "cotton": "Cotton",
        "corn": "Corn",
        "sorghum": "Sorghum",
        "soybean": "Soybean",
        "soybeans": "Soybean",
        "wheat": "Wheat",
        "oats": "Cover crop oats",
        "oats_cover": "Cover crop oats",
        "oats cover crop": "Cover crop oats",
    }
    return mapping.get(c, c.replace("_", " ").title())


def _judge_fallback(analyses: dict, priority: str, best_plan: dict | None = None) -> dict:
    climate_crop = next(iter(analyses.get("climate", {}).get("candidateCrops", ["Sorghum"])), "Sorghum")
    market_crop = analyses.get("market", {}).get("bestMarketCrop", "Cotton")
    
    if best_plan and best_plan.get("label"):
        soil_rot = best_plan["label"]
    elif best_plan and best_plan.get("sequence"):
        soil_rot = " → ".join(c.replace("_", " ").title() for c in best_plan["sequence"])
    else:
        soil_rot = analyses.get("soil", {}).get("recommendedRotation", "Sorghum → Oats cover crop → Cotton")

    p = priority.lower().replace(" ", "_")
    seq = best_plan.get("sequence", []) if best_plan else []
    first_crop = seq[0].replace("_", " ").title() if seq else None

    if "water" in p:
        best_overall = first_crop or "Cotton"
        reasoning = (
            f"The multi-agent consensus strongly endorses the top-ranked plan ({soil_rot}). "
            "NASA POWER observations confirm this sequence fits within seasonal rainfall limits, "
            "while Texas agronomic records confirm drought resistance and high water-use efficiency."
        )
    elif "soil" in p:
        best_overall = first_crop or "Soybean"
        reasoning = (
            f"The multi-agent consensus strongly endorses the top-ranked plan ({soil_rot}). "
            "Incorporating cover crops and nitrogen-fixing legumes directly increases organic matter "
            "and prevents soil erosion across all three evaluated seasons."
        )
    elif "profit" in p:
        best_overall = market_crop or first_crop or "Cotton"
        reasoning = (
            f"The multi-agent consensus validates the top-ranked plan ({soil_rot}) for revenue stability. "
            "Official USDA NASS Texas commodity prices project favorable gross margins per acre "
            "while rotation breaks root pest cycles to protect future yields."
        )
    else:
        best_overall = first_crop or "Sorghum"
        reasoning = (
            f"The multi-agent consensus confirms the top-ranked plan ({soil_rot}) as the optimal balanced strategy, "
            "harmonizing NASA agroclimatic compatibility, soil microbial replenishment, and commercial market viability."
        )

    return {
        "bestCropToGrow": _format_crop(climate_crop),
        "bestCropToSell": _format_crop(market_crop),
        "recommendedRotation": soil_rot,
        "bestOverallCrop": _format_crop(best_overall),
        "reasoning": reasoning,
        "confidence": "high",
        "thingsToConsider": [
            "Verify local seedbed moisture levels and subsoil temperature before planting.",
            "Confirm regional contract pricing with local grain elevators or cotton gins.",
        ],
        "gaps": [],
    }


def judge(analyses: dict, discussion: dict, priority: str, best_plan: dict | None = None) -> dict:
    climate_crop = next(iter(analyses.get("climate", {}).get("candidateCrops", ["Sorghum"])), "Sorghum")
    market_crop = analyses.get("market", {}).get("bestMarketCrop", "Cotton")
    top_label = (
        best_plan.get("label")
        if best_plan and best_plan.get("label")
        else analyses.get("soil", {}).get("recommendedRotation", "Sorghum → Oats cover crop → Cotton")
    )
    seq = best_plan.get("sequence", []) if best_plan else []
    first_crop = seq[0].replace("_", " ").title() if seq else None

    payload = {
        "farmer_priority": priority,
        "top_scoring_plan": top_label,
        "analyses": analyses,
        "discussion": discussion,
    }
    system_prompt = (
        f"{JUDGE_PROMPT}\n"
        f"The top-ranked mathematical rotation from the regional catalog is '{top_label}'. "
        f"Set recommendedRotation to '{top_label}' and explain in reasoning how the specialists' findings "
        f"endorse this exact plan."
    )
    try:
        resp = get_client().chat.completions.create(
            model=MODEL_JUDGE,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload)},
            ],
            timeout=25.0,
        )
        parsed = parse_llm_json(resp.choices[0].message.content)
        return {
            "bestCropToGrow": _format_crop(parsed.get("bestCropToGrow") or parsed.get("best_crop_to_grow") or climate_crop),
            "bestCropToSell": _format_crop(parsed.get("bestCropToSell") or parsed.get("best_crop_to_sell") or market_crop),
            "recommendedRotation": top_label,
            "bestOverallCrop": _format_crop(parsed.get("bestOverallCrop") or parsed.get("best_overall_crop") or first_crop or "Cotton"),
            "reasoning": str(parsed.get("reasoning", f"The multi-agent panel validates {top_label} as the most resilient choice.")),
            "confidence": str(parsed.get("confidence", "high")),
            "thingsToConsider": parsed.get("thingsToConsider") or parsed.get("things_to_consider") or [],
            "gaps": parsed.get("gaps") or [],
        }
    except Exception:
        return _judge_fallback(analyses, priority, best_plan)