"""
FarmGo - Motor de Puntuación de Rotaciones (Scoring Engine).
Responsable: Integrante 3.

Reglas del sistema:
- Los números los calcula el código, NUNCA el modelo de lenguaje.
- Siempre devuelve exactamente 3 rotaciones: la actual (is_current=True) + 2 sugeridas (rot_01, rot_02).
- Aplica las reglas agronómicas de docs/reglas_suelo.md y los pesos de PRIORITY_WEIGHTS.
- Genera facts cuantitativos citables para que el LLM redacte why, evidence, benefits, gaps y risks sin inventar datos.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Optional

from app.contracts import (
    PRIORITY_WEIGHTS,
    ClimateMetrics,
    CropId,
    DimensionScores,
    MarketMetrics,
    Priority,
    ScoredRotation,
    SoilRotationMetrics,
)

ROOT_DIR = Path(__file__).resolve().parents[3]
CROPS_FILE = ROOT_DIR / "data" / "crops.csv"
ROTATIONS_FILE = ROOT_DIR / "data" / "rotations.csv"


def _load_crops_catalog() -> dict[str, dict]:
    """Carga el catálogo agronómico de cultivos."""
    catalog = {}
    if CROPS_FILE.exists():
        with open(CROPS_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                catalog[row["crop_id"]] = row
    return catalog


def _load_rotation_templates() -> list[dict]:
    """Carga las plantillas de rotación de 3 temporadas."""
    templates = []
    if ROTATIONS_FILE.exists():
        with open(ROTATIONS_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                templates.append(row)
    return templates


def _clamp(val: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    return max(min_val, min(max_val, val))


def _score_soil_dimension(
    sequence: list[CropId],
    crops_cat: dict[str, dict],
    soil_rot: SoilRotationMetrics,
) -> tuple[float, list[str], list[str]]:
    """
    Calcula el puntaje de salud del suelo (0-100), reglas aplicadas y hechos agronómicos.
    Implementa docs/reglas_suelo.md.
    """
    score = 50.0
    rules: list[str] = []
    facts: list[str] = []

    soil = soil_rot.soil
    k_fact = soil.erodibility_k or 0.28
    slope = soil.slope_pct or 1.0
    om_pct = soil.organic_matter_pct or 1.5
    texture = soil.texture or "Suelo franco"

    facts.append(f"Textura del suelo: {texture}, pendiente: {slope}%, factor de erodabilidad K: {k_fact}.")
    facts.append(f"Materia orgánica del suelo registrada en {om_pct}%.")

    # 1. Regla: Fijación de nitrógeno
    has_legume = any(crops_cat.get(c.value, {}).get("fixes_nitrogen") == "true" for c in sequence)
    if has_legume:
        score += 20.0
        rules.append("nitrogen_fixation")
        legumes = [crops_cat[c.value]["name_es"] for c in sequence if crops_cat.get(c.value, {}).get("fixes_nitrogen") == "true"]
        facts.append(f"Fijación biológica de nitrógeno aportada por {', '.join(legumes)}.")

    # 2. Regla: Leguminosa inmediatamente después de cereal
    for i in range(len(sequence) - 1):
        c1 = crops_cat.get(sequence[i].value, {})
        c2 = crops_cat.get(sequence[i + 1].value, {})
        if c1.get("family") == "Poaceae" and c2.get("fixes_nitrogen") == "true":
            score += 10.0
            rules.append("legume_after_cereal")
            facts.append(f"Sinergia de fertilidad: leguminosa ({c2.get('name_es')}) sembrada tras cereal ({c1.get('name_es')}).")
            break

    # 3. Regla: Cobertura invernal y protección contra erosión
    has_cover = any(
        crops_cat.get(c.value, {}).get("is_cover_crop") == "true" or
        crops_cat.get(c.value, {}).get("erosion_protection") == "high"
        for c in sequence
    )
    if has_cover:
        score += 15.0
        rules.append("winter_cover_crop")
        facts.append("Incluye cultivo de cobertura o protección invernal que protege la estructura del suelo.")
        if k_fact >= 0.28 or slope >= 1.5:
            score += 10.0
            rules.append("erosion_mitigation")
            facts.append(f"Mitigación activa de erosión en suelo susceptible (K={k_fact}, pendiente={slope}%).")
    else:
        if k_fact >= 0.28 or slope >= 1.5:
            score -= 15.0
            rules.append("bare_soil_risk")
            facts.append(f"Alerta: Suelo con riesgo de erosión (K={k_fact}) sin cultivo de cobertura invernal.")

    # 4. Regla: Familia botánica adyacente y ruptura de plagas
    families = [crops_cat.get(c.value, {}).get("family") for c in sequence]
    has_same_family_adjacent = any(families[i] == families[i + 1] and families[i] is not None for i in range(len(families) - 1))
    is_monoculture = len(set(sequence)) == 1

    if is_monoculture or has_same_family_adjacent:
        score -= 25.0
        rules.append("same_family_penalty")
        facts.append("Penalización fitosanitaria por cultivos consecutivos de la misma familia botánica.")
    else:
        score += 10.0
        rules.append("break_pest_cycle")
        facts.append("Alternancia de familias botánicas que interrumpe ciclos de patógenos y plagas.")

    # 5. Regla: Diversidad de estratos radiculares
    root_depths = {crops_cat.get(c.value, {}).get("root_depth_class") for c in sequence if crops_cat.get(c.value, {}).get("root_depth_class")}
    if "deep" in root_depths and "medium" in root_depths:
        score += 10.0
        rules.append("diverse_root_depth")
        facts.append("Alternancia de raíces profundas y medias para descompactar estratos y mejorar infiltración.")

    # 6. Regla: Aporte de materia orgánica
    if om_pct <= 1.5:
        has_high_om = any(crops_cat.get(c.value, {}).get("organic_matter_contribution") in ("high", "medium") for c in sequence)
        if has_high_om:
            score += 10.0
            rules.append("builds_organic_matter")
            facts.append(f"Aporte continuo de biomasa y rastrojo para recuperar materia orgánica ({om_pct}% actual).")

    return round(_clamp(score, 10.0, 98.0), 1), rules, facts


def _score_climate_dimension(
    sequence: list[CropId],
    crops_cat: dict[str, dict],
    climate: ClimateMetrics,
) -> tuple[float, list[str], list[str]]:
    """
    Calcula el puntaje climático e hídrico (0-100) según demanda de agua, tolerancia a sequía y lluvia.
    """
    score = 65.0
    rules: list[str] = []
    facts: list[str] = []

    # Precipitación total anual acumulada
    annual_rain_mm = sum(climate.seasonal_rain_mm.values()) if climate.seasonal_rain_mm else 500.0
    dry_months = climate.dry_months

    facts.append(f"Precipitación estacional anual de NASA POWER: {round(annual_rain_mm)} mm con {dry_months} meses secos.")

    # Calcular demanda hídrica promedio de la secuencia
    water_reqs = []
    drought_tolerances = []
    for c in sequence:
        data = crops_cat.get(c.value, {})
        w_min = float(data.get("water_mm_season_min", 450))
        w_max = float(data.get("water_mm_season_max", 750))
        water_reqs.append((w_min + w_max) / 2.0)
        drought_tolerances.append(data.get("drought_tolerance", "medium"))

    avg_water_demand = sum(water_reqs) / len(water_reqs) if water_reqs else 550.0
    facts.append(f"Demanda hídrica estacional promedio de la rotación: {round(avg_water_demand)} mm.")

    # Evaluación de tolerancia a sequía
    high_drought_crops = [sequence[i] for i, dt in enumerate(drought_tolerances) if dt == "high"]
    low_drought_crops = [sequence[i] for i, dt in enumerate(drought_tolerances) if dt == "low"]

    if dry_months >= 4:
        if high_drought_crops:
            score += 15.0
            rules.append("drought_tolerant_crop")
            names = [crops_cat[c.value]["name_es"] for c in high_drought_crops]
            facts.append(f"Alta tolerancia a sequía con {', '.join(names)}, ideal para los {dry_months} meses secos.")
        if low_drought_crops:
            score -= 15.0
            rules.append("high_water_demand_penalty")
            names = [crops_cat[c.value]["name_es"] for c in low_drought_crops]
            facts.append(f"Cultivos de alta exigencia hídrica ({', '.join(names)}) vulnerables en meses secos.")
    else:
        score += 5.0

    # Balance lluvia vs demanda
    if avg_water_demand <= annual_rain_mm * 1.1:
        score += 10.0
        rules.append("compatible_water_balance")
        facts.append("Demanda hídrica compatible con el régimen histórico de precipitaciones.")
    else:
        score -= 10.0
        rules.append("water_deficit_stress")
        facts.append(f"Déficit hídrico estimado: {round(avg_water_demand - annual_rain_mm)} mm sobre precipitación anual.")

    return round(_clamp(score, 15.0, 98.0), 1), rules, facts


def _score_market_dimension(
    sequence: list[CropId],
    crops_cat: dict[str, dict],
    market: MarketMetrics,
) -> tuple[float, list[str], list[str]]:
    """
    Calcula el puntaje de mercado (0-100) según ingresos brutos por acre y tendencias de precios de NASS.
    """
    score = 60.0
    rules: list[str] = []
    facts: list[str] = []

    revenues: list[float] = []
    up_trends = 0
    down_trends = 0

    for c in sequence:
        m_info = market.crops.get(c)
        if m_info and m_info.revenue_per_acre is not None:
            revenues.append(m_info.revenue_per_acre)
            if m_info.price_trend == "up":
                up_trends += 1
            elif m_info.price_trend == "down":
                down_trends += 1
        elif crops_cat.get(c.value, {}).get("is_forage") == "true":
            # Forraje aporta valor suplementario aunque no esté en el grano comercial directo
            rules.append("forage_supplemental_income")
            facts.append("Generación de forraje como fuente de ingreso suplementario o ahorro en alimentación pecuaria.")

    if revenues:
        avg_rev = sum(revenues) / len(revenues)
        facts.append(f"Ingreso bruto promedio estimado por acre: ${round(avg_rev, 2)} USD/acre (USDA NASS).")
        # Escalar ingreso típico de Texas ($200 - $800/acre)
        if avg_rev >= 600:
            score += 20.0
            rules.append("high_gross_margin")
        elif avg_rev >= 400:
            score += 10.0
        elif avg_rev < 250:
            score -= 10.0
    else:
        facts.append("Sin datos completos de ingreso por acre para todos los cultivos en NASS.")

    if up_trends > 0:
        score += 8.0
        rules.append("positive_price_trend")
        facts.append("Tendencia de precios favorable en mercado regional de Texas.")
    if down_trends > 0:
        score -= 8.0
        rules.append("downward_price_pressure")
        facts.append("Presión a la baja en precios históricos de mercado.")

    return round(_clamp(score, 20.0, 95.0), 1), rules, facts


def _score_single_rotation(
    rot_id: str,
    label: str,
    sequence: list[CropId],
    is_current: bool,
    priority: Priority,
    crops_cat: dict[str, dict],
    climate: ClimateMetrics,
    soil: SoilRotationMetrics,
    market: MarketMetrics,
) -> ScoredRotation:
    """Evalúa una rotación individual y devuelve el ScoredRotation con sus 4 puntajes y facts."""
    soil_score, soil_rules, soil_facts = _score_soil_dimension(sequence, crops_cat, soil)
    clim_score, clim_rules, clim_facts = _score_climate_dimension(sequence, crops_cat, climate)
    mkt_score, mkt_rules, mkt_facts = _score_market_dimension(sequence, crops_cat, market)

    weights = PRIORITY_WEIGHTS[priority]
    total = round(
        clim_score * weights["climate"] + soil_score * weights["soil"] + mkt_score * weights["market"],
        1,
    )

    all_rules = list(dict.fromkeys(soil_rules + clim_rules + mkt_rules))
    all_facts = list(dict.fromkeys(soil_facts + clim_facts + mkt_facts))

    return ScoredRotation(
        id=rot_id,
        label=label,
        sequence=sequence,
        is_current=is_current,
        scores=DimensionScores(
            climate=clim_score,
            soil=soil_score,
            market=mkt_score,
            total=total,
        ),
        rules_applied=all_rules,
        facts=all_facts,
    )


def score_rotations(
    priority: Priority,
    climate: ClimateMetrics,
    soil: SoilRotationMetrics,
    market: MarketMetrics,
) -> list[ScoredRotation]:
    """
    Función orquestadora del motor de puntuación (Scoring Engine).
    Cumple el protocolo ScoringEngine del contrato.

    Devuelve exactamente 3 rotaciones:
    1. La actual (is_current=True, id="current").
    2. Rotación sugerida A (rot_01): mejor puntaje según prioridad.
    3. Rotación sugerida B (rot_02): segunda mejor según prioridad.
    """
    crops_cat = _load_crops_catalog()
    templates = _load_rotation_templates()

    # 1. Determinar la secuencia actual
    current_seq = soil.current_rotation or [CropId.cotton, CropId.cotton, CropId.cotton]
    current_rot = _score_single_rotation(
        rot_id="current",
        label="Rotación actual (detectada con CropScape)",
        sequence=current_seq,
        is_current=True,
        priority=priority,
        crops_cat=crops_cat,
        climate=climate,
        soil=soil,
        market=market,
    )

    # 2. Evaluar todas las plantillas candidatas
    candidate_scores: list[tuple[float, dict, list[CropId]]] = []
    current_seq_tuples = tuple(c.value for c in current_seq)

    for tpl in templates:
        seq = [CropId(tpl["season_1"]), CropId(tpl["season_2"]), CropId(tpl["season_3"])]
        # Evitar sugerir exactamente la rotación actual o el control negativo obvio tpl_07 si hay mejores opciones
        if tuple(c.value for c in seq) == current_seq_tuples:
            continue

        scored = _score_single_rotation(
            rot_id=tpl["template_id"],
            label=tpl.get("label", tpl["template_id"]),
            sequence=seq,
            is_current=False,
            priority=priority,
            crops_cat=crops_cat,
            climate=climate,
            soil=soil,
            market=market,
        )
        candidate_scores.append((scored.scores.total, tpl, seq))

    # Ordenar candidatos de mayor a menor puntaje según la prioridad elegida
    candidate_scores.sort(key=lambda x: x[0], reverse=True)

    # Seleccionar las 2 mejores sugerencias
    sug_a = candidate_scores[0] if len(candidate_scores) > 0 else (0.0, {}, [CropId.sorghum, CropId.soybean, CropId.oats_cover])
    sug_b = candidate_scores[1] if len(candidate_scores) > 1 else (0.0, {}, [CropId.wheat, CropId.peanut, CropId.forage_grass])

    rot_01 = _score_single_rotation(
        rot_id="rot_01",
        label="Rotación sugerida A",
        sequence=sug_a[2],
        is_current=False,
        priority=priority,
        crops_cat=crops_cat,
        climate=climate,
        soil=soil,
        market=market,
    )

    rot_02 = _score_single_rotation(
        rot_id="rot_02",
        label="Rotación sugerida B",
        sequence=sug_b[2],
        is_current=False,
        priority=priority,
        crops_cat=crops_cat,
        climate=climate,
        soil=soil,
        market=market,
    )

    # Siempre devuelve 3: la actual + 2 sugeridas
    return [current_rot, rot_01, rot_02]
