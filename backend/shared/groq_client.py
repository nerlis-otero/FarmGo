from groq import Groq
from shared.config import GROQ_API_KEY

_client = None


def get_client() -> Groq:
    """Cliente único de Groq, creado la primera vez que se usa."""
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client