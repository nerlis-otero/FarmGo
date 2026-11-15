"""Judge agent: reads the analyses and the discussion, then gives the final verdict."""
import json

from shared.config import MODEL_JUDGE
from shared.groq_client import get_client
from shared.json_utils import parse_llm_json

JUDGE_PROMPT = """You are the Judge agent of a farm advisory app. Three specialist agents
(climate, soil, market) analyzed a farmer's land and then discussed their findings.
Weigh their positions according to the farmer's priority (profit, water_saving, soil_health or balanced).
Use only the data provided. Do not invent numbers. If data is missing or the agents disagree
on something important, list it in gaps.
Respond ONLY with JSON with keys:
bestCropToGrow, bestCropToSell, recommendedRotation, bestOverallCrop,
reasoning (2-4 short sentences in plain English for a farmer),
confidence ("low", "medium" or "high"), gaps (list of short strings)."""


def judge(analyses: dict, discussion: dict, priority: str) -> dict:
    payload = {"farmer_priority": priority, "analyses": analyses, "discussion": discussion}
    resp = get_client().chat.completions.create(
        model=MODEL_JUDGE,
        messages=[
            {"role": "system", "content": JUDGE_PROMPT},
            {"role": "user", "content": json.dumps(payload)},
        ],
    )
    return parse_llm_json(resp.choices[0].message.content)