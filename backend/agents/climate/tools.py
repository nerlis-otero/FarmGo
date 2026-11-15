"""Climate Agent data tools: only API calls and summaries. No LLM here."""
from collections import defaultdict
from datetime import date

try:
    import requests
except ImportError:
    import httpx as requests

from shared.cache import cached_json

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = "T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,GWETROOT"


def _fetch_power(lat: float, lon: float, start: str, end: str) -> dict:
    params = {
        "parameters": PARAMETERS, "community": "AG",
        "latitude": lat, "longitude": lon,
        "start": start, "end": end, "format": "JSON",
    }
    r = requests.get(POWER_URL, params=params, timeout=60)
    ok = r.ok if hasattr(r, "ok") else r.is_success
    if not ok:
        raise RuntimeError(f"NASA POWER {r.status_code}: {r.text[:500]}")
    return r.json()["properties"]["parameter"]


def _monthly_means(series: dict) -> dict:
    summary = {}
    for var, daily in series.items():
        by_month = defaultdict(list)
        for day, value in daily.items():
            if value != -999:
                by_month[day[4:6]].append(value)
        summary[var] = {m: round(sum(v) / len(v), 2) for m, v in sorted(by_month.items())}
    return summary


def get_nasa_power(lat: float, lon: float) -> dict:
    last_year = date.today().year - 1
    start, end = f"{last_year - 2}0101", f"{last_year}1231"
    key = f"power_{round(lat, 2)}_{round(lon, 2)}_{start}_{end}"
    series = cached_json(key, lambda: _fetch_power(lat, lon, start, end))
    return {
        "period": f"{start}-{end}",
        "units": {"T2M": "°C", "PRECTOTCORR": "mm/day", "RH2M": "%",
                  "ALLSKY_SFC_SW_DWN": "MJ/m²/day", "GWETROOT": "0-1"},
        "monthly_means": _monthly_means(series),
    }