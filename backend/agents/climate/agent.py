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


def run(lat: float, lon: float, priority: str) -> dict:
    data = {"nasa_power": _safe(get_nasa_power, lat, lon)}
    resp = get_client().chat.completions.create(
        model=MODEL_FAST,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": (
                f"Farm location: lat {lat}, lon {lon}. Farmer priority: {priority}.\n"
                f"Data:\n{json.dumps(data)}"
            )},
        ],
    )
    return ClimateOutput(**parse_llm_json(resp.choices[0].message.content)).model_dump()