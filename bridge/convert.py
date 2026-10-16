"""Convert the latest replay runs into the UI's static data (public/data/*.json).

    .venv/Scripts/python convert.py [--ppo-run DIR] [--rr-run DIR] [--allow-partial]

Reads the newest bridge/out/ppo_* and bridge/out/round_robin_* run folders (trace.jsonl
+ manifest.json) and writes:

  ppo_timeline.json, round_robin_timeline.json  signal segments in clip seconds
                                                (arms: Arm[]), decisions, queue/vehicle series
  observed_metrics.json                         "Observed on Chennai footage"
  simulation_metrics.json                       "Simulation (SUMO)", cited from the PPO repo
  run_info.json                                 model, reward label, provisional flag, ...

Only real run output is converted. Nothing here invents model decisions.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from bridge_common import (ARMS, ASSUMED_LABEL, BRIDGE_DIR, CYCLE, GREEN_S, SLOT_S, YELLOW_S, ALL_RED_S,
                           load_config, ppo_app, ui_path)

LOWER = {a: a.lower() for a in ARMS}
OBSERVED_LABEL = "Observed on Chennai footage"
SIMULATION_LABEL = "Simulation (SUMO)"
PROVISIONAL_LABEL = "Provisional — old-reward model"


# ---------------------------------------------------------------------------- runs
def find_runs(out_dir: Path, mode: str) -> list[Path]:
    runs = [p for p in out_dir.glob(f"{mode}_*") if (p / "manifest.json").is_file()]
    return sorted(runs, key=lambda p: p.name)


def is_full(manifest: dict, clip_s: float) -> bool:
    clip = manifest.get("clip", {})
    return bool(clip.get("reached_eof")) or float(clip.get("processed_until_s", 0)) >= clip_s - 1.0


def latest_run(out_dir: Path, mode: str, clip_s: float, allow_partial: bool) -> Path:
    runs = find_runs(out_dir, mode)
    full = [r for r in runs if is_full(load_manifest(r), clip_s)]
    # Partial (smoke) runs are only used when asked for and no full run exists.
    pick = full or (runs if allow_partial else [])
    if not pick:
        raise SystemExit(f"no {'' if allow_partial else 'full-clip '}{mode} run in {out_dir}"
                         + ("" if allow_partial else " (use --allow-partial for a smoke run)"))
    return pick[-1]


def load_manifest(run: Path) -> dict:
    return json.loads((run / "manifest.json").read_text(encoding="utf-8"))


def load_trace(run: Path) -> list[dict]:
    with open(run / "trace.jsonl", encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


# ---------------------------------------------------------------------- segments
def _arms(names) -> list[str]:
    return [LOWER[n] for n in ARMS if n in names]


def ppo_segments(decisions: list[dict], clip_s: float, initial_arms: list[str],
                 initial_phase: str, yellow_s: float, all_red_s: float) -> list[dict]:
    """Signal segments from PPO decisions under the bridge cadence.

    A switch at decision time d ends the running green at d, shows yellow
    [d, d+yellow), all-red [d+yellow, d+yellow+all_red) and starts the new green after.
    Choosing the running phase again extends the green (no yellow).
    """
    segs: list[dict] = []
    cur = {"t": 0.0, "arms": list(initial_arms), "phase": initial_phase, "decisionT": None,
           "source": "assumed_initial_state", "extendedAt": [], "decision": None}
    for d in decisions:
        dec = d["decision"]
        if dec.get("error") or not dec.get("switch"):
            cur["extendedAt"].append(d["t_s"])
            if cur["decision"] is None:
                cur["decision"] = dec
            continue
        cur.update(durationS=round(d["t_s"] - cur["t"], 3), yellowS=yellow_s, allRedS=all_red_s)
        segs.append(cur)
        cur = {"t": round(d["t_s"] + yellow_s + all_red_s, 3), "arms": _arms(dec["phase_green_arms"]),
               "phase": dec["governed_phase"], "decisionT": d["t_s"], "source": "ppo_decision",
               "extendedAt": [], "decision": dec}
    cur.update(durationS=round(max(0.0, clip_s - cur["t"]), 3), yellowS=0.0, allRedS=0.0)
    segs.append(cur)
    return segs


def round_robin_segments(clip_s: float) -> list[dict]:
    """Segments of the assumed West -> East -> South cycle (25 s green + 3 s + 2 s)."""
    segs = []
    k = 0
    while k * SLOT_S < clip_s:
        arm = CYCLE[k % len(CYCLE)]
        t = k * SLOT_S
        segs.append({"t": t, "arms": [LOWER[arm]], "phase": None, "decisionT": t,
                     "source": "assumed_signals.csv", "extendedAt": [], "decision": None,
                     "durationS": min(GREEN_S, clip_s - t), "yellowS": YELLOW_S, "allRedS": ALL_RED_S})
        k += 1
    return segs


def row_at(rows: list[dict], t: float) -> dict:
    """Last trace row at or before t (rows sorted by t_s)."""
    best = rows[0]
    for r in rows:
        if r["t_s"] <= t + 1e-6:
            best = r
        else:
            break
    return best


def window_mean(rows: list[dict], t0: float, t1: float, getter) -> dict:
    sel = [r for r in rows if t0 - 1e-6 <= r["t_s"] < t1 - 1e-6] or [row_at(rows, t0)]
    return {LOWER[a]: round(sum(getter(r)[a] for r in sel) / len(sel), 2) for a in ARMS}


def to_ui_decisions(segs: list[dict], rows: list[dict]) -> list[dict]:
    """UI `Decision` objects: one per green segment, queue/vehicles at its decision time."""
    out = []
    for s in segs:
        at = s["decisionT"] if s["decisionT"] is not None else s["t"]
        r = row_at(rows, at)
        dec = s["decision"] or {}
        item = {
            "t": s["t"],
            "arms": s["arms"],
            "signal": "green",
            "durationS": s["durationS"],
            "yellowS": s["yellowS"],
            "allRedS": s["allRedS"],
            "queue": {LOWER[a]: r["queue"]["approx_vehicles"][a] for a in ARMS},
            "vehicles": {LOWER[a]: r["vehicles"]["detections"][a] for a in ARMS},
            "decisionT": s["decisionT"],
            "source": s["source"],
        }
        if s["phase"]:
            item["phase"] = s["phase"]
        if s["extendedAt"]:
            item["extendedAt"] = s["extendedAt"]
        if dec.get("controller") == "ppo":
            item["proposedPhase"] = dec["proposed_phase"]
            item["override"] = dec["override"]
            item["overrideRule"] = dec["override_rule"]
            item["requestedDurationS"] = dec["requested_duration_s"]
        out.append(item)
    return out


def series(rows: list[dict], clip_s: float, step: float = 5.0) -> list[dict]:
    out = []
    t = 0.0
    while t < clip_s - 1e-6:
        sel = [r for r in rows if t - 1e-6 <= r["t_s"] < t + step - 1e-6]
        if sel:
            out.append({
                "t": t,
                "queue": {LOWER[a]: round(sum(r["queue"]["approx_vehicles"][a] for r in sel) / len(sel), 2)
                          for a in ARMS},
                "queueNormalised": {LOWER[a]: round(sum(r["queue"]["normalised"][a] for r in sel) / len(sel), 4)
                                    for a in ARMS},
                "vehicles": {LOWER[a]: round(sum(r["vehicles"]["detections"][a] for r in sel) / len(sel), 2)
                             for a in ARMS},
            })
        t += step
    return out


# ----------------------------------------------------------------------- metrics
def aspect_shares(rows: list[dict], end_s: float) -> dict:
    """Time-weighted green/yellow/red share per arm from the trace's actual aspects."""
    acc = {a: Counter() for a in ARMS}
    total = 0.0
    for i, r in enumerate(rows):
        nxt = rows[i + 1]["t_s"] if i + 1 < len(rows) else end_s
        dt = max(0.0, nxt - r["t_s"])
        total += dt
        for a in ARMS:
            acc[a][r["aspects"][a]] += dt
    return {LOWER[a]: {s: round(acc[a][s] / total, 4) if total else 0.0 for s in ("green", "yellow", "red")}
            for a in ARMS}


