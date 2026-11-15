try:
    from groq import Groq as _GroqClass
    _HAS_GROQ = True
except ImportError:
    _GroqClass = None
    _HAS_GROQ = False

from shared.config import GROQ_API_KEY

_client = None


def get_client():
    """Cliente único de Groq, creado la primera vez que se usa.
    Si el paquete groq no está instalado lanza ImportError con mensaje claro."""
    global _client
    if not _HAS_GROQ:
        raise ImportError(
            "El paquete 'groq' no está instalado. "
            "Instálalo con: pip install groq"
        )
    if _client is None:
        _client = _GroqClass(api_key=GROQ_API_KEY)
    return _client