# FarmFuture AI

**Recomendación de cultivos y rotación para agricultores de Texas, combinando datos de la NASA, suelo, clima y mercado.**

Proyecto para el reto **"Field Shift: Adapting Farms with NASA Data"** — NASA Space Apps Challenge 2026.

---

## ¿Qué hace?

El agricultor comparte su ubicación y elige qué quiere priorizar. FarmFuture AI analiza clima, suelo y mercado con tres agentes especializados y entrega una recomendación clara y explicada:

- **Mejor cultivo para sembrar**
- **Mejor cultivo para vender**
- **Rotación recomendada**
- **Mejor cultivo en general**

**Prioridades disponibles:** `Profit` · `Water Saving` · `Soil Health` · `Balanced`

---

## Arquitectura

```
 NASA POWER · GPM/IMERG · SMAP        SSURGO · CropScape · SMAP        USDA AMS · NASS QuickStats
              │                                  │                                 │
              ▼                                  ▼                                 ▼
         Climate Agent                 Soil & Rotation Agent                 Market Agent
              │                                  │                                 │
              └──────────────────────┬───────────┴─────────────────────────────────┘
                                     ▼
                            Recommendation Engine
                       (no consulta bases de datos)
                                     │
                                     ▼
                           Recomendación final
```

SMAP (humedad del suelo) se comparte entre el Climate Agent y el Soil & Rotation Agent, por lo que se consulta una sola vez.

### Climate Agent
**Pregunta:** ¿Qué cultivos son viables con el clima actual e histórico?

| Fuente | Datos |
|---|---|
| NASA POWER | Temperatura, humedad, radiación solar, variables agroclimáticas |
| GPM / IMERG | Precipitación histórica y tendencias de lluvia |
| SMAP | Humedad del suelo |

```json
{
  "candidateCrops": ["Sorghum", "Cotton", "Wheat"],
  "climateScore": 91,
  "reasons": ["High drought tolerance", "Compatible with rainfall trends"]
}
```

### Soil & Rotation Agent
**Pregunta:** ¿Qué rotación mejora la salud del suelo?

| Fuente | Datos |
|---|---|
| SSURGO | Tipo de suelo, drenaje, capacidad productiva |
| CropScape (CDL) | Cultivos históricos y uso agrícola de la zona |
| SMAP | Humedad del suelo |

```json
{
  "recommendedRotation": "Corn → Soybean",
  "soilScore": 89,
  "reasons": ["Nitrogen fixation", "Reduces soil depletion"]
}
```

### Market Agent
**Pregunta:** ¿Qué cultivo será más rentable en la cosecha?

| Fuente | Datos |
|---|---|
| USDA AMS Market News | Precios actuales, tendencias, mercados regionales |
| USDA NASS QuickStats | Producción, rendimientos, histórico de precios |

```json
{
  "bestMarketCrop": "Cotton",
  "marketScore": 87,
  "reasons": ["Positive price trend", "Strong regional demand"]
}
```

### Recommendation Engine
Recibe **únicamente** las salidas de los tres agentes, junto con la prioridad elegida por el usuario, y combina los puntajes según esa prioridad.

```json
// Entrada
{
  "priority": "Water Saving",
  "crops": {
    "Sorghum": { "climate": 91, "soil": 89, "market": 74 },
    "Cotton":  { "climate": 78, "soil": 70, "market": 87 }
  }
}

// Salida
{
  "bestCropToGrow": "Sorghum",
  "bestCropToSell": "Cotton",
  "recommendedRotation": "Corn → Soybean",
  "bestOverallCrop": "Sorghum"
}
```

> Los valores de los ejemplos son ilustrativos.

---

## Ejecución

```bash
git clone https://github.com/nerlis-otero/farmfuture-ai.git
cd farmfuture-ai
# [COMPLETAR] instalación y ejecución
```

---

## Limitaciones

- Es una **guía de apoyo**, no una garantía ni un reemplazo del criterio del agricultor o de un agrónomo.
- Los **precios** se publican por producto y mercado, no por condado, y no incluyen costos de producción completos: el margen es una estimación.
- Algunos datos satelitales (por ejemplo SMAP) tienen **resolución gruesa** y no capturan cada parcela al detalle.
- El prototipo se centra en `[COMPLETAR: región de Texas]`.

---

##  Equipo y licencia

`[COMPLETAR: integrantes, sede/equipo y licencia]`

Agradecimientos: NASA y sus socios por los datos abiertos, USDA (NASS, AMS, NRCS) y los organizadores de la NASA Space Apps Challenge.
