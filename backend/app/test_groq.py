from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

prompt = f"""
You are an agricultural advisor.

Climate score: 88
Soil score: 81
Market score: 77

Recommended crop: Corn

Explain ONLY why this crop was recommended.

Use maximum 5 bullet points.

Do not invent agronomic recommendations.
Do not invent varieties.
Do not invent numbers.
Use only the information provided.

"""

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=[
        {
            "role": "user",
            "content": prompt
        }
    ]
)

print(response.choices[0].message.content)