# Reglas Agronómicas de Rotación y Salud del Suelo
**FarmGo · NASA Space Apps Challenge 2026 · Reto Field Shift**
*Responsable: Integrante 3 (Suelo, Rotaciones y Motor de Puntuación)*

Este documento establece las reglas agronómicas basadas en ciencia del suelo y manejo de cultivos para Texas (referencias: Texas A&M AgriLife Extension, USDA-NRCS Soil Health Division y FAO EcoCrop). Estas reglas son la base del motor de puntuación en código y proveen los hechos comprobables (`facts`) y reglas aplicadas (`rules_applied`) que el modelo de lenguaje utiliza para redactar las explicaciones sin inventar datos.

---

## 1. Principios Agronómicos del Sistema

La rotación de cultivos busca romper la degradación del suelo generada por monocultivos intensivos (especialmente algodón y maíz continuos en Texas), optimizar el balance hídrico y devolver materia orgánica al perfil edáfico.

### Regla 1: Ruptura de Ciclos de Plagas y Alternancia de Familias (`family_diversity`)
* **Fundamento:** Cultivos consecutivos de la misma familia botánica multiplican patógenos del suelo, nematodos específicos y plagas de insectos, además de agotar los mismos horizontes de nutrientes.
* **Familias en el catálogo:**
  * **Poaceae (Gramíneas/Cereales):** `corn`, `sorghum`, `wheat`, `oats_cover`, `forage_grass`.
  * **Fabaceae (Leguminosas):** `soybean`, `peanut`.
  * **Malvaceae:** `cotton`.
* **Cálculo en el motor:**
  * Si dos temporadas consecutivas pertenecen a la misma familia (ej. `corn → sorghum` o `cotton → cotton`), se penaliza el puntaje de suelo (-20 pts) y se reporta riesgo fitosanitario.
  * Si las tres temporadas rotan de familia botánica o alternan gramínea con leguminosa/malvácea, se otorga bonificación (+15 pts).
* **Regla aplicada:** `break_pest_cycle` o `same_family_penalty`.

---

### Regla 2: Fijación Biológica de Nitrógeno (`nitrogen_fixation`)
* **Fundamento:** Las leguminosas (`soybean`, `peanut`) forman simbiosis con bacterias *Rhizobium/Bradyrhizobium*, fijando nitrógeno atmosférico ($N_2$). Al incorporarlas en la rotación tras un cultivo altamente demandante de nitrógeno (`corn`, `sorghum`), reducen la dependencia de fertilizantes sintéticos, disminuyen la lixiviación de nitratos y enriquecen la fertilidad biológica residual para la temporada siguiente.
* **Cálculo en el motor:**
  * Incluir al menos una leguminosa en la rotación de 3 temporadas otorga +25 pts en salud del suelo.
  * Si la leguminosa va inmediatamente después de un cereal demandante (`corn` o `sorghum`), se activa la regla sinérgica `legume_after_cereal` (+10 pts adicionales).
* **Regla aplicada:** `nitrogen_fixation`, `legume_after_cereal`.

---

### Regla 3: Cobertura Vegetal y Mitigación de Erosión (`erosion_protection`)
* **Fundamento:** Cultivos como el algodón (`cotton`) o el maní (`peanut`, que se cosecha desenterrando la planta) dejan el suelo completamente desnudo y expuesto al viento y lluvia torrencial durante otoño e invierno en Texas (evidenciado en el satélite por NDVI bajo en meses 10 a 2).
* **Interacción con datos SSURGO:**
  * Si el suelo tiene factor de erodabilidad $K \ge 0.28$ (susceptible a erosión) o pendiente $\ge 1.5\%$:
    * Un monocultivo sin cobertura recibe penalización severa por riesgo de pérdida de la capa arable (-25 pts).
    * La inclusión de un cultivo de cobertura de invierno (`oats_cover`) o cereal invernal (`wheat`) otorga protección activa de la superficie (+20 pts).
* **Regla aplicada:** `winter_cover_crop`, `erosion_mitigation`, `bare_soil_risk`.

---

