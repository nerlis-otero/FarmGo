"""Market data for the chatbot: reads the local NASS CSVs. No LLM, no network."""
import csv
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "datasets"  # farmfuture-ai/datasets

FILE_KEY = {  # crop_id -> name used in the NASS file names
    "corn": "corn", "cotton": "cotton", "sorghum": "sorghum", "soybean": "soybean",
    "wheat": "wheat", "peanut": "peanut", "oats_cover": "oats",
}

YEAR_COLS = ("year", "año", "anio")
VALUE_COLS = ("value", "valor")
UNIT_COLS = ("data item", "unit", "unidad", "short_desc")


def _find(headers: dict, candidates):
    for c in candidates:
        if c in headers:
            return headers[c]
    return None


def _load_series(path: Path):
    """Average the NASS values per year. Returns ({year: value}, unit)."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        first = f.readline()
        f.seek(0)
        delim = max(",;\t", key=first.count)
        reader = csv.DictReader(f, delimiter=delim)
        headers = {h.strip().lower(): h for h in (reader.fieldnames or [])}
        ycol, vcol = _find(headers, YEAR_COLS), _find(headers, VALUE_COLS)
        ucol = _find(headers, UNIT_COLS)
        if not ycol or not vcol:
            raise ValueError(f"expected year/value columns, found: {list(headers)}")

        by_year, unit = defaultdict(list), None
        for row in reader:
            try:
                year = int(str(row[ycol]).strip())
                value = float(str(row[vcol]).replace(",", "").replace("$", "").strip())
            except (ValueError, TypeError):
                continue  # skips suppressed values like "(D)"
            by_year[year].append(value)
            if ucol and not unit:
                unit = row.get(ucol)
    series = {y: round(sum(v) / len(v), 2) for y, v in sorted(by_year.items())}
    return series, unit


def _recent_change(series: dict, points: int = 5):
    ys = sorted(series)[-points:]
    if len(ys) < 2 or series[ys[0]] == 0:
        return None
    return {
        "from_year": ys[0],
        "to_year": ys[-1],
        "pct": round((series[ys[-1]] - series[ys[0]]) / series[ys[0]] * 100, 1),
    }


def get_market_history(crop: str, years: int = 6) -> dict:
    if crop not in FILE_KEY:
        return {"error": f"No market data for '{crop}'. Available: {sorted(FILE_KEY)}"}

    out = {
        "crop": crop,
        "source": "USDA NASS QuickStats, Texas statewide historical data",
        "limits": "Historical state-level data. Not live prices, not local prices, not a forecast.",
    }
    for label in ("price", "yield"):
        path = DATA_DIR / f"nass_{FILE_KEY[crop]}_tx_{label}.csv"
        if not path.exists():
            out[label] = {"error": f"file not found: {path.name}"}
            continue
        try:
            series, unit = _load_series(path)
        except Exception as e:
            out[label] = {"error": str(e)}
            continue
        if not series:
            out[label] = {"error": "no usable rows"}
            continue
        out[label] = {
            "unit": unit,
            "by_year": dict(list(series.items())[-years:]),
            "recent_change": _recent_change(series),  # computed by code, not by the model
        }
        out["note_latest_year"] = "The most recent year may be incomplete."
    if crop == "oats_cover":
        out["note"] = "Data is for oats grain, used as a proxy for oats_cover."
    return out