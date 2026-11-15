# FarmFuture AI frontend

An English-language interface for comparing crop rotations on Texas farms. The app uses the
`POST /recommend` backend endpoint and follows the current recommendation contract. A marked
location is sent to NASA POWER for historical climate data; if that service is unavailable, the
frontend uses the saved Lubbock demo response and labels it as a fallback.

## Run locally

```bash
# Install backend dependencies from the repository root
python -m pip install -r backend/requirements.txt

# Terminal 1, from the repository root
python -m uvicorn app.main:app --reload --port 8000 --app-dir backend

# Terminal 2, from frontend/
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), mark a location, and choose a goal. The backend
uses three years of NASA POWER history for the selected coordinates and recalculates rotation scores
for the selected priority. The crop question loads its options from `data/crops.csv`. If the farmer
already grows crops, those crop IDs are sent with the recommendation request and used for the
current-crop baseline; the app then looks for a crop to rotate in from a different plant family.

Soil scores use draft crop-rotation traits, not measurements from the selected field. Market scores
use Texas-wide USDA NASS data where available and do not include production costs. If NASA POWER is
unavailable, the app clearly falls back to saved Lubbock examples. Crop profiles are still a draft,
so results are not farm-specific agronomic advice. The Next.js server proxies API requests, so the
browser does not need direct access to the backend. Set `FARMFUTURE_API_URL` if the backend is
running at a different address; the default is `http://127.0.0.1:8000`.

## Validation

```bash
npm run lint
npm run build
```
