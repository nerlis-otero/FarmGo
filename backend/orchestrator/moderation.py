"""A moderator summarizes agreement and disagreement across the specialist agents."""
import json

from shared.config import MODEL_JUDGE
from shared.groq_client import get_client

SYSTEM_PROMPT = """You moderate a discussion between climate, soil, and market specialists
advising a farmer. Use only the provided results: do not invent figures or crops and do not
change any scores. Summarize points of agreement, disagreement, and a conclusion in at most
three short sentences. The farmer makes the final decision."""


def moderate(climate: dict, soil: dict, market: dict, priority: str) -> str:
    payload = {"priority": priority, "climate": climate, "soil": soil, "market": market}
    response = get_client().chat.completions.create(
        model=MODEL_JUDGE,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
    )
    return response.choices[0].message.content
