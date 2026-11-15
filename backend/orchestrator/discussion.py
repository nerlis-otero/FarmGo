"""Round 2: each agent reads the other agents' round-1 analyses and responds."""
import asyncio
import json

from shared.config import MODEL_FAST, MODEL_SOIL
from shared.groq_client import get_client
from shared.json_utils import parse_llm_json

AGENT_MODELS = {"climate": MODEL_FAST, "soil": MODEL_SOIL, "market": MODEL_FAST}

ROLES = {
    "climate": "Climate Agent (weather, rainfall, soil moisture)",
    "soil": "Soil & Rotation Agent (soil health, crop rotation)",
    "market": "Market Agent (prices and expected profitability at harvest time)",
}

PROMPT = """You are the {role} in a team of three AI agents advising a farmer.
You already gave your own analysis. Now read your teammates' analyses and respond.
Rules: use only the data in the message; do not invent numbers; if analyses conflict, say so clearly.
Respond ONLY with JSON with keys:
agrees_with (list of short strings), disagreements (list of short strings),
revised_score (integer 0-100), final_position (one or two plain-English sentences for a farmer)."""


def _discuss_one(name: str, outputs: dict, priority: str) -> dict:
    payload = {
        "farmer_priority": priority,
        "your_analysis": outputs[name],
        "teammates": {k: v for k, v in outputs.items() if k != name},
    }
    try:
        resp = get_client().chat.completions.create(
            model=AGENT_MODELS[name],
            messages=[
                {"role": "system", "content": PROMPT.replace("{role}", ROLES[name])},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )
        return parse_llm_json(resp.choices[0].message.content)
    except Exception as e:  # una ronda 2 fallida no debe tumbar todo el análisis
        return {"error": str(e)}


async def discuss(outputs: dict, priority: str) -> dict:
    names = list(outputs)
    results = await asyncio.gather(
        *[asyncio.to_thread(_discuss_one, n, outputs, priority) for n in names]
    )
    return dict(zip(names, results))
