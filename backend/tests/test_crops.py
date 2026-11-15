import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend" / "app"))

from contracts import CropId  # noqa: E402


def read(name):
    with open(ROOT / "data" / name, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_crops_match_contract():
    ids = {r["crop_id"] for r in read("crops.csv")}
    assert ids == {c.value for c in CropId}


def test_rotations_use_valid_crops():
    ids = {c.value for c in CropId}
    for r in read("rotations.csv"):
        for k in ("season_1", "season_2", "season_3"):
            assert r[k] in ids, r["template_id"]