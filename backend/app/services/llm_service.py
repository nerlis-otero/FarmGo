from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

def explain_recommendation(
    crop,
    climate_score,
    soil_score,
    market_score
):
    prompt = f"""
    Climate score: {climate_score}
    Soil score: {soil_score}
    Market score: {market_score}

    Recommended crop: {crop}

    Explain in 5 bullet points.

    Do not invent facts.
    Use only the provided data.
    """

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content