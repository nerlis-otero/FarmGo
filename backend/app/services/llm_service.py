"""
FarmGo - Servicio de Explicación y LLM (Groq / IA Existente).
Responsable: Integrante 1 (Tech Lead) integrado al pipeline del MVP.

Regla de oro:
- Los números los calcula el código, no el modelo.
- El modelo usa solo los datos recibidos (facts y rules_applied), no inventa cifras y reporta faltantes en gaps.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.contracts import Priority, RotationResult, ScoredRotation
logger = logging.getLogger(__name__)

# Intentar inicializar cliente Groq si existe la clave en el entorno
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
_groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        _groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as exc:
        logger.warning(f"No se pudo inicializar Groq client: {exc}")


def _generate_rule_based_explanation(priority: Priority, r: ScoredRotation) -> dict:
    """Generador agronómico determinista que cumple el contrato sin inventar datos."""
    rules = set(r.rules_applied)
    seq_names = [c.value.replace("_", " ").title() for c in r.sequence]
    seq_str = " → ".join(seq_names)

    # Construcción de 'why'
    if r.is_current:
        why = f"Rotación actual ({seq_str}): representa la práctica histórica registrada en la parcela."
        if "same_family_penalty" in rules:
            why += " Presenta riesgo por continuidad de la misma familia botánica sin descanso del suelo."
        elif "bare_soil_risk" in rules:
            why += " Deja el suelo expuesto a la intemperie en periodos críticos de bajo NDVI."
    else:
        reasons = []
        if "nitrogen_fixation" in rules:
            reasons.append("incorpora una leguminosa para fijar nitrógeno biológico")
        if "winter_cover_crop" in rules or "erosion_mitigation" in rules:
            reasons.append("protege el suelo contra la erosión en los meses fríos")
        if "drought_tolerant_crop" in rules:
            reasons.append("incluye cultivos de alta tolerancia a sequía para ahorrar agua")
        if "break_pest_cycle" in rules:
            reasons.append("alterna familias botánicas para interrumpir el ciclo de plagas")

        if reasons:
            why = f"Sugerida para {priority.value}: " + ", ".join(reasons) + "."
        else:
            why = f"Sugerida para {priority.value}: optimiza el equilibrio entre suelo, clima y mercado regional."

    # Evidence: toma hechos reales con cifras cuantificadas de r.facts
    evidence = [f for f in r.facts if any(k in f for k in ["mm", "%", "K=", "$", "NASA", "SSURGO", "meses"])][:3]
    if not evidence and r.facts:
        evidence = r.facts[:2]

    # Benefits
    benefits: list[str] = []
    if "nitrogen_fixation" in rules:
        benefits.append("Aporte de nitrógeno biológico que reduce la dependencia de fertilizantes sintéticos.")
    if "winter_cover_crop" in rules or "erosion_mitigation" in rules:
        benefits.append("Cobertura vegetal activa que previene la pérdida de suelo por viento y lluvia.")
    if "drought_tolerant_crop" in rules:
        benefits.append("Menor requerimiento hídrico durante la temporada de crecimiento.")
    if "diverse_root_depth" in rules:
        benefits.append("Descompactación del suelo y mejor infiltración por alternancia de raíces profundas y medias.")
    if "high_gross_margin" in rules:
        benefits.append("Mayor margen bruto estimado por acre según rendimientos históricos.")
    if not benefits:
        benefits.append("Diversificación del riesgo agronómico y comercial en la parcela.")

    # Gaps
    gaps = [
        "No se conoce el sistema de riego específico (goteo, aspersión o secano) de la parcela.",
        "Los precios y rendimientos son promedios estatales de Texas, no específicos del condado.",
    ]

    # Risks
    risks = [
        "Revisar fechas de siembra y disponibilidad de semilla con la extensión agrícola local (Texas A&M AgriLife).",
        "Confirmar compatibilidad de maquinaria para la siembra y cosecha de la secuencia.",
    ]

    return {
        "why": why,
        "evidence": evidence,
        "benefits": benefits,
        "gaps": gaps,
        "risks": risks,
    }


def explain_rotations(
    priority: Priority,
    rotations: list[ScoredRotation],
) -> list[RotationResult]:
    """
    Función orquestadora del componente Explainer.
    Recibe las rotaciones con sus puntajes y hechos, y devuelve la lista de RotationResult.
    """
    results: list[RotationResult] = []

    for r in rotations:
        # Por defecto generamos la explicación agronómica garantizada con facts reales
        exp = _generate_rule_based_explanation(priority, r)

        # Si Groq está configurado, podemos invocar al LLM para enriquecer la redacción
        if _groq_client:
            try:
                prompt = f"""
                Eres un agrónomo experto de Texas A&M AgriLife. Redacta una explicación concisa para un agricultor.
                Prioridad elegida: {priority.value}
                Rotación: {[c.value for c in r.sequence]} (is_current: {r.is_current})
                Puntajes: Clima={r.scores.climate}, Suelo={r.scores.soil}, Mercado={r.scores.market}, Total={r.scores.total}
                Reglas aplicadas: {r.rules_applied}
                Hechos objetivos (USA SOLO ESTOS DATOS, NO INVENTES CIFRAS):
                {json.dumps(r.facts, ensure_ascii=False)}

                Responde estrictamente con un JSON con las claves:
                - "why": resumen en 1 o 2 oraciones de por qué se recomienda o qué caracteriza esta rotación.
                - "evidence": lista de 2 o 3 hechos concretos tomados de los datos.
                - "benefits": lista de 2 o 3 beneficios agronómicos o económicos.
                """
                response = _groq_client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
                content = json.loads(response.choices[0].message.content)
                if "why" in content and isinstance(content["why"], str):
                    exp["why"] = content["why"]
                if "evidence" in content and isinstance(content["evidence"], list) and content["evidence"]:
                    exp["evidence"] = [str(x) for x in content["evidence"][:3]]
                if "benefits" in content and isinstance(content["benefits"], list) and content["benefits"]:
                    exp["benefits"] = [str(x) for x in content["benefits"][:3]]
            except Exception as exc:
                logger.info(f"Groq API no disponible o respuesta no válida ({exc}), usando explicación agronómica estándar.")

        results.append(
            RotationResult(
                id=r.id,
                label=r.label,
                sequence=r.sequence,
                is_current=r.is_current,
                scores=r.scores,
                why=exp["why"],
                evidence=exp["evidence"],
                benefits=exp["benefits"],
                gaps=exp["gaps"],
                risks=exp["risks"],
            )
        )

    return results


# Mantener compatibilidad hacia atrás con el código que escribió el compañero
def explain_recommendation(crop, climate_score, soil_score, market_score):
    if _groq_client:
        prompt = f"""
        Climate score: {climate_score}
        Soil score: {soil_score}
        Market score: {market_score}
        Recommended crop: {crop}
        Explain in 5 bullet points. Do not invent facts. Use only the provided data.
        """
        response = _groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    return f"Recomendación para {crop}: puntaje clima {climate_score}, suelo {soil_score}, mercado {market_score}."