def perception_summary(rows: list[dict], manifest: dict) -> dict:
    out = {}
    for a in ARMS:
        det = [r["vehicles"]["detections"][a] for r in rows]
        q = [r["queue"]["approx_vehicles"][a] for r in rows]
        out[LOWER[a]] = {
            "meanInView": round(sum(det) / len(det), 2) if det else 0.0,
            "maxInView": max(det) if det else 0,
            "uniqueTracks": manifest.get("unique_tracks", {}).get(a),
            "meanQueueApprox": round(sum(q) / len(q), 2) if q else 0.0,
        }
    return out


def controller_metrics(rows: list[dict], manifest: dict, segs: list[dict], mode: str) -> dict:
    end_s = float(manifest["clip"]["processed_until_s"]) + (rows[1]["t_s"] - rows[0]["t_s"] if len(rows) > 1 else 0)
    hours = end_s / 3600.0
    decision_rows = [r for r in rows if r["decision_point"]]
    if mode == "ppo":
        switches = sum(1 for r in decision_rows if r["decision"].get("switch") and not r["decision"].get("error"))
    else:
        switches = max(0, len(segs) - 1)
    m = {
        "durationS": round(end_s, 1),
        "decisions": len(decision_rows),
        "switches": switches,
        "switchesPerH": round(switches / hours, 1) if hours else 0.0,
        "share": aspect_shares(rows, end_s),
        "latencyMs": manifest.get("latency_ms"),
    }
    if mode == "ppo":
        decs = [r["decision"] for r in decision_rows]
        m.update({
            "extensions": sum(1 for d in decs if not d.get("switch")),
            "governorOverrides": sum(1 for d in decs if d.get("override")),
            "governorActionChanged": sum(1 for d in decs if d.get("action_changed")),
            "governorRules": dict(Counter(d["override_rule"] for d in decs if d.get("override_rule"))),
            "durationRequestsS": {str(int(k)): v for k, v in
                                  sorted(Counter(d["requested_duration_s"] for d in decs).items())},
            "proposedPhases": dict(Counter(d["proposed_phase"] for d in decs)),
            "governedPhases": dict(Counter(d["governed_phase"] for d in decs)),
            "decisionLog": [{"t": r["t_s"], "proposed": r["decision"]["proposed_phase"],
                             "governed": r["decision"]["governed_phase"],
                             "greenArms": _arms(r["decision"]["phase_green_arms"]),
                             "switch": r["decision"]["switch"], "override": r["decision"]["override"],
                             "rule": r["decision"]["override_rule"],
                             "requestedDurationS": r["decision"]["requested_duration_s"]}
                            for r in decision_rows],
        })
    else:
        m["signalTiming"] = ASSUMED_LABEL
    return m


