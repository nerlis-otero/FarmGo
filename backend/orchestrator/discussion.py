"""Ronda de discusión: un modelo moderador compara lo que dijo cada agente."""
import json

from shared.config import MODEL_JUDGE
from shared.groq_client import get_client

SYSTEM_PROMPT = """Eres el moderador de una discusión entre tres especialistas (clima, suelo y mercado)
que asesoran a un agricultor de Texas. Recibes sus resultados en JSON.
Usa SOLO esos datos: no inventes cifras ni cultivos y NO cambies ningún puntaje.
Escribe: 1) en qué coinciden, 2) en qué se contradicen, 3) una conclusión de máximo 3 frases.
Recuerda que la decisión final es del agricultor."""


def discuss(climate: dict, soil: dict, market: dict, priority: str) -> str:
    payload = {"priority": priority, "climate": climate, "soil": soil, "market": market}
    resp = get_client().chat.completions.create(
        model=MODEL_JUDGE,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
    )
    return resp.choices[0].message.content