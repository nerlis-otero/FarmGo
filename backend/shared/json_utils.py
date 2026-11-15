import json
import re


def parse_llm_json(text: str) -> dict:
    """Extrae un JSON de la respuesta del modelo (quita <think> y ```json ... ```)."""
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.DOTALL)
    text = re.sub(r"```(?:json)?", "", text).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("La respuesta del modelo no contiene JSON")
    return json.loads(text[start:end + 1])