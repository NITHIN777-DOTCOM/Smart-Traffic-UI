"""Step 1: assumed_signals.csv, normalised clips and a blank North clip.

Usage:  .venv/Scripts/python scripts/prepare_media.py [--csv-only] [--force]

Originals in videos/ are only read. Outputs go to bridge/data/ (CSV, committed)
and bridge/out/videos/ (mp4, never committed).
"""
from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge_common import (ARMS, BRIDGE_DIR, load_config, ui_path, assumed_aspects)  # noqa: E402


def write_csv(path: Path, duration_s: float) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = 0
    with open(path, "w", encoding="utf-8", newline="") as stream:
        w = csv.writer(stream, lineterminator="\n")
        w.writerow(["t_s", "west", "east", "south", "note"])
        t = 0
        while t <= duration_s:
            a = assumed_aspects(t)
            w.writerow([t, a["West"], a["East"], a["South"], "assumed"])
            rows += 1
            t += 5
    return rows


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=codec_name,width,height,avg_frame_rate,nb_frames:format=duration",
         "-of", "json", str(path)], capture_output=True, text=True, check=True)
    data = json.loads(out.stdout)
    s = data["streams"][0]
    return {"codec": s["codec_name"], "width": s["width"], "height": s["height"],
            "avg_frame_rate": s["avg_frame_rate"], "nb_frames": int(s.get("nb_frames", 0)),
            "duration_s": float(data["format"]["duration"])}


def normalise(src: Path, dst: Path, w: int, h: int, fps: int, dur: float) -> None:
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-t", f"{dur:.3f}",
           "-vf", f"scale={w}:{h}:flags=bicubic,fps={fps},setsar=1", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", str(dst)]
    subprocess.run(cmd, check=True)


def blank(dst: Path, w: int, h: int, fps: int, dur: float) -> None:
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
           f"color=c=black:s={w}x{h}:r={fps}:d={dur:.3f}", "-an",
           "-c:v", "libx264", "-preset", "medium", "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", str(dst)]
    subprocess.run(cmd, check=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv-only", action="store_true")
    ap.add_argument("--force", action="store_true", help="re-encode even if outputs exist")
    args = ap.parse_args()
    cfg = load_config()
    v = cfg["video"]
    dur = float(v["duration_s"])
    n = write_csv(ui_path(cfg["assumed_signals_csv"]), dur)
    print(f"[media] assumed_signals.csv: {n} rows (0..{dur:.0f} s every 5 s)")
    if args.csv_only:
        return 0
    out_dir = ui_path(cfg["normalised_videos_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {"sources": {}, "outputs": {}}
    for arm in ARMS:
        src = ui_path(cfg["source_videos"][arm])
        dst = out_dir / f"{arm.lower()}.mp4"
        report["sources"][arm] = {"path": str(src), **probe(src)}
        if args.force or not dst.exists():
            print(f"[media] normalising {arm}: {src.name} -> {dst.name}")
            normalise(src, dst, v["width"], v["height"], v["fps"], dur)
        report["outputs"][arm] = {"path": str(dst), **probe(dst)}
    north = out_dir / "north_blank.mp4"
    if args.force or not north.exists():
        print("[media] generating blank North clip")
        blank(north, v["width"], v["height"], v["fps"], dur)
    report["outputs"]["North"] = {"path": str(north), "blank": True, **probe(north)}
    (out_dir / "media_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    for arm, info in report["outputs"].items():
        print(f"[media] {arm}: {info['width']}x{info['height']} {info['avg_frame_rate']} "
              f"{info['nb_frames']} frames {info['duration_s']:.2f} s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
