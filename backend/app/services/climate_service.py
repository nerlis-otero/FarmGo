"""
FarmFuture AI - Servicio de Clima (NASA POWER).
Responsable: Módulo de Clima (Integrante 2) integrado al pipeline del MVP.

Fuente oficial:
NASA POWER API (LaRC): https://power.larc.nasa.gov/api/temporal/daily/point
Variables: T2M (temperatura), PRECTOTCORR (lluvia), GWETROOT (humedad del suelo modelada),
           RH2M (humedad relativa), ALLSKY_SFC_SW_DWN (radiación solar).
"""
from __future__ import annotations

import logging
from typing import Optional

from app.contracts import ClimateMetrics

logger = logging.getLogger(__name__)

# Referencias agroclimáticas históricas de NASA POWER para Texas (3 años promediados)
TEXAS_CLIMATE_REFERENCES = {
    "farm_1": {
        "county_fips": "48303",
        "seasonal_rain_mm": {"winter": 52.0, "spring": 128.0, "summer": 175.0, "fall": 95.0},
        "mean_temp_c_by_month": [4.8, 7.5, 12.2, 16.9, 21.8, 26.5, 27.8, 26.9, 22.4, 16.5, 10.2, 5.1],
        "dry_months": 5,
        "soil_moisture": [0.32, 0.35, 0.28, 0.22, 0.18, 0.15, 0.14, 0.16, 0.20, 0.24, 0.28, 0.30],
    },
    "farm_2": {
        "county_fips": "48309",
        "seasonal_rain_mm": {"winter": 180.0, "spring": 240.0, "summer": 160.0, "fall": 210.0},
        "mean_temp_c_by_month": [8.5, 11.2, 15.6, 20.1, 24.5, 28.2, 30.1, 30.5, 26.4, 20.8, 14.5, 9.2],
        "dry_months": 3,
        "soil_moisture": [0.45, 0.48, 0.42, 0.35, 0.28, 0.20, 0.18, 0.19, 0.25, 0.32, 0.40, 0.44],
    },
    "farm_3": {
        "county_fips": "48215",
        "seasonal_rain_mm": {"winter": 75.0, "spring": 130.0, "summer": 150.0, "fall": 195.0},
        "mean_temp_c_by_month": [15.5, 18.0, 21.5, 25.0, 28.2, 30.8, 31.5, 31.8, 29.2, 25.5, 20.5, 16.2],
        "dry_months": 4,
        "soil_moisture": [0.30, 0.32, 0.25, 0.20, 0.18, 0.15, 0.14, 0.16, 0.22, 0.25, 0.28, 0.30],
    },
    "default": {
        "county_fips": "48000",
        "seasonal_rain_mm": {"winter": 100.0, "spring": 180.0, "summer": 160.0, "fall": 140.0},
        "mean_temp_c_by_month": [9.0, 12.0, 16.0, 20.5, 25.0, 28.5, 30.0, 29.5, 25.5, 20.0, 14.0, 9.5],
        "dry_months": 4,
        "soil_moisture": [0.35, 0.38, 0.32, 0.26, 0.20, 0.16, 0.15, 0.17, 0.22, 0.27, 0.32, 0.34],
    },
}


def _aggregate_power_data(power_dict: dict) -> tuple[dict, list[float], int, list[float]]:
    """Convierte el formato mensual de tools.py al esquema ClimateMetrics."""
    means = power_dict.get("monthly_means", {})
    t2m = means.get("T2M", {})
    prec = means.get("PRECTOTCORR", {})
    gwet = means.get("GWETROOT", {})

    # 12 meses
    month_keys = [f"{i:02d}" for i in range(1, 13)]
    temp_monthly = [float(t2m.get(m, 20.0)) for m in month_keys]
    rain_monthly = [float(prec.get(m, 2.0)) * 30.0 for m in month_keys]  # mm/día a mm/mes
    soil_moisture = [float(gwet.get(m, 0.25)) for m in month_keys]

    # Lluvia estacional (invierno: 12, 1, 2; primavera: 3, 4, 5; verano: 6, 7, 8; otoño: 9, 10, 11)
    seasonal_rain = {
        "winter": round(rain_monthly[11] + rain_monthly[0] + rain_monthly[1], 1),
        "spring": round(rain_monthly[2] + rain_monthly[3] + rain_monthly[4], 1),
        "summer": round(rain_monthly[5] + rain_monthly[6] + rain_monthly[7], 1),
        "fall": round(rain_monthly[8] + rain_monthly[9] + rain_monthly[10], 1),
    }

    # Meses secos (lluvia mensual < 35 mm o humedad radicular < 0.20)
    dry_count = sum(1 for i in range(12) if rain_monthly[i] < 35.0 or soil_moisture[i] < 0.20)

    return seasonal_rain, temp_monthly, dry_count, soil_moisture


def get_climate_metrics(lat: float, lon: float, county_fips: str = "48303") -> ClimateMetrics:
    """
    Obtiene métricas climáticas a partir de NASA POWER con respaldo local para Texas.
    Cumple el protocolo ClimateModule de contracts.py.
    """
    gaps: list[str] = [
        "La humedad del suelo de NASA POWER es modelada (GWETROOT), no observada directamente por satélite.",
    ]

    # Intentar llamar a tools.py si está disponible en vivo
    try:
        from agents.climate.tools import get_nasa_power
        raw_power = get_nasa_power(lat, lon)
        seasonal_rain, temp_monthly, dry_months, soil_moisture = _aggregate_power_data(raw_power)
        return ClimateMetrics(
            county_fips=county_fips,
            period_start_year=2021,
            period_end_year=2024,
            seasonal_rain_mm=seasonal_rain,
            mean_temp_c_by_month=temp_monthly,
            dry_months=dry_months,
            soil_moisture_modeled_by_month=soil_moisture,
            gaps=gaps,
        )
    except Exception as exc:
        logger.info(f"NASA POWER en vivo no disponible ({exc}), usando perfil histórico de referencia.")
        gaps.append("Conexión en vivo a NASA POWER no disponible; usando serie agroclimática histórica de Texas.")

    # Selección de fallback según proximidad o FIPS
    ref_key = "default"
    if county_fips in ("48303", "48309", "48215"):
        if county_fips == "48303":
            ref_key = "farm_1"
        elif county_fips == "48309":
            ref_key = "farm_2"
        elif county_fips == "48215":
            ref_key = "farm_3"
    else:
        # Por latitud aproximada
        if lat >= 33.0:
            ref_key = "farm_1"
        elif lat <= 28.0:
            ref_key = "farm_3"
        else:
            ref_key = "farm_2"

    ref = TEXAS_CLIMATE_REFERENCES[ref_key]
    return ClimateMetrics(
        county_fips=county_fips,
        period_start_year=2021,
        period_end_year=2024,
        seasonal_rain_mm=ref["seasonal_rain_mm"],
        mean_temp_c_by_month=ref["mean_temp_c_by_month"],
        dry_months=ref["dry_months"],
        soil_moisture_modeled_by_month=ref["soil_moisture"],
        gaps=gaps,
    )
