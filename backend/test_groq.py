import asyncio

from chatbot import client, MAIN_MODEL, GATE_MODEL, TOOLS

MSGS = [
    {"role": "system", "content": "You are a test."},
    {"role": "user", "content": "How have sorghum prices changed in Texas?"},
]


async def attempt(label, **kwargs):
    try:
        r = await client.chat.completions.create(
            messages=MSGS, reasoning_effort="low", max_completion_tokens=500, **kwargs
        )
        m = r.choices[0].message
        print(f"[{label}] OK finish={r.choices[0].finish_reason} tools={[t.function.name for t in (m.tool_calls or [])]}")
    except Exception as e:
        print(f"[{label}] FAIL {type(e).__name__}: {str(e)[:600]}")


async def main():
    await attempt("20B sin tools", model=GATE_MODEL)
    await attempt("120B sin tools", model=MAIN_MODEL)
    await attempt("120B con tools", model=MAIN_MODEL, tools=TOOLS, tool_choice="auto")


asyncio.run(main())