import os
from pathlib import Path

# Cargar .env de la raíz del repo si existe (sin requerir python-dotenv)
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT_DIR / ".env"
if ENV_FILE.exists():
    for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Mapear modelos para que siempre usen IDs oficiales y funcionales de Groq
def _resolve_groq_model(model_name: str | None, default: str) -> str:
    if not model_name or "openai/" in model_name or "qwen/" in model_name:
        return default
    return model_name

MODEL_SOIL  = _resolve_groq_model(os.getenv("MODEL_SOIL"),  "llama-3.1-8b-instant")
MODEL_FAST  = _resolve_groq_model(os.getenv("MODEL_FAST"),  "llama-3.1-8b-instant")
MODEL_JUDGE = _resolve_groq_model(os.getenv("MODEL_JUDGE"), "llama-3.3-70b-versatile")


CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)