# FarmFuture AI

> **NASA Earth Observations & Multi-Agent Intelligence for Resilient Crop Rotation & Soil Health**  
> Developed for the **NASA Space Apps Challenge 2026** · Challenge: *"Field Shift: Adapting Farms with NASA Data"*

---

## Overview

Farmers worldwide face shifting temperatures, irregular rainfall, extreme heat, and degrading soil health. Choosing the right crop rotation is critical to conserve water, restore nutrients, interrupt pest cycles, and ensure long-term farm resilience.

**FarmFuture AI** is a decision-support platform designed for farmers, agronomists, and agricultural extension services. By combining **NASA Earth observations**, **USDA soil databases**, **NASS market economics**, and a collaborative **Multi-Agent AI Debate Pipeline (powered by Groq)**, FarmFuture AI evaluates multi-year rotation scenarios tailored to farmer priorities:

- **Water Saving** — Optimizes drought-hardy crops, reduces seasonal irrigation demand.
- **Soil Health** — Prioritizes legume nitrogen fixation, organic matter enhancement, and erosion control.
- **Profit** — Balances high gross-margin crops with market risk management.
- **Balanced** — Holistically balances soil biology, climate risks, and revenue stability.

---

## System Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 FARMER INPUT / INTERFACE               │
                  │   • Marked Coordinates (Map)                           │
                  │   • Current Crops Planted                              │
                  │   • Priority (Water / Soil / Profit / Balanced)        │
                  └──────────────────────────┬─────────────────────────────┘
                                             │
                       ┌─────────────────────┴────────────────────┐
                       ▼                                          ▼
     ┌───────────────────────────────────┐      ┌───────────────────────────────────┐
     │     NASA & USDA DATA FETCHERS     │      │   DETERMINISTIC SCORING ENGINE    │
     │  • NASA POWER (Solar/Temp/Rain)   │      │  • Multi-factor agronomic scoring │
     │  • USDA SSURGO (Soil SDA API)     │      │  • 3-season rotation comparisons  │
     │  • USDA NASS (Yield & Prices)     │      │  • Rule-based penalty/bonus system│
     └─────────────────┬─────────────────┘      └─────────────────┬─────────────────┘
                       │                                          │
                       └─────────────────────┬────────────────────┘
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │          GROQ MULTI-AGENT COLLABORATIVE SYSTEM         │
                 │                                                        │
                 │   Climate Agent (gpt-oss-20b)                       │
                 │      ↳ Evaluates heat stress, rainfall & drought risk  │
                 │                                                        │
                 │   Soil & Rotation Agent (qwen3.8-27b)               │
                 │      ↳ Analyzes root depth, nitrogen fixation, texture │
                 │                                                        │
                 │   Market Agent (gpt-oss-20b)                        │
                 │      ↳ Projects commodity prices, yields & revenues    │
                 │                                                        │
                 │   Agronomic Judge (gpt-oss-120b)                    │
                 │      ↳ Synthesizes specialist arguments into verdict   │
                 └───────────────────────────┬────────────────────────────┘
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                 FARMER-CENTERED OUTPUT                 │
                 │   • Best Crop to Grow & Best Crop to Sell              │
                 │   • Recommended 3-Season Crop Rotation Sequence        │
                 │   • Scientific Evidence, Benefits & Data Gaps          │
                 │   • Verified Crop Profiles (USDA PLANTS & AgriLife)    │
                 └────────────────────────────────────────────────────────┘
```

---

##  NASA & Scientific Data Integration

| Dataset / Source | Parameters & Variables | Application in FarmFuture AI |
|---|---|---|
| **NASA POWER** *(Agroclimatology)* | `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`, `ALLSKY_SFC_SW_DWN` | Temperature trends, extreme heat events, seasonal rainfall, and root-zone soil moisture indicators. |
| **USDA SSURGO SDA** *(Soil Data Access)* | Soil texture, drainage class, slope %, organic matter %, erodibility factor $K$ | Assesses compaction risk, infiltration capacity, erosion vulnerability, and nutrient holding capacity. |
| **Texas A&M AgriLife & USDA PLANTS** | Verified crop traits: drought tolerance, min/max water (mm), root depth, nitrogen fixation | Validated crop physiological envelopes for Cotton, Sorghum, Corn, Wheat, Soybean, Peanut, and Cover Crops. |
| **USDA NASS QuickStats** | Historical yields, regional commodity prices, price trends | Revenue per acre estimates and gross margin projections under regional market conditions. |

---

## Multi-Agent AI Pipeline

FarmFuture AI goes beyond static statistical scoring by deploying an autonomous multi-agent consultation system:

1. **Climate Specialist Agent:** Analyzes agroclimatic conditions using NASA POWER satellite observations, penalizing water-demanding crops during projected deficit months.
2. **Soil & Rotation Specialist Agent:** Considers the farmer's current crop baseline, organic matter replenishment, and legume-cereal rotation sequences to break pest cycles.
3. **Market Specialist Agent:** Dynamically evaluates gross revenue per acre and market volatility based on the farmer's selected priority.
4. **Independent Agronomic Judge:** Mediates between conflicting specialist priorities (e.g., high-revenue crops that deplete water vs. low-revenue cover crops that restore soil) to produce an actionable, consensus verdict.

---

##  Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Leaflet (interactive geospatial picker), Lucide Icons.
- **Backend:** FastAPI (Python 3.12+), Pydantic v2 (strict contract typing), Uvicorn.
- **LLM Engine:** Groq Cloud API (`openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`).
- **Testing:** Pytest (comprehensive test suite covering scoring formulas, contracts, and fallback safety).

---

##  Installation & Local Setup

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- Groq API Key ([console.groq.com](https://console.groq.com))

### 1. Clone Repository
```bash
git clone https://github.com/nerlis-otero/farmfuture-ai.git
cd farmfuture-ai
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend test suite (20 core tests)
pytest backend/tests/test_soil.py backend/tests/test_scoring.py backend/tests/test_crops.py backend/tests/test_market.py backend/tests/test_contracts.py backend/tests/test_location_analysis.py -v

# Start FastAPI server (Port 8000)
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

##  Limitations & Responsible AI Notice

- **Decision-Support Tool:** FarmFuture AI is designed as a supportive decision tool, **not** a replacement for on-the-ground farmer judgment, soil sample laboratory testing, or local agricultural extension expertise.
- **Satellite & Model Resolution:** Satellite products (such as NASA POWER root-zone soil moisture models) represent regional approximations (0.5° grid cells) and may differ from localized micro-topography.
- **Market Dynamics:** Prices and yields are based on regional USDA NASS state-level baselines; localized contract pricing and direct input costs (fertilizer, seed, diesel) should be verified locally.

---

## Team & Acknowledgments

**Team:**
- **Nerlis Otero**
- **Elian Daniel Perea Vanegas**
- **Josh Ortega**
- **Dayana Narváez**
- **Gabriel Gonzales**

*Universidad Tecnológica de Bolívar (UTB) — NASA Space Apps Challenge 2026*

**Special Acknowledgments:**
- **NASA Earth Science Division** & NASA POWER Project for accessible open-access Earth observations.
- **USDA NRCS & USDA NASS** for open soil and agronomic datasets.
- **Texas A&M AgriLife Extension** for crop management guidelines.
