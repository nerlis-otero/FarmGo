import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_SOIL  = os.getenv("MODEL_SOIL",  "qwen/qwen3.8-27b")       # agente suelo
MODEL_FAST  = os.getenv("MODEL_FAST",  "openai/gpt-oss-20b")     # agentes clima y mercado
MODEL_JUDGE = os.getenv("MODEL_JUDGE", "openai/gpt-oss-120b")    # discusión y veredicto


CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)