### Regla 4: Diversidad en la Profundidad Radicular (`root_depth_diversity`)
* **Fundamento:** La alternancia entre cultivos de raíz profunda (`deep`: maíz, sorgo, algodón, pasto forrajero bermuda) y raíz media (`medium`: trigo, avena, soya, maní) evita la formación de piso de arado (compactación), genera bioporos estables que mejoran la conductividad hidráulica y permite la extracción escalonada de agua y nutrientes a distintas profundidades.
* **Cálculo en el motor:**
  * Rotaciones que combinan estrato profundo con estrato medio reciben +10 pts en la dimensión de suelo y activan `diverse_root_depth`.
* **Regla aplicada:** `diverse_root_depth`.

---

### Regla 5: Eficiencia en el Uso del Agua y Resiliencia Hídrica (`water_resilience`)
* **Fundamento:** En regiones de Texas con frecuentes anomalías de sequía y humedad del suelo modelada baja (< 0.25 en capa superficial de POWER):
  * Cultivos con tolerancia alta a sequía y bajo consumo estacional (ej. `sorghum`: 350–550 mm vs `corn`: 500–800 mm o `cotton`: 550–900 mm) permiten estabilizar el rendimiento sin agotar los acuíferos (Ogallala / Edwards).
* **Cálculo en el motor:**
  * En prioridad `Water Saving`, se pondera fuertemente el consumo hídrico acumulado de la secuencia de 3 temporadas frente a la precipitación estacional media histórica.
* **Regla aplicada:** `drought_tolerant_crop`, `high_water_demand_penalty`.

---

### Regla 6: Aporte de Materia Orgánica (`organic_matter_addition`)
* **Fundamento:** Suelos de Texas con materia orgánica $< 1.5\%$ (común en High Plains) sufren baja retención de humedad y escasa estabilidad de agregados. Cultivos con rastrojo denso (`sorghum`, `corn`, `forage_grass`, `oats_cover`) aportan biomasa vegetal fundamental para regenerar carbono orgánico en el suelo, en contraste con el residuo escaso del algodón.
* **Cálculo en el motor:**
  * Si el suelo reporta $\text{OM} \le 1.5\%$, se premian rotaciones con alto aporte de materia orgánica.
* **Regla aplicada:** `builds_organic_matter`.

---

## 2. Matriz de Puntuación de la Dimensión Suelo (0 a 100)

El puntaje base de suelo inicia en **50 puntos** y se modula con las reglas agronómicas:

$$\text{Puntaje Suelo} = \text{Clamp}_{0}^{100}\Big(50 + \Delta_{\text{leguminosa}} + \Delta_{\text{cobertura}} + \Delta_{\text{familia}} + \Delta_{\text{raíces}} + \Delta_{\text{erosión}} + \Delta_{\text{materia\_orgánica}}\Big)$$

| Condición Agronómica | Ajuste en Puntaje | Regla Emitida |
|---|---|---|
| Incluye leguminosa fijadora de $N$ | $+20$ | `nitrogen_fixation` |
| Leguminosa inmediatamente tras cereal | $+10$ | `legume_after_cereal` |
| Incluye cultivo de cobertura invernal | $+15$ | `winter_cover_crop` |
| Suelo susceptible ($K \ge 0.28$) con cobertura | $+10$ adicionales | `erosion_mitigation` |
| Monocultivo o misma familia consecutiva | $-25$ | `same_family_penalty` |
| Suelo susceptible ($K \ge 0.28$) sin cobertura | $-15$ | `bare_soil_risk` |
| Alternancia de profundidades de raíz | $+10$ | `diverse_root_depth` |
| Aporte de materia orgánica en suelo bajo en MO | $+10$ | `builds_organic_matter` |

---

## 3. Generación de Hechos Concretos (`facts`)

Para que el modelo de lenguaje del Integrante 1 cumpla la regla de oro de **no inventar cifras**, el motor de puntuación inyecta hechos agronómicos cuantificados en el campo `facts` de cada `ScoredRotation`:
1. *"Textura del suelo clasificada como {texture} con pendiente de {slope}% y factor K de {erodibility_k}."*
2. *"Materia orgánica del suelo registrada en {om}%."*
3. *"La rotación incorpora fijación biológica de nitrógeno con {legume_name}."*
4. *"La cobertura invernal con {cover_name} protege el suelo en meses de bajo NDVI."*
5. *"Consumo hídrico estimado de la rotación: {water_mm} mm en relación a la precipitación anual de {rain_mm} mm."*

Estos hechos son la única fuente permitida para redactar `why`, `evidence`, `benefits` y `risks`.
