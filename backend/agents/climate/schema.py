from pydantic import BaseModel


class ClimateOutput(BaseModel):
    candidateCrops: list[str]
    climateScore: int
    reasons: list[str]