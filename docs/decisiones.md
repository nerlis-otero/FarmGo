# Registro de Decisiones de FarmFuture AI

Este documento registra los acuerdos técnicos y decisiones de diseño tomadas por el equipo para mantener sincronía sin colisiones.

---

### [2026-11-14] Conexión Integral del Pipeline Backend (/recommend)
* **Responsable:** Integrante 3 (en apoyo a la integración completa del backend).
* **Decisiones adoptadas:**
  1. **Servicio de Clima (`climate_service.py`):**
     * Conecta con la extracción de NASA POWER de `agents/climate/tools.py` para devolver `ClimateMetrics`.
     * Incluye datos históricos de referencia de NASA POWER para las 3 fincas fijas y Texas en caso de que la API de NASA esté lenta o sin conexión.
  2. **Servicio de Suelo y CropScape (`soil_service.py`):**
     * Integra SSURGO (Soil Data Access de USDA) y el historial CDL de CropScape con fallback local para `farm_1`, `farm_2`, `farm_3`.
  3. **Servicio de Mercado (`market_service.py`):**
     * Se añadió compatibilidad estándar (fallback automático a `csv.DictReader` si `pandas` no está instalado en el entorno de ejecución) para garantizar que los tests y la API nunca fallen.
  4. **Motor de Puntuación (`scoring_service.py`):**
     * Implementa las 6 reglas agronómicas de `docs/reglas_suelo.md` y pondera según `PRIORITY_WEIGHTS[priority]`.
     * Retorna siempre exactamente 3 rotaciones evaluadas (`current`, `rot_01`, `rot_02`).
  5. **Servicio de Explicaciones LLM (`llm_service.py`):**
     * Genera `RotationResult` completo con `why`, `evidence`, `benefits`, `gaps` y `risks`.
     * Extrae hechos numéricos de los `facts` y reglas aplicadas sin inventar datos (Regla de oro de la NASA).
     * Soporta Groq API cuando `GROQ_API_KEY` está configurado.
  6. **Endpoint Principal (`main.py` -> `POST /recommend`):**
     * Reemplazó los mocks estáticos por la llamada end-to-end real a los 4 módulos, manteniendo un fallback de respaldo ante contingencias.
