from pydantic import BaseModel


class SoilOutput(BaseModel):
    recommendedRotation: str
    soilScore: int
    reasons: list[str]