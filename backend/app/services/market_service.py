from pathlib import Path
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[3]
DATASETS_DIR = ROOT_DIR / "datasets"


def get_market_metrics(
    crop_name: str,
    price_file: str,
    yield_file: str,
):
    # -----------------------
    # PRECIOS
    # -----------------------

    price_df = pd.read_csv(
        DATASETS_DIR / price_file
    )

    price_df["Value"] = pd.to_numeric(
        price_df["Value"],
        errors="coerce"
    )

    price_df = price_df.dropna(
        subset=["Value"]
    )

    # solo registros anuales
    annual_prices = price_df[
        price_df["freq_desc"] == "ANNUAL"
    ].copy()

    avg_price = annual_prices["Value"].mean()

    latest_price = annual_prices.sort_values(
        "year"
    )["Value"].iloc[-1]

    oldest_price = annual_prices.sort_values(
        "year"
    )["Value"].iloc[0]

    # -----------------------
    # TENDENCIA
    # -----------------------

    change_pct = (
        (latest_price - oldest_price)
        / oldest_price
    ) * 100

    if change_pct > 10:
        trend = "up"
        trend_score = 100

    elif change_pct < -10:
        trend = "down"
        trend_score = 40

    else:
        trend = "stable"
        trend_score = 70

    # -----------------------
    # RENDIMIENTOS
    # -----------------------

    yield_df = pd.read_csv(
        DATASETS_DIR / yield_file
    )

    yield_df["Value"] = pd.to_numeric(
        yield_df["Value"],
        errors="coerce"
    )

    yield_df = yield_df.dropna(
        subset=["Value"]
    )

    texas_yields = yield_df[
        yield_df["agg_level_desc"] == "STATE"
    ].copy()

    avg_yield = texas_yields["Value"].mean()

    # normalizar
    yield_score = min(
        (avg_yield / 150) * 100,
        100
    )

    market_score = round(
        (
            trend_score * 0.5
            +
            yield_score * 0.5
        ),
        2
    )

    return {
        "crop": crop_name,
        "avgPrice": round(avg_price, 2),
        "latestPrice": round(latest_price, 2),
        "avgYield": round(avg_yield, 2),
        "priceTrend": trend,
        "marketScore": market_score,
        "reasons": [
            f"Price trend is {trend}",
            "Historical yield data available",
        ],
    }