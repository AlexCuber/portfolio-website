"""Builds assets/stars.json for the website's star maps from the star-map project's data.

Reads the HYG v3 star catalogue and Stellarium's constellationship.fab (the same files production_round.py uses)
and keeps only what the browser needs: every star down to magnitude 6.5, plus any fainter star a constellation
line ends on. Stars are [RA degrees, Dec degrees, magnitude]; lines are pairs of indexes into that star list.

usage: python3 tools/build_stars.py [path/to/constellations-project]
"""
import csv
import json
import sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "projects/constellations")
out = Path(__file__).resolve().parent.parent / "assets/stars.json"
MAG_LIMIT = 6.5

# constellation figures: "And 20 677 3092 3092 5447 ..." -> pairs of Hipparcos ids
pairs = []
for line in (src / "constellationship.fab").read_text().splitlines():
    parts = line.split()
    if not parts or line.startswith("#"):
        continue
    ids = [int(x) for x in parts[2:]]
    pairs += [(ids[i], ids[i + 1]) for i in range(0, len(ids) - 1, 2)]
line_hips = {h for p in pairs for h in p}

stars, by_hip = [], {}
with open(src / "hygdata_v3.csv", newline="") as f:
    for row in csv.DictReader(f):
        if row["proper"] == "Sol":
            continue
        mag = float(row["mag"])
        hip = int(row["hip"]) if row["hip"] else None
        if mag > MAG_LIMIT and hip not in line_hips:
            continue
        if hip is not None:
            by_hip[hip] = len(stars)
        stars.append([round(float(row["ra"]) * 15, 3), round(float(row["dec"]), 3), round(mag, 2)])

lines = [[by_hip[a], by_hip[b]] for a, b in pairs if a in by_hip and b in by_hip]
missing = sum(1 for a, b in pairs if a not in by_hip or b not in by_hip)

out.write_text(json.dumps({
    "source": "Stars: HYG database v3 (astronexus, CC BY-SA 2.5). Constellation figures: Stellarium constellationship.fab.",
    "stars": stars,
    "lines": lines,
}, separators=(",", ":")))
print(f"{len(stars)} stars, {len(lines)} constellation lines ({missing} skipped), {out.stat().st_size / 1024:.0f} KB -> {out}")
