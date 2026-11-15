"""Herramientas del Climate Agent: solo llamadas a APIs y resumen. Nada de LLM aquí."""
from collections import defaultdict
from datetime import date

try:
    import requests
except ImportError:
    import httpx as requests

from shared.cache import cached_json

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
# Verificar nombres exactos en el Swagger de NASA POWER
PARAMETERS = "T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,GWETROOT"


def _fetch_power(lat: float, lon: float, start: str, end: str) -> dict:
    params = {
        "parameters": PARAMETERS,
        "community": "AG",
        "latitude": lat,
        "longitude": lon,
        "start": start,  # YYYYMMDD
        "end": end,
        "format": "JSON",
    }
    r = requests.get(POWER_URL, params=params, timeout=60)
    r.raise_for_status()
    return r.json()["properties"]["parameter"]


def _monthly_means(series: dict) -> dict:
    """Promedio por mes para cada variable, ignorando los -999 (dato faltante)."""
    summary = {}
    for var, daily in series.items():
        by_month = defaultdict(list)
        for day, value in daily.items():  # day = "YYYYMMDD"
            if value != -999:
                by_month[day[4:6]].append(value)
        summary[var] = {m: round(sum(v) / len(v), 2) for m, v in sorted(by_month.items())}
    return summary


def get_nasa_power(lat: float, lon: float) -> dict:
    """Resumen mensual de los últimos 3 años completos para una coordenada."""
    last_year = date.today().year - 1
    start, end = f"{last_year - 2}0101", f"{last_year}1231"
    key = f"power_{round(lat, 2)}_{round(lon, 2)}_{start}_{end}"
    series = cached_json(key, lambda: _fetch_power(lat, lon, start, end))
    return {
        "period": f"{start}-{end}",
        "units": {
            "T2M": "°C", "PRECTOTCORR": "mm/día", "RH2M": "%",
            "ALLSKY_SFC_SW_DWN": "kWh/m²/día", "GWETROOT": "0-1",
        },
        "monthly_means": _monthly_means(series),
    }


# Descripción de la herramienta para el modelo
TOOLS = [{
    "type": "function",
    "function": {
        "name": "get_nasa_power",
        "description": (
            "Clima agrícola histórico (3 años) de NASA POWER para la parcela: temperatura, "
            "lluvia, humedad relativa, radiación solar y humedad de suelo. "
            "Devuelve promedios mensuales."
        ),
        "parameters": {
            "type": "object",
            "properties": {"lat": {"type": "number"}, "lon": {"type": "number"}},
            "required": ["lat", "lon"],
        },
    },
}]