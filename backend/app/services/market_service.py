import csv
from pathlib import Path

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False

from app.contracts import CropId, CropMarket, MarketMetrics

ROOT_DIR = Path(__file__).resolve().parents[3]
DATASETS_DIR = ROOT_DIR / "datasets"
PRICE_FILE = DATASETS_DIR / "nass_precio_texas_limpio.csv"
YIELD_FILE = DATASETS_DIR / "nass_rendimiento_texas_limpio.csv"

GENERAL_GAPS = [
    "Los precios y rendimientos son promedios de todo Texas, no de tu condado.",
    "No incluye costos de producción: el ingreso por acre es bruto, no es ganancia.",
    "Los datos van de 2020 a 2025; el 2026 no se usa porque no ha terminado.",
]


def _trend(prices: list[float] | pd.Series):
    """Compara el último precio contra el promedio de los años anteriores."""
    if len(prices) < 2:
        return None
    if HAS_PANDAS and isinstance(prices, pd.Series):
        before = prices.iloc[:-1].mean()
        last = prices.iloc[-1]
    else:
        before = sum(prices[:-1]) / len(prices[:-1])
        last = prices[-1]

    change = (last - before) / before * 100
    if change > 10:
        return "up"
    if change < -10:
        return "down"
    return "flat"


def _revenue_per_acre(crop: str, price: float, avg_yield: float) -> float:
    if crop == "sorghum":
        # precio en $/quintal (100 lb); 1 bushel de sorgo = 56 lb
        return round(price / 100 * 56 * avg_yield, 2)
    # maíz: $/bushel x bushel/acre | algodón: $/libra x libra/acre
    return round(price * avg_yield, 2)


def get_market_metrics(crop_ids: list[CropId]) -> MarketMetrics:
    crops: dict[CropId, CropMarket] = {}
    gaps = list(GENERAL_GAPS)

    if HAS_PANDAS:
        prices = pd.read_csv(PRICE_FILE)
        yields = pd.read_csv(YIELD_FILE)

        for crop in crop_ids:
            p = prices[prices["crop_id"] == crop.value].sort_values("year")
            y = yields[yields["crop_id"] == crop.value].sort_values("year")

            if p.empty or y.empty:
                crops[crop] = CropMarket()  # todo en None: no inventamos datos
                gaps.append(f"No hay datos de mercado para {crop.value}.")
                continue

            latest_price = float(p["price_value"].iloc[-1])
            avg_yield = float(y["yield_value"].mean())

            crops[crop] = CropMarket(
                price=round(latest_price, 3),
                price_unit=p["unit_desc"].iloc[-1],
                typical_yield=round(avg_yield, 1),
                yield_unit=y["unit_desc"].iloc[-1],
                price_trend=_trend(p["price_value"]),
                revenue_per_acre=_revenue_per_acre(crop.value, latest_price, avg_yield),
            )
    else:
        # Fallback estándar con módulo csv si pandas no está instalado
        prices_list: list[dict] = []
        if PRICE_FILE.exists():
            with open(PRICE_FILE, mode="r", encoding="utf-8") as f:
                prices_list = list(csv.DictReader(f))

        yields_list: list[dict] = []
        if YIELD_FILE.exists():
            with open(YIELD_FILE, mode="r", encoding="utf-8") as f:
                yields_list = list(csv.DictReader(f))

        for crop in crop_ids:
            p_rows = sorted([r for r in prices_list if r["crop_id"] == crop.value], key=lambda x: int(x["year"]))
            y_rows = sorted([r for r in yields_list if r["crop_id"] == crop.value], key=lambda x: int(x["year"]))

            if not p_rows or not y_rows:
                crops[crop] = CropMarket()
                gaps.append(f"No hay datos de mercado para {crop.value}.")
                continue

            latest_price = float(p_rows[-1]["price_value"])
            all_yields = [float(r["yield_value"]) for r in y_rows]
            avg_yield = sum(all_yields) / len(all_yields)
            price_vals = [float(r["price_value"]) for r in p_rows]

            crops[crop] = CropMarket(
                price=round(latest_price, 3),
                price_unit=p_rows[-1]["unit_desc"],
                typical_yield=round(avg_yield, 1),
                yield_unit=y_rows[-1]["unit_desc"],
                price_trend=_trend(price_vals),
                revenue_per_acre=_revenue_per_acre(crop.value, latest_price, avg_yield),
            )

    return MarketMetrics(crops=crops, gaps=gaps)
