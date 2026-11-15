"""Soil & Rotation Agent: code fetches SSURGO data, Qwen analyzes it (no tool calling)."""
import json

from agents.soil.schema import SoilOutput
from agents.soil.tools import get_ssurgo_soil
from shared.config import MODEL_SOIL
from shared.groq_client import get_client
from shared.json_utils import parse_llm_json

SYSTEM_PROMPT = """You are the Soil & Rotation Agent of a farm advisory app.
Use ONLY the data provided in the message; do not invent numbers.
The data comes from USDA SSURGO: map unit, soil components (drainage, slope, hydrologic group)
and horizon properties (organic matter, clay, sand, pH, erodibility, available water capacity).
Crop history is NOT available yet, so say so in reasons and do not assume the current crop.
If the data has status "no_soil_data" or an error, say so in reasons and give a low soilScore.
Recommend a short rotation of 2 or 3 seasons, for example "Sorghum → Soybean → Wheat".
Rotation rules: alternate botanical families, include a nitrogen-fixing legume when it fits,
and never put three crops of the same family in a row.
Each reason must cite at least one specific value from the data.
Write reasons in plain English, short sentences a farmer can understand.Always comment on texture (clay and sand percentages), because it affects tillage, waterlogging and usable water.
Do not claim a crop suits the soil pH or texture unless the data supports it; if unsure, say it needs a local expert check.
Respond ONLY with JSON with keys:
recommendedRotation (string), soilScore (integer 0-100 for soil health and suitability), reasons (list of short strings)."""


def _safe(fn, *args) -> dict:
    try:
        return fn(*args)
    except Exception as e:
        return {"error": str(e)}


def run(lat: float, lon: float, priority: str) -> dict:
    data = {"ssurgo": _safe(get_ssurgo_soil, lat, lon)}
    resp = get_client().chat.completions.create(
        model=MODEL_SOIL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"Farm location: lat {lat}, lon {lon}. Farmer priority: {priority}.\n"
                f"Data:\n{json.dumps(data)}"
            )},
        ],
    )
    return SoilOutput(**parse_llm_json(resp.choices[0].message.content)).model_dump()
