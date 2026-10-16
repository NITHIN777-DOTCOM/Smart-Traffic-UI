"""Check that the UI's original clips, the normalised replay clips and the timelines line up.

For each arm and each probe time t (0, 300, 590 s) it grabs the frame at t from the original
clip (what the UI plays) and compares it with the normalised clip (what perception saw) at
t + offset for offsets -1..+1 s. Alignment holds when the best match is offset 0.
It also prints the signal state of both timelines at t from public/data.

    .venv/Scripts/python scripts/check_alignment.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge_common import ARMS, load_config, ui_path  # noqa: E402

PROBES = (0.0, 300.0, 590.0)
OFFSETS = (-1.0, -0.5, -0.2, 0.0, 0.2, 0.5, 1.0)


def frame_at(path: Path, t: float, size=(320, 180)) -> np.ndarray | None:
    """Frame shown at presentation time t, via ffmpeg's accurate seek (as a browser seeks)."""
    w, h = size
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{max(0.0, t):.3f}", "-i", str(path), "-frames:v", "1",
           "-vf", f"scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=False).stdout
    if len(raw) != w * h:
        return None
    return np.frombuffer(raw, dtype=np.uint8).reshape(h, w).astype(np.float32)


def state_at(timeline: list[dict], t: float) -> str:
    seg = [d for d in timeline if d["t"] <= t + 1e-6][-1]
    e = t - seg["t"]
    y, r = seg.get("yellowS", 3), seg.get("allRedS", 2)
    if e < seg["durationS"] or (y == 0 and r == 0):
        return f"green {'+'.join(seg['arms'])}"
    if e < seg["durationS"] + y:
        return f"yellow {'+'.join(seg['arms'])}"
    return "all-red"


def main() -> int:
    cfg = load_config()
    out = ui_path(cfg["normalised_videos_dir"])
    data = ui_path(cfg["ui_data_dir"])
    ok = True
    report = []
    for arm in ARMS:
        orig = ui_path(cfg["source_videos"][arm])
        norm = out / f"{arm.lower()}.mp4"
        for t in PROBES:
            ref = frame_at(orig, t)
            diffs = {}
            for off in OFFSETS:
                f = frame_at(norm, t + off)
                if ref is not None and f is not None:
                    diffs[off] = float(np.mean(np.abs(ref - f)))
            # Ties (e.g. t=0, where negative offsets clamp to 0) resolve to the smallest offset.
            best = min(diffs, key=lambda k: (round(diffs[k], 6), abs(k))) if diffs else None
            aligned = best == 0.0
            ok &= aligned
            line = (f"{arm:5s} t={t:5.0f}s best offset={best:+.1f}s  diff@0={diffs.get(0.0, float('nan')):.2f}  "
                    + " ".join(f"{k:+.1f}:{v:.1f}" for k, v in diffs.items()))
            print(line)
            report.append({"arm": arm, "t": t, "best_offset_s": best, "mean_abs_diff": diffs, "aligned": aligned})
    for mode in ("ppo", "round_robin"):
        p = data / f"{mode}_timeline.json"
        if p.is_file():
            tl = json.loads(p.read_text(encoding="utf-8"))
            states = {t: state_at(tl["timeline"], t) for t in PROBES}
            print(f"{mode:12s} processed {tl['processedS']} s; signals at probes: {states}")
            report.append({"mode": mode, "processedS": tl["processedS"], "states": states})
    (out / "alignment_report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print("ALIGNED" if ok else "MISALIGNED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
