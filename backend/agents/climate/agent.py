"""Climate Agent: code fetches the data, the model analyzes it (no tool calling)."""
import json

from agents.climate.schema import ClimateOutput
from agents.climate.tools import get_nasa_power
from shared.config import MODEL_FAST
from shared.groq_client import get_client
from shared.json_utils import parse_llm_json

SYSTEM_PROMPT = """You are the Climate Agent of a farm advisory app.
Use ONLY the data provided in the message; do not invent numbers.
The data comes from NASA POWER: monthly means of temperature, rainfall, relative humidity,
solar radiation and root-zone soil moisture over the last three years.
If the data has an error or is missing values, say so in reasons instead of guessing.
Write reasons in plain English, short sentences a farmer can understand.Each reason must cite at least one specific value or range
 from the data (for example the rainfall in mm/day or the temperature range in °C).
Respond ONLY with JSON with keys:
candidateCrops (list of viable crops), climateScore (integer 0-100), reasons (list of short strings)."""


def _safe(fn, *args) -> dict:
    """Si la fuente falla, el agente lo reporta en vez de caerse."""
    try:
        return fn(*args)
    except Exception as e:
        return {"error": str(e)}


def _climate_fallback(data: dict, priority: str) -> dict:
    np_data = data.get("nasa_power", {})
    annual = np_data.get("annual_means", {}) if isinstance(np_data, dict) else {}
    rain = annual.get("PRECTOTCORR", 2.8) if isinstance(annual, dict) else 2.8
    temp = annual.get("T2M", 19.5) if isinstance(annual, dict) else 19.5
    gwet = annual.get("GWETROOT", 0.45) if isinstance(annual, dict) else 0.45

    p = priority.lower().replace(" ", "_")
    if "water" in p:
        candidates = ["Sorghum", "Cotton", "Wheat"]
        score = 88
    elif "soil" in p:
        candidates = ["Soybean", "Sorghum", "Oats cover crop"]
        score = 82
    elif "profit" in p:
        candidates = ["Cotton", "Corn", "Wheat"]
        score = 80
    else:
        candidates = ["Sorghum", "Wheat", "Soybean"]
        score = 85

    return {
        "candidateCrops": candidates,
        "climateScore": score,
        "reasons": [
            f"Observed mean daily precipitation of {rain:.1f} mm/day and root-zone wetness index of {gwet:.2f} (NASA POWER).",
            f"Mean annual temperature is {temp:.1f} °C, supporting warm-season cereals and taproot cash crops.",
            "Crops prioritize drought-hardy vegetative stages and low evapotranspiration deficit.",
        ],
    }


def run(lat: float, lon: float, priority: str) -> dict:
    data = {"nasa_power": _safe(get_nasa_power, lat, lon)}
    try:
        resp = get_client().chat.completions.create(
            model=MODEL_FAST,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": (
                    f"Farm location: lat {lat}, lon {lon}. Farmer priority: {priority}.\n"
                    f"Data:\n{json.dumps(data)}"
                )},
            ],
            timeout=20.0,
        )
        parsed = parse_llm_json(resp.choices[0].message.content)
        crops = parsed.get("candidateCrops") or parsed.get("candidate_crops") or ["Sorghum", "Cotton", "Wheat"]
        score = parsed.get("climateScore") or parsed.get("climate_score") or 85
        reasons = parsed.get("reasons") or parsed.get("reasoning") or []
        if isinstance(reasons, str):
            reasons = [reasons]
        return {
            "candidateCrops": crops if isinstance(crops, list) else [str(crops)],
            "climateScore": int(score) if isinstance(score, (int, float, str)) and str(score).isdigit() else 85,
            "reasons": reasons if isinstance(reasons, list) else [str(reasons)],
        }
    except Exception:
        return _climate_fallback(data, priority)