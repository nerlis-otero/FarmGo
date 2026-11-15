"""Build a location-aware crop-rotation preview from NASA POWER and project data."""
import calendar
import csv
from pathlib import Path

from agents.climate.tools import get_nasa_power
from app.contracts import (
    PRIORITY_WEIGHTS,
    CropId,
    DimensionScores,
    Priority,
    RecommendResponse,
    RotationResult,
)

ROOT = Path(__file__).resolve().parents[2]
CROPS_PATH = ROOT / "data" / "crops.csv"
ROTATIONS_PATH = ROOT / "data" / "rotations.csv"
DATASETS_PATH = ROOT / "datasets"

MARKET_DATA = {
    CropId.corn: ("nass_corn_tx_price.csv", "nass_corn_tx_yield.csv"),
    CropId.cotton: ("nass_cotton_tx_price.csv", "nass_cotton_tx_yield.csv"),
    CropId.sorghum: ("nass_sorghum_tx_price.csv", "nass_sorghum_tx_yield.csv"),
}


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def _number(value: str | None) -> float | None:
    if not value:
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if parsed == parsed and abs(parsed) != float("inf") else None


def _load_crops() -> dict[CropId, dict[str, str]]:
    rows = _read_csv(CROPS_PATH)
    return {CropId(row["crop_id"]): row for row in rows}


