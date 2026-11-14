from agents.climate.tools import get_nasa_power
import json

data = get_nasa_power(31.5, -97.1)
print(data["period"])
print(json.dumps(data["monthly_means"]["T2M"], indent=2))
print("Variables recibidas:", list(data["monthly_means"].keys()))