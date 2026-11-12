"""Build readable first-paint WebP assets; the uploaded JPEGs stay unchanged."""
import sys
from pathlib import Path
from PIL import Image

site = Path(__file__).resolve().parents[1] / "workbuddy" / "site"
output = site / "score-preview"
output.mkdir(exist_ok=True)
for score_id in map(int, sys.argv[1:]):
    with Image.open(site / "assets" / "tabs" / f"{score_id}.jpg") as source:
        preview = source.convert("L")
        preview.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
        path = output / f"{score_id}.webp"
        preview.save(path, "WEBP", quality=76, method=6)
        print(score_id, source.size, preview.size, path.stat().st_size)
