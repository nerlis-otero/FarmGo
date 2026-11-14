import json
from shared.config import CACHE_DIR


def cached_json(key: str, fetch_fn):
    """Si existe .cache/<key>.json lo devuelve; si no, llama a fetch_fn y lo guarda."""
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text())
    data = fetch_fn()
    path.write_text(json.dumps(data))
    return data