# -------------------------------------------------------------------- simulation
def parse_md_table(text: str, heading: str | None = None) -> list[dict]:
    if heading:
        idx = text.find(heading)
        if idx < 0:
            raise ValueError(f"heading {heading!r} not found")
        text = text[idx:]
    lines = [ln.strip() for ln in text.splitlines()]
    start = next(i for i, ln in enumerate(lines) if ln.startswith("|"))
    block = []
    for ln in lines[start:]:
        if not ln.startswith("|"):
            break
        block.append([c.strip() for c in ln.strip("|").split("|")])
    header, rows = block[0], [r for r in block[2:]]
    return [dict(zip(header, r)) for r in rows]


def _num(cell: str) -> float:
    return float(re.match(r"[-+]?\d+(\.\d+)?", cell.replace("**", "").strip()).group(0))


def simulation_metrics(cfg: dict, ppo_commit: str) -> dict:
    app = ppo_app(cfg)
    aligned_path = app / "research" / "results" / "aligned.md"
    baselines_path = app / "research" / "results" / "baselines.md"
    comp = {r["Controller"]: r for r in parse_md_table(aligned_path.read_text(encoding="utf-8"), "## Comparison")}
    base = {r["Controller"]: r for r in parse_md_table(baselines_path.read_text(encoding="utf-8"))}

    def row(name, src, key):
        r = src[key]
        return {"controller": name, "queue": _num(r.get("Queue") or r.get("Queue (95% CI)")),
                "wait": _num(r.get("Wait") or r.get("Wait (95% CI)")),
                "throughput": _num(r.get("Throughput") or r.get("Throughput (95% CI)")),
                "emergencyWait": _num(r.get("Emerg. wait"))}

    rel = lambda p: p.relative_to(ppo_app(cfg).parent).as_posix()  # noqa: E731
    return {
        "label": SIMULATION_LABEL,
        "note": "Numbers copied from the PPO repo's research results; SUMO was not re-run by the bridge. "
                "Real SUMO, rush_hour demand, eval seeds 40000-40009, 1000 steps per episode. "
                "Queue and wait are the benchmark's normalised values (lower is better); throughput is "
                "vehicles discharged per episode (higher is better).",
        "ppoRepoCommit": ppo_commit,
        "rows": [
            {**row("PPO MLP @3000, aligned reward", comp, "PPO MLP @3000 (aligned reward)"),
             "reward": "ALIGNED (research/reward_aligned.yaml = configs/reward.yaml)",
             "checkpoint": "research campaign, 3 training seeds (101/202/303) x 3000 episodes; "
                           "checkpoints kept outside the repo",
             "n": 30, "source": rel(aligned_path)},
            {**row("PPO MLP @3000, old reward", comp, "PPO MLP @3000 (old reward)"),
             "reward": "OLD (pre-alignment reward, configs/ab/reward_pre_alignment.yaml)",
             "checkpoint": "research campaign, seeds 101/202/303 x 3000 episodes "
                           "(research/results/mlp_vs_lstm_3000.md); not the replay's ppo_normal_mlp_best.pth",
             "n": 30, "source": rel(aligned_path)},
            {**row("Fixed time (round robin)", base, "fixed_time"),
             "reward": "n/a (classical controller)", "checkpoint": "n/a", "n": 10, "source": rel(baselines_path)},
        ],
        "sources": [rel(aligned_path), rel(baselines_path)],
    }


