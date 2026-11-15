# Contratos de FarmGo

Todo el equipo trabaja contra este documento. La **fuente de verdad en código** es
`backend/app/contracts.py`; `frontend/src/types/contracts.ts` es su espejo.
Si necesitas cambiar un formato: avisa al integrante 1 y actualiza **los tres archivos en el mismo PR**.

## Principios

1. Los agentes especializados analizan clima, suelo/rotación y mercado; un juez resume sus resultados.
2. **Los números los calcula el código** (motor de puntuación), nunca el modelo.
3. **No se inventan datos.** Lo que falte queda en `None`/`null` y se anota en `gaps`.
4. La humedad del suelo de NASA POWER es **modelada**, no observada por satélite.
5. Siempre se comparan **3 rotaciones**: la actual y 2 sugeridas.

## Identificadores fijos

- **Cultivos (`CropId`):** `corn`, `cotton`, `sorghum`, `soybean`, `wheat`, `peanut`, `oats_cover`, `forage_grass`
- **Prioridades (`Priority`):** `profit`, `water_saving`, `soil_health`, `balanced`
- **Fincas de ejemplo:** `farm_1`, `farm_2`, `farm_3` (ver `data/farms.json`)
- **Llave de clima:** `county_fips` (5 dígitos). **Suelo y cultivos:** por punto (lat/lon).
- **Petición:** `farm_id` o un par de coordenadas válidas `lat`/`lon`, `priority` y, de forma opcional,
  `current_crops` (cultivos seleccionados del catálogo).

## Pesos por prioridad (propuesta, ajustar en la reunión)

| Prioridad | clima | suelo | mercado |
|---|---|---|---|
| Profit | 0.25 | 0.15 | 0.60 |
| Water Saving | 0.55 | 0.30 | 0.15 |
| Soil Health | 0.20 | 0.60 | 0.20 |
| Balanced | 0.35 | 0.35 | 0.30 |

`total = clima·w_clima + suelo·w_suelo + mercado·w_mercado` (puntajes de 0 a 100).

## Flujo y responsables

```
POST /recommend (RecommendRequest)
   ├─ Si recibe lat/lon: obtiene clima de NASA POWER para ese punto y puntúa
   │  plantillas de data/rotations.csv con perfiles de data/crops.csv.
   ├─ Usa current_crops como línea base de la rotación actual.
   ├─ Usa los CSV estatales de NASS disponibles para una señal de mercado.
   ├─ Para coordenadas, ejecuta los agentes de clima, suelo y mercado, discusión y juez.
   └─ Devuelve 3 rotaciones y, para coordenadas, el informe multiagente (RecommendResponse).
```

`agent_report` contiene los resúmenes y puntajes de cada agente, sus posiciones y desacuerdos
en la discusión, y el veredicto final con nivel de confianza, recomendaciones, datos faltantes
y aspectos que el agricultor debe revisar. Si el juez no está disponible, se presenta un
veredicto preliminar de confianza baja y se indica explícitamente que faltó su revisión.
Las fincas de ejemplo guardadas no ejecutan agentes y devuelven `agent_report: null`.

## Qué recibe y devuelve cada pieza

| Pieza | Entrada | Salida | Modelo |
|---|---|---|---|
| Clima | lat, lon | Resumen histórico del punto | NASA POWER |
| Rotación | prioridad + perfiles | 2 plantillas sugeridas | `data/rotations.csv` y `data/crops.csv` |
| Suelo | características de cultivos | Puntaje potencial de rotación | Reglas de la app; todavía no mide SSURGO en la parcela |
| Mercado | cultivo | Historial estatal disponible | USDA NASS; no es precio local ni margen |
| API | `RecommendRequest` (farm_id o lat/lon, prioridad y current_crops) | `RecommendResponse` | FastAPI |

Para una ubicación marcada, NASA POWER usa las coordenadas del mapa. Los puntajes de suelo se basan
en perfiles preliminares del catálogo, y los de mercado usan archivos NASS estatales cuando existen.
La demo no debe presentarlos como mediciones de suelo ni precios específicos del condado. Si NASA
POWER no está disponible, el frontend muestra el mock de Lubbock e indica que no usó las coordenadas.

Los campos exactos de cada modelo están en `backend/app/contracts.py` (los JSON Schema se generan en `docs/schemas/`).

## Reglas para el modelo de lenguaje

El prompt vive en `prompts/` y exige:

- usar **solo** los datos de `ScoredRotation` (puntajes, `facts`, `rules_applied`);
- **no inventar cifras**: toda cifra en `evidence` debe aparecer en `facts`;
- reportar lo que falte en `gaps`;
- devolver **solo** un JSON que cumpla `LLMOutput`, con una explicación por cada `rotation_id` recibido;
- no cambiar puntajes ni el orden de las rotaciones;
- recordar que la decisión final es del agricultor.

Si la respuesta no valida contra `LLMOutput`, el backend reintenta una vez; si vuelve a fallar, devuelve la
rotación con `why` genérico y `gaps: ["Explicación no disponible"]`.

## Chatbot (`POST /chat`)

Asistente conversacional limitado a temas de cultivos (clima, suelo, rotación y precios) en Texas.
Usa GPT-OSS 20B como filtro de alcance y GPT-OSS 120B con herramientas para responder.

**Petición**
```json
{
  "message": "Is sorghum a good option with little rain?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "lat": 31.5,
  "lon": -100.4,
  "priority": "water_saving",
  "last_verdict": {}
}
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `message` | sí | Mensaje actual del usuario |
| `history` | no | Mensajes previos, SIN incluir el actual. El backend usa los últimos 8 |
| `lat`, `lon` | no | Ubicación de la finca |
| `priority` | no | Mismos valores que `/recommend` (ver "Identificadores fijos") |
| `last_verdict` | no | Último `RecommendResponse` (o su `agent_report`) para que el chat pueda explicarlo |

**Respuesta**
```json
{ "reply": "texto para mostrar en el chat", "in_scope": true }
```

Si `in_scope` es `false`, `reply` ya trae el texto de rechazo y se muestra como cualquier otro mensaje.

**Reglas del chat**
- Solo responde sobre cultivos; lo demás se rechaza.
- Usa únicamente datos de las herramientas o del contexto enviado; no inventa cifras y reporta lo que falte.
- No recalcula puntajes: los números los calcula el motor de puntuación, el chat solo los explica.
- Recuerda que la decisión final es del agricultor.


## Ejemplos

- Petición: `data/mocks/recommend_request.json`
- Respuesta completa: `data/mocks/recommend_farm_1.json` (el integrante 5 construye la UI con esto)

Los mocks se validan automáticamente con `pytest backend/tests`.

## Cómo cambiar un contrato

1. Avisar al integrante 1 en el grupo.
2. Editar `contracts.py`, `contracts.ts`, `contracts.md` y los mocks en el mismo PR.
3. Correr `pytest backend/tests` y `python backend/app/export_schema.py`.
4. Anotar la decisión en `docs/decisiones.md` con fecha y responsable.
