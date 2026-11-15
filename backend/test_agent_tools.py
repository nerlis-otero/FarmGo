from agents.climate.tools import TOOLS
from shared.config import MODEL_FAST
from shared.groq_client import get_client

resp = get_client().chat.completions.create(
    model=MODEL_FAST,
    messages=[{"role": "user", "content": "Necesito el NDVI de MODIS (vegetación) para lat 31.5, lon -97.1."}],
    tools=TOOLS,
    tool_choice="auto",
)
calls = resp.choices[0].message.tool_calls or []
print([c.function.name for c in calls])