# -------------------------------------------------------------------------- main
def build(cfg: dict, ppo_run: Path, rr_run: Path) -> dict:
    clip_s = float(cfg["video"]["duration_s"])
    pm, rm = load_manifest(ppo_run), load_manifest(rr_run)
    prow, rrow = load_trace(ppo_run), load_trace(rr_run)
    yellow, all_red = float(cfg["yellow_s"]), float(cfg["all_red_s"])
    p_end = min(clip_s, float(pm["clip"]["processed_until_s"]) + 1 / 6)
    r_end = min(clip_s, float(rm["clip"]["processed_until_s"]) + 1 / 6)

    init_arms = _arms(pm["initial_signal"]["green_at_t0"])
    # The phase that serves exactly the initially green arm(s) (West -> EW-protected).
    init_phase = next((p for p, arms in pm["topology"]["phase_green_arms"].items()
                       if _arms(arms) == init_arms), None)
    pdec = [r for r in prow if r["decision_point"]]
    psegs = ppo_segments(pdec, p_end, init_arms, init_phase, yellow, all_red)
    rsegs = round_robin_segments(r_end)

    ck = pm["checkpoint"]
    provisional = ck["reward_label"] != "ALIGNED"
    generated = datetime.now().astimezone().isoformat(timespec="seconds")
    common = {"generatedAt": generated, "clipS": clip_s, "calibration": pm["calibration_status"],
              "openLoop": True}
    ppo_tl = {**common, "mode": "ppo", "run": ppo_run.name, "provisional": provisional,
              "rewardLabel": ck["reward_label"], "processedS": round(p_end, 2),
              "timeline": to_ui_decisions(psegs, prow), "series": series(prow, p_end)}
    rr_tl = {**common, "mode": "round_robin", "run": rr_run.name, "signalTiming": ASSUMED_LABEL,
             "processedS": round(r_end, 2),
             "timeline": to_ui_decisions(rsegs, rrow), "series": series(rrow, r_end)}

    observed = {
        **common, "label": OBSERVED_LABEL,
        "note": "Open-loop replay of recorded footage: the signal decisions do not change the video, so "
                "these numbers describe what each controller decided on the same traffic, not which one "
                "moves traffic better. Perception is uncalibrated (pixel-based speeds; rough queue counts).",
        "perception": perception_summary(prow, pm),
        "ppo": {**controller_metrics(prow, pm, psegs, "ppo"), "run": ppo_run.name,
                "provisional": provisional, "rewardLabel": ck["reward_label"]},
        "roundRobin": {**controller_metrics(rrow, rm, rsegs, "round_robin"), "run": rr_run.name},
    }
    sim = simulation_metrics(cfg, pm["ppo_repo"]["commit"])
    run_info = {
        "generatedAt": generated,
        "modelFile": Path(ck["path"]).name,
        "modelPath": ck["path"],
        "modelSha256": ck["sha256"],
        "rewardLabel": ck["reward_label"],
        "provisional": provisional,
        "provisionalLabel": PROVISIONAL_LABEL if provisional else None,
        "ppoCommit": pm["ppo_repo"]["commit"],
        "calibration": pm["calibration_status"],
        "signalTimingLabel": ASSUMED_LABEL,
        "decisionIntervalS": pm["cadence"]["decision_interval_s"],
        "runs": {"ppo": ppo_run.name, "roundRobin": rr_run.name},
        "processedS": {"ppo": round(p_end, 2), "roundRobin": round(r_end, 2)},
        "governor": pm["controller"]["governor"],
        "legalMask": pm["controller"]["legal_mask"],
        "untrainedInputs": pm["controller"]["untrained_inputs"],
        "deviceStatus": "placeholder (no device connected)",
    }
    return {"ppo_timeline.json": ppo_tl, "round_robin_timeline.json": rr_tl,
            "observed_metrics.json": observed, "simulation_metrics.json": sim, "run_info.json": run_info}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ppo-run", type=Path)
    ap.add_argument("--rr-run", type=Path)
    ap.add_argument("--allow-partial", action="store_true", help="accept runs shorter than the clip")
    ap.add_argument("--out", type=Path, default=None, help="default: <ui>/public/data")
    args = ap.parse_args(argv)
    cfg = load_config()
    clip_s = float(cfg["video"]["duration_s"])
    out_runs = BRIDGE_DIR / "out"
    ppo_run = args.ppo_run or latest_run(out_runs, "ppo", clip_s, args.allow_partial)
    rr_run = args.rr_run or latest_run(out_runs, "round_robin", clip_s, args.allow_partial)
    files = build(cfg, ppo_run, rr_run)
    out = args.out or ui_path(cfg["ui_data_dir"])
    out.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (out / name).write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[convert] wrote {out / name}")
    info = files["run_info.json"]
    print(f"[convert] model={info['modelFile']} reward={info['rewardLabel']} provisional={info['provisional']} "
          f"runs={info['runs']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
