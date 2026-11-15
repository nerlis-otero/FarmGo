"""Soil Agent data tools: USDA SSURGO via Soil Data Access (no API key)."""
import requests

from shared.cache import cached_json

SDA_URL = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"


def _sda_query(sql: str) -> list[dict]:
    r = requests.post(SDA_URL, json={"format": "JSON+COLUMNNAME", "query": sql}, timeout=60)
    if not r.ok:
        raise RuntimeError(f"SSURGO {r.status_code}: {r.text[:500]}")
    if not r.text.strip():
        return []
    table = r.json().get("Table") or []
    if len(table) < 2:
        return []
    cols = table[0]
    return [dict(zip(cols, row)) for row in table[1:]]


def _num(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def _fetch_ssurgo(lat: float, lon: float) -> dict:
    # En WKT va primero la longitud y luego la latitud
    components = _sda_query(f"""
        SELECT TOP 6 mu.mukey, mu.muname, mu.farmlndcl,
               co.cokey, co.compname, co.comppct_r, co.drainagecl, co.slope_r, co.hydgrp
        FROM mapunit mu
        INNER JOIN component co ON co.mukey = mu.mukey
        WHERE mu.mukey IN (
            SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({lon} {lat})')
        )
        ORDER BY co.comppct_r DESC
    """)
    if not components:
        return {
            "status": "no_soil_data",
            "message": "No SSURGO soil polygon at this location (water, urban area or no survey).",
        }

    dominant = components[0]
    horizons = _sda_query(f"""
        SELECT TOP 8 hzname, hzdept_r, hzdepb_r, om_r, claytotal_r, sandtotal_r,
               ph1to1h2o_r, kffact, awc_r
        FROM chorizon
        WHERE cokey = {int(dominant['cokey'])}
        ORDER BY hzdept_r
    """)

    return {
        "map_unit": {"name": dominant["muname"], "farmland_class": dominant["farmlndcl"]},
        "components": [
            {
                "name": c["compname"],
                "percent_of_map_unit": _num(c["comppct_r"]),
                "drainage": c["drainagecl"],
                "slope_percent": _num(c["slope_r"]),
                "hydrologic_group": c["hydgrp"],
            }
            for c in components
        ],
        "dominant_component_horizons": [
            {
                "depth_top_cm": _num(h["hzdept_r"]),
                "depth_bottom_cm": _num(h["hzdepb_r"]),
                "organic_matter_pct": _num(h["om_r"]),
                "clay_pct": _num(h["claytotal_r"]),
                "sand_pct": _num(h["sandtotal_r"]),
                "ph": _num(h["ph1to1h2o_r"]),
                "erodibility_kf": _num(h["kffact"]),
                "available_water_capacity_cm_per_cm": _num(h["awc_r"]),
            }
            for h in horizons
        ],
        "notes": "SSURGO representative values. Horizons belong to the dominant component.",
    }


def get_ssurgo_soil(lat: float, lon: float) -> dict:
    key = f"ssurgo_{round(lat, 2)}_{round(lon, 2)}"
    return cached_json(key, lambda: _fetch_ssurgo(lat, lon))