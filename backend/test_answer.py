import asyncio
import traceback

from chatbot import answer, ChatRequest

CASES = [
    ("How much rain does my farm get per month?", 31.5, -100.4),
    ("How have sorghum prices changed in Texas?", None, None),
]


async def main():
    for msg, lat, lon in CASES:
        print(f"\n=== {msg}")
        try:
            r = await answer(ChatRequest(message=msg, lat=lat, lon=lon))
            print("OK:", r.reply[:200])
        except Exception:
            traceback.print_exc()


asyncio.run(main())