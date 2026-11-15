"""Climate Agent: prompt + bucle de tool calling. Sin lógica HTTP."""
import json

from agents.climate.schema import ClimateOutput
from agents.climate.tools import TOOLS, get_nasa_power
from shared.config import MODEL_FAST
from shared.groq_client import get_client
from shared.json_utils import parse_llm_json

SYSTEM_PROMPT = """Eres el Climate Agent de una app para agricultores de Texas.
Usa SOLO los datos devueltos por la herramienta get_nasa_power; no inventes cifras.
Si falta un dato, dilo en reasons. Responde SOLO con un JSON con las claves:
candidateCrops (lista de cultivos viables), climateScore (entero 0-100), reasons (lista de textos cortos)."""


def run(lat: float, lon: float, priority: str) -> dict:
    client = get_client()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Parcela en lat {lat}, lon {lon}. Prioridad del agricultor: {priority}."},
    ]
    for _ in range(5):  # tope de vueltas para evitar bucles
        resp = client.chat.completions.create(
            model=MODEL_FAST, messages=messages, tools=TOOLS, tool_choice="auto"
        )
        msg = resp.choices[0].message
        if not msg.tool_calls:
            data = parse_llm_json(msg.content)
            return ClimateOutput(**data).model_dump()
        messages.append(msg)
        for call in msg.tool_calls:
            try:
                # Usamos las coordenadas reales, no las que invente el modelo
                result = get_nasa_power(lat, lon)
            except Exception as e:
                result = {"error": str(e)}
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(result),
            })
    raise RuntimeError("Climate Agent no terminó en el número máximo de vueltas")