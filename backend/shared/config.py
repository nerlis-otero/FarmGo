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
MODEL_SOIL  = os.getenv("MODEL_SOIL",  "qwen/qwen3.8-27b")       # agente suelo
MODEL_FAST  = os.getenv("MODEL_FAST",  "openai/gpt-oss-20b")     # agentes clima y mercado
MODEL_JUDGE = os.getenv("MODEL_JUDGE", "openai/gpt-oss-120b")    # discusión y veredicto


CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)