def _average(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _monthly_values(weather: dict, variable: str) -> dict[int, float]:
    try:
        raw = weather["monthly_means"][variable]
    except (KeyError, TypeError) as error:
        raise ValueError(f"NASA POWER did not return {variable} data.") from error
    values = {int(month): float(value) for month, value in raw.items()}
    if not values or any(not (-999 < value < 1_000_000) for value in values.values()):
        raise ValueError(f"NASA POWER returned invalid {variable} data.")
    return values


def _annual_precipitation(weather: dict, daily_rain: dict[int, float]) -> float:
    period = str(weather.get("period", ""))
    try:
        first_year = int(period[:4])
        last_year = int(period[9:13])
    except (ValueError, IndexError) as error:
        raise ValueError("NASA POWER returned an invalid observation period.") from error

    month_days = {
        month: sum(calendar.monthrange(year, month)[1] for year in range(first_year, last_year + 1))
        / (last_year - first_year + 1)
        for month in range(1, 13)
    }
    return sum(daily_rain[month] * month_days[month] for month in daily_rain) / (
        last_year - first_year + 1
    )


def _range_fit(value: float, lower: float, upper: float, tolerance: float) -> float:
    if lower <= value <= upper:
        return 100.0
    distance = lower - value if value < lower else value - upper
    return max(0.0, 100.0 * (1.0 - distance / tolerance))


def _climate_score(
    crop: dict[str, str],
    annual_rain_mm: float,
    monthly_temperature: dict[int, float],
) -> float:
    season = crop["season_type"]
    if season == "warm":
        months = range(3, 11)
    elif season == "cool":
        months = (10, 11, 12, 1, 2, 3)
    else:
        months = range(1, 13)

    temperatures = [monthly_temperature[month] for month in months if month in monthly_temperature]
    if not temperatures:
        raise ValueError("NASA POWER did not return enough temperature data.")

    temperature = sum(temperatures) / len(temperatures)
    rain_fit = _range_fit(
        annual_rain_mm,
        float(crop["rain_opt_min_mm"]),
        float(crop["rain_opt_max_mm"]),
        max(float(crop["rain_opt_max_mm"]), 1.0),
    )
    temperature_fit = _range_fit(
        temperature,
        float(crop["temp_opt_min_c"]),
        float(crop["temp_opt_max_c"]),
        max(float(crop["temp_opt_max_c"]) - float(crop["temp_opt_min_c"]), 10.0),
    )
    return round(rain_fit * 0.6 + temperature_fit * 0.4, 1)


def _soil_rotation_score(sequence: list[CropId], crops: dict[CropId, dict[str, str]]) -> float:
    if not sequence:
        return 0.0

    profiles = [crops[crop_id] for crop_id in sequence]
    families = {profile["family"] for profile in profiles}
    score = 35.0
    if len(families) > 1:
        score += 12.0
    if any(profile["fixes_nitrogen"] == "true" for profile in profiles):
        score += 18.0
    if any(profile["is_cover_crop"] == "true" for profile in profiles):
        score += 18.0
    erosion_values = {"low": 3.0, "medium": 7.0, "high": 12.0}
    score += sum(erosion_values[profile["erosion_protection"]] for profile in profiles) / len(profiles)
    return round(min(score, 100.0), 1)


def _market_crop_score(crop_id: CropId) -> tuple[float, str | None]:
    files = MARKET_DATA.get(crop_id)
    if not files:
        return 50.0, None

    price_rows = _read_csv(DATASETS_PATH / files[0])
    yield_rows = _read_csv(DATASETS_PATH / files[1])

    def annual_state_values(rows: list[dict[str, str]]) -> dict[int, float]:
        yearly: dict[int, list[float]] = {}
        for row in rows:
            if row.get("agg_level_desc") != "STATE" or row.get("freq_desc") != "ANNUAL":
                continue
            year = _number(row.get("year"))
            value = _number(row.get("Value"))
            if year is not None and value is not None:
                yearly.setdefault(int(year), []).append(value)
        return {year: sum(values) / len(values) for year, values in yearly.items()}

    prices = annual_state_values(price_rows)
    yields = annual_state_values(yield_rows)
    component_scores: list[float] = []
    trend: str | None = None

    for history in (prices, yields):
        years = sorted(history)
        if len(years) < 2:
            continue
        first, latest = history[years[0]], history[years[-1]]
        if first == 0:
            continue
        change_pct = (latest - first) / abs(first) * 100
        component_scores.append(max(0.0, min(100.0, 50.0 + change_pct)))
        if history is prices:
            trend = "rising" if change_pct > 5 else "falling" if change_pct < -5 else "fairly steady"

    if not component_scores:
        return 50.0, None
    return round(sum(component_scores) / len(component_scores), 1), trend


def _rotation_result(
    rotation_id: str,
    label: str,
    sequence: list[CropId],
    is_current: bool,
    crops: dict[CropId, dict[str, str]],
    crop_climate_scores: dict[CropId, float],
    market_scores: dict[CropId, tuple[float, str | None]],
    priority: Priority,
    weather_evidence: str,
) -> RotationResult:
    if not sequence:
        climate_score = soil_score = market_score = 0.0
    else:
        climate_score = round(sum(crop_climate_scores[crop] for crop in sequence) / len(sequence), 1)
        soil_score = _soil_rotation_score(sequence, crops)
        market_score = round(sum(market_scores[crop][0] for crop in sequence) / len(sequence), 1)

    weights = PRIORITY_WEIGHTS[priority]
    total = round(
        climate_score * weights["climate"]
        + soil_score * weights["soil"]
        + market_score * weights["market"],
        1,
    )

    names = {
        CropId.corn: "Corn",
        CropId.cotton: "Cotton",
        CropId.sorghum: "Sorghum",
        CropId.soybean: "Soybeans",
        CropId.wheat: "Wheat",
        CropId.peanut: "Peanuts",
        CropId.oats_cover: "Cover crop oats",
        CropId.forage_grass: "Forage grass",
    }
    crop_names = [names[crop] for crop in sequence]
    benefits: list[str] = []
    gaps = ["Field-specific soil measurements are not connected; soil score uses draft crop-rotation traits."]
    risks = ["Check this example with a local agricultural extension specialist before planting."]

    if sequence and any(crops[crop]["fixes_nitrogen"] == "true" for crop in sequence):
        benefits.append("Includes a legume listed as nitrogen-fixing in the crop catalog.")
    if sequence and any(crops[crop]["is_cover_crop"] == "true" for crop in sequence):
        benefits.append("Includes a crop listed for ground cover in the crop catalog.")
    if any(crop not in MARKET_DATA for crop in sequence):
        gaps.append("Texas NASS price and yield files are not available for every crop in this plan.")

    if is_current and not sequence:
        why = "No current crops were selected, so this is an empty baseline rather than a planted rotation."
    elif is_current:
        why = f"This baseline reflects the crops you selected: {', '.join(crop_names)}."
    else:
        why = (
            f"Climate fit uses NASA POWER observations for the marked location. "
            f"The suggested sequence is {', '.join(crop_names)}."
        )

    evidence = [weather_evidence] if sequence else []
    for crop in sequence:
        trend = market_scores[crop][1]
        if trend:
            evidence.append(f"Texas statewide NASS price and yield trend for {names[crop]} is {trend}.")

    return RotationResult(
        id=rotation_id,
        label=label,
        sequence=sequence,
        is_current=is_current,
        scores=DimensionScores(
            climate=climate_score,
            soil=soil_score,
            market=market_score,
            total=total,
        ),
        why=why,
        evidence=list(dict.fromkeys(evidence)),
        benefits=benefits,
        gaps=gaps,
        risks=risks,
    )


def recommend_for_location(
    lat: float,
    lon: float,
    priority: Priority,
    current_crops: list[CropId],
) -> RecommendResponse:
    weather = get_nasa_power(lat, lon)
    monthly_temperature = _monthly_values(weather, "T2M")
    daily_rain = _monthly_values(weather, "PRECTOTCORR")
    annual_rain = _annual_precipitation(weather, daily_rain)
    crops = _load_crops()
    crop_climate_scores = {
        crop_id: _climate_score(profile, annual_rain, monthly_temperature)
        for crop_id, profile in crops.items()
    }
    market_scores = {crop_id: _market_crop_score(crop_id) for crop_id in crops}

    period = weather.get("period", "the reported observation period")
    weather_evidence = (
        f"NASA POWER daily data at {lat:.4f}, {lon:.4f}: average annual precipitation "
        f"{annual_rain:.0f} mm, based on {period}."
    )

    current = _rotation_result(
        "current",
        "Your current crops" if current_crops else "No crops planted yet",
        current_crops,
        True,
        crops,
        crop_climate_scores,
        market_scores,
        priority,
        weather_evidence,
    )

    suggestions: list[RotationResult] = []
    for template in _read_csv(ROTATIONS_PATH):
        sequence = [
            CropId(template[f"season_{season}"])
            for season in range(1, 4)
        ]
        suggestions.append(
            _rotation_result(
                template["template_id"],
                f"Suggested rotation {template['template_id'][-2:]}",
                sequence,
                False,
                crops,
                crop_climate_scores,
                market_scores,
                priority,
                weather_evidence,
            )
        )

    suggestions.sort(key=lambda rotation: rotation.scores.total, reverse=True)
    rotations = [current, *suggestions[:2]]
    best = max(rotations[1:], key=lambda rotation: rotation.scores.total)
    notes = [
        f"Climate data comes from NASA POWER for the marked coordinates ({lat:.4f}, {lon:.4f}), covering {period}.",
        "NASA POWER soil moisture is modeled. It is not a field soil test or a direct satellite measurement.",
        "Soil scores are rotation-potential estimates based on draft crop-catalog traits, not measurements from this location.",
        "Market scores use available Texas statewide USDA NASS price and yield history; they are not county-specific and do not include production costs.",
        "Crop profiles in data/crops.csv are preliminary and have not been verified.",
    ]
    return RecommendResponse(
        farm_id="custom",
        priority=priority,
        best_rotation_id=best.id,
        rotations=rotations,  # type: ignore[arg-type]
        data_notes=notes,
        disclaimer=(
            "This location-based preview supports farm decisions but is not a planting or financial "
            "recommendation. Confirm local soil, water, planting dates, prices, and costs with an "
            "agricultural specialist."
        ),
    )
