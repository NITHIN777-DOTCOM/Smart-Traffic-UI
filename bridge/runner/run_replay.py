"""Replay the Chennai T-junction clips through the PPO repo's perception + policy.

    .venv/Scripts/python runner/run_replay.py --mode ppo [--checkpoint PATH] [--max-seconds 60]
    .venv/Scripts/python runner/run_replay.py --mode round_robin [--max-seconds 60]

Imports (read-only, via sys.path) the PPO repo's PerceptionObservationAdapter (video
replay + CameraBridge + StateExtractor), the PPO checkpoint/policy, EdgeCaseGovernor,
phase_topology and SignalProgram, and drives them on a FIXED decision cadence of
`decision_interval_s` clip seconds:

  * ppo: at each decision the policy (legal mask on, governor on, untrained inputs
    neutralised) picks a phase. Same phase -> green continues, no yellow. Different
    phase -> 3 s yellow, 2 s all-red, then the new green. The model's duration output is
    logged but never used for timing.
  * round_robin: the signal follows bridge/data/assumed_signals.csv ("Assumed signal
    timing (no signal visible in footage)"). Perception still runs so counts exist.

Recorded footage is OPEN LOOP: actions do not change the frames. Outputs go to
bridge/out/<mode>_<timestamp>/ (trace.jsonl + manifest.json). Nothing is written to the
PPO repo; its git status is checked before and after.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge_common import (ARMS, ASSUMED_LABEL, BRIDGE_DIR, assert_ppo_clean,  # noqa: E402
                           assumed_last_green_end, csv_aspects, load_config, ppo_head,
                           read_assumed_csv, ui_path)
import ppo_env  # noqa: E402

PHASE_NAMES = ("NS-through", "NS-protected", "EW-through", "EW-protected")
DURATION_MAP = {0: 15.0, 1: 30.0, 2: 45.0, 3: 60.0}
# Normaliser for the remaining-phase-time input: the repo replay profile's max_green_s
# (sumo_free_env normalises by max_green), not the bridge's open-ended SignalProgram cap.
REMAINING_TIME_SCALE_S = 60.0
# Long enough that a green never ends by itself: the 30 s cadence owns every switch.
HOLD_GREEN_S = 1.0e5


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mode", choices=("ppo", "round_robin"), required=True)
    ap.add_argument("--checkpoint", default=None, help="PPO checkpoint (.pth); default from bridge.yaml")
    ap.add_argument("--max-seconds", type=float, default=None, help="stop after this much clip time")
    ap.add_argument("--out", default=None, help="run folder (default bridge/out/<mode>_<timestamp>)")
    ap.add_argument("--label", default="", help="free-text note stored in the manifest")
    return ap.parse_args(argv)


def resolve_checkpoint(cfg: dict, app: Path, value: str | None) -> Path:
    raw = Path(value or cfg["checkpoint"])
    if raw.is_absolute():
        return raw
    for base in (Path.cwd(), app, BRIDGE_DIR):
        if (base / raw).is_file():
            return (base / raw).resolve()
    return (app / raw).resolve()


def build_replay_config(cfg: dict, run_dir: Path) -> tuple[Path, dict, dict]:
    import yaml

    template = (BRIDGE_DIR / "config" / "replay_tjunction.yaml").read_text(encoding="utf-8")
    videos = ui_path(cfg["normalised_videos_dir"]).resolve()
    lanes = (BRIDGE_DIR / "out" / "lanes").resolve()
    lanes.mkdir(parents=True, exist_ok=True)
    text = template.replace("${VIDEOS}", videos.as_posix()).replace("${LANES}", lanes.as_posix())
    replay = yaml.safe_load(text)
    calib = yaml.safe_load((BRIDGE_DIR / "config" / "calibration.yaml").read_text(encoding="utf-8"))
    replay["capture_start_time"] = calib["capture_start_time"]
    replay["perception_stride"] = int(cfg.get("perception_stride", replay["perception_stride"]))
    replay["signal"]["yellow_s"] = float(cfg["yellow_s"])
    replay["signal"]["all_red_s"] = float(cfg["all_red_s"])
    for road in replay["roads"]:
        arm = calib["arms"][road["approach"]]
        road["direction_mode"] = arm["direction_mode"]
        road["intersection_point"] = arm["intersection_point"]
        road["calibration"] = dict(arm["calibration"])
        if not Path(road["video"]).is_file():
            raise SystemExit(f"normalised clip missing: {road['video']} (run scripts/prepare_media.py)")
    path = run_dir / "resolved_replay_config.yaml"
    path.write_text(yaml.safe_dump(replay, sort_keys=False), encoding="utf-8")
    return path, replay, calib


def main(argv=None) -> int:
    args = parse_args(argv)
    cfg = load_config()
    app = ppo_env.prepare(cfg)          # may re-exec with PYTHONDONTWRITEBYTECODE=1
    assert_ppo_clean(cfg, "run start")
    head = ppo_head(cfg)

    import numpy as np
    import torch

    from src.deployment.signal_program import SignalProgram
    from src.deployment.video_replay import PerceptionObservationAdapter
    from src.state.phase_topology import legal_phase_mask, phase_component_mask, phase_movements

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(args.out) if args.out else BRIDGE_DIR / "out" / f"{args.mode}_{stamp}"
    run_dir = run_dir.resolve()
    run_dir.mkdir(parents=True, exist_ok=False)
    replay_path, replay, calib = build_replay_config(cfg, run_dir)
    os.chdir(run_dir)  # anything a library drops in the CWD lands in our run folder

    adjacency = np.asarray(replay["adjacency"], dtype=np.float32)
    drive_side = replay["drive_side"]
    masks = legal_phase_mask(adjacency, drive_side)
    service_mask = phase_component_mask(adjacency, drive_side)
    phase_arms = {}
    for i, name in enumerate(PHASE_NAMES):
        sources = (("North", "South") if i < 2 else ("East", "West"))
        phase_arms[name] = [src for j, src in enumerate(sources) if service_mask[i, j]]
    topology = {
        "drive_side": drive_side,
        "legal_phase_mask": {n: bool(m) for n, m in zip(PHASE_NAMES, masks)},
        "phase_green_arms": phase_arms,
        "phase_movements": {k: [list(m) for m in v] for k, v in phase_movements(drive_side).items()},
    }
    print(f"[replay] phase -> green arms: {phase_arms}")
    arm_phase = {"West": PHASE_NAMES.index("EW-protected"), "East": PHASE_NAMES.index("EW-through"),
                 "South": PHASE_NAMES.index("NS-through")}

    interval = float(cfg["decision_interval_s"])
    assumed_rows = read_assumed_csv(ui_path(cfg["assumed_signals_csv"]))

    # ---- controller -----------------------------------------------------------------
    agent = obs_normalizer = governor = None
    untrained = None
    ckpt_info = None
    if args.mode == "ppo":
        from src.ppo.checkpoint import build_agent_from_checkpoint, load_checkpoint, restore_normalizers
        from src.safety.edge_case_governor import EdgeCaseGovernor
        import reward_label

        ckpt_path = resolve_checkpoint(cfg, app, args.checkpoint)
        ckpt_info = reward_label.label_checkpoint(ckpt_path)
        print(f"[replay] checkpoint {ckpt_path} reward={ckpt_info['label']}")
        if ckpt_info["label"] != "ALIGNED":
            print("[replay] WARNING: checkpoint reward is OLD -> every output is PROVISIONAL (old reward)")
        ckpt = load_checkpoint(str(ckpt_path), device="cpu")
        state_dim = int(ckpt["ppo_config"]["state_dim"])
        if state_dim != 131:
            raise SystemExit(f"checkpoint state_dim={state_dim}; replay schema needs 131")
        agent = build_agent_from_checkpoint(ckpt, device="cpu")
        agent.policy.eval()
        agent.policy_old.eval()
        obs_normalizer, _ = restore_normalizers(ckpt, state_dim, agent.gamma)
        obs_normalizer.freeze()
        agent.reset_episode(env_idx=0)
        untrained = np.zeros(state_dim, dtype=bool)
        if cfg.get("untrained_inputs") == "neutralize":
            untrained = np.asarray(obs_normalizer.untrained_inputs(), dtype=bool)
        if cfg.get("governor") == "enabled":
            governor = EdgeCaseGovernor()
            governor.reset_episode()
        del ckpt

    signal = SignalProgram(min_green=float(replay["signal"]["min_green_s"]),
                           max_green=float(replay["signal"]["max_green_s"]),
                           yellow_duration=float(replay["signal"]["yellow_s"]),
                           all_red_duration=float(replay["signal"]["all_red_s"]))
    # Initial state from the assumed timing: at t=0 West has just turned green.
    initial = csv_aspects(assumed_rows, 0.0)
    initial_green = [a for a in ARMS if initial[a] == "green"]
    if args.mode == "ppo":
        signal.request(arm_phase[initial_green[0]], HOLD_GREEN_S, service_mask)
        signal.advance(signal.all_red_duration)  # pre-roll: the all-red before t=0
        assert signal.mode == SignalProgram.GREEN

    def ppo_aspects() -> dict:
        a = signal.aspects()
        return {arm: a[arm] for arm in ("North", *ARMS)}

    def rr_aspects(t: float) -> dict:
        a = csv_aspects(assumed_rows, t)
        return {"North": "red", **a}

    trace_path = run_dir / "trace.jsonl"
    started_wall = time.time()
    latencies = []
    decisions = 0
    overrides = 0
    feedback_pending = False
    prev_clock = None
    next_decision_t = 0.0
    step = 0
    last_t = 0.0
    eof = False
    failures = []
    unique_tracks = {a: set() for a in ARMS}

    with PerceptionObservationAdapter(str(replay_path)) as adapter, \
            trace_path.open("w", encoding="utf-8", newline="\n") as trace:
        adapter.reset("tjunction-" + args.mode)
        # Time-since-green inputs from the assumed timing: when each arm was last green
        # before t=0 (StateExtractor keeps this per approach; North never).
        for arm in ARMS:
            if initial[arm] != "green":
                adapter.extractor._last_green_time[arm] = float(assumed_last_green_end(arm, 0.0))
        id_to_arm = {str(r["id"]): r["approach"] for r in replay["roads"]}
        print(f"[replay] adapter ready ({time.time() - started_wall:.1f} s); running {args.mode}")
        while True:
            t0 = time.perf_counter()
            packets = adapter.read_frame_packets()
            if any(p is None for p in packets.values()):
                eof = True
                break
            clock = float(np.mean([p.timestamp_s for p in packets.values()]))
            if args.max_seconds is not None and clock >= args.max_seconds - 1e-9:
                break
            if args.mode == "ppo" and prev_clock is not None:
                signal.advance(clock - prev_clock)
            prev_clock = clock

            if args.mode == "ppo":
                aspects = ppo_aspects()
                phase_index = signal.active_phase_index if signal.mode == SignalProgram.GREEN else None
            else:
                aspects = rr_aspects(clock)
                greens = [a for a in ARMS if aspects[a] == "green"]
                phase_index = arm_phase[greens[0]] if greens else None
            green_now = tuple(a for a in ("North", *ARMS) if aspects[a] == "green")
            is_decision = clock >= next_decision_t - 1e-6
            remaining = (0.0 if is_decision else max(0.0, next_decision_t - clock)) if green_now else 0.0

            result = adapter.observe(frame_packets=packets, phase_index=phase_index,
                                     remaining_phase_time=min(1.0, remaining / REMAINING_TIME_SCALE_S),
                                     adjacency=adjacency, active_green_approaches=green_now)
            if result["eof"]:
                eof = True
                break
            state = result["state"]
            diag = result["diagnostics"]

            if governor is not None and feedback_pending:
                governor.update_feedback(state, {
                    "phase": PHASE_NAMES[phase_index] if phase_index is not None else None,
                    "source_time_s": clock, "mode": "video_replay_open_loop"})
            feedback_pending = False

            decision = None
            if is_decision:
                decisions += 1
                next_decision_t += interval
                if args.mode == "ppo":
                    current = PHASE_NAMES[signal.active_phase_index] if signal.mode == SignalProgram.GREEN else None
                    obs = obs_normalizer.normalize(result["vector"], update=False)
                    obs = np.where(untrained, 0.0, obs).astype(np.float32)
                    kwargs = {"env_idx": 0}
                    if cfg.get("legal_mask") == "enabled":
                        kwargs["action_mask"] = masks
                    with torch.no_grad():
                        proposed = np.asarray(agent.select_action_deterministic(obs, None, **kwargs),
                                              dtype=np.int64).reshape(-1)
                    executed = proposed.copy()
                    override = {"overridden": False, "action_changed": False, "rule": None}
                    if governor is not None:
                        executed, override = governor.decide(proposed, state, {
                            "green_phase_names": list(PHASE_NAMES), "duration_map": DURATION_MAP,
                            "current_green_name": current})
                        executed = np.asarray(executed, dtype=np.int64).reshape(-1)
                    phase = int(executed[0])
                    error = None
                    try:
                        if cfg.get("legal_mask") == "enabled" and not masks[phase]:
                            raise ValueError("governed action violates the legal mask")
                        signal.request(phase, HOLD_GREEN_S, service_mask)
                        signal.advance(0.0)  # start the yellow now, not on the next frame
                    except Exception as exc:  # never repair silently; log and hold
                        error = f"{type(exc).__name__}: {exc}"
                        failures.append({"t_s": clock, "error": error})
                    feedback_pending = governor is not None
                    if override.get("overridden"):
                        overrides += 1
                    decision = {
                        "controller": "ppo",
                        "current_phase": current,
                        "proposed_action": proposed.tolist(),
                        "proposed_phase": PHASE_NAMES[int(proposed[0])],
                        "governed_action": executed.tolist(),
                        "governed_phase": PHASE_NAMES[phase],
                        "phase_green_arms": phase_arms[PHASE_NAMES[phase]],
                        "switch": PHASE_NAMES[phase] != current,
                        "override": bool(override.get("overridden")),
                        "action_changed": bool(override.get("action_changed")),
                        "override_rule": override.get("rule"),
                        "requested_duration_index": int(executed[1]),
                        "requested_duration_s": DURATION_MAP[int(executed[1])],
                        "proposed_duration_s": DURATION_MAP[int(proposed[1])],
                        "duration_used_for_timing": False,
                        "error": error,
                    }
                else:
                    greens = [a for a in ARMS if aspects[a] == "green"]
                    decision = {"controller": "assumed_round_robin", "label": ASSUMED_LABEL,
                                "green_arms": greens}

            # Per-arm perception summary (inbound = toward the declared junction point).
            vehicles = {a: 0 for a in ARMS}
            detections = {a: 0 for a in ARMS}
            queued = {a: 0 for a in ARMS}
            for cam_id, cam in diag["per_camera"].items():
                arm = id_to_arm[cam_id]
                if arm in detections:
                    detections[arm] = int(cam["detections"])
            approach_state = {a.approach_name: a for a in state.approaches}
            # observe() does not return the records themselves; their per-camera count is in diag.
            for cam_id, cam in diag["per_camera"].items():
                arm = id_to_arm[cam_id]
                if arm in vehicles:
                    vehicles[arm] = int(cam["vehicle_records"])
                    unique_tracks[arm].update(cam["vehicle_record_ids"])
            queue_norm = {a: float(approach_state[a].queue_length) for a in ARMS}
            for a in ARMS:
                # StateExtractor: lane queue = queued(<0.1 m/s) / (50 * 0.4), clipped to 1 per
                # lane; the approach sums its inbound lanes. Invert that for a rough count.
                queued[a] = round(queue_norm[a] * 20.0, 1)

            now_aspects = ppo_aspects() if args.mode == "ppo" else aspects
            latency_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(latency_ms)
            row = {
                "step": step,
                "t_s": round(clock, 4),
                # In force from this instant on (after any decision taken at this step).
                "aspects": {a: now_aspects[a] for a in ARMS},
                "north_aspect": now_aspects["North"],
                "green_arms": [a for a in ARMS if now_aspects[a] == "green"],
                # What the observation fed to the model saw (before this step's decision).
                "aspects_observed": {a: aspects[a] for a in ARMS},
                "signal_mode": signal.mode if args.mode == "ppo" else None,
                "vehicles": {"detections": detections, "tracked_records": vehicles,
                             "unique_tracks_so_far": {a: len(unique_tracks[a]) for a in ARMS},
                             "note": "detections = accepted YOLO boxes >= 0.25 conf in the frame; "
                                     "tracked_records = track-backed VehicleRecords (all directions)"},
                "queue": {"normalised": {a: round(queue_norm[a], 4) for a in ARMS},
                          "approx_vehicles": queued,
                          "note": "normalised = StateExtractor ApproachState.queue_length (inbound, "
                                  "speed<0.1 m/s, uncalibrated); approx_vehicles = normalised x 20 "
                                  "(lane capacity 50 x 0.4), rough"},
                "density": {a: round(float(approach_state[a].vehicle_density), 4) for a in ARMS},
                "time_since_last_green": {a: round(float(approach_state[a].time_since_last_green), 4)
                                          for a in ARMS},
                "decision_point": decision is not None,
                "decision": decision,
                "latency_ms": round(latency_ms, 2),
                "perception_latency_ms": round(float(diag["latency_ms"]), 2),
            }
            trace.write(json.dumps(row) + "\n")
            step += 1
            last_t = clock
            if step % 180 == 0:
                trace.flush()
                rate = step / max(1e-6, time.time() - started_wall)
                print(f"[replay] t={clock:7.1f}s steps={step} decisions={decisions} "
                      f"{rate:.2f} steps/s greens={row['green_arms']}", flush=True)

    wall_s = time.time() - started_wall
    assert_ppo_clean(cfg, f"after {args.mode} run")
    lat = np.asarray(latencies[1:] or latencies, dtype=float)
    media_report = {}
    report_path = ui_path(cfg["normalised_videos_dir"]) / "media_report.json"
    if report_path.is_file():
        media_report = json.loads(report_path.read_text(encoding="utf-8"))
    import importlib.metadata as md
    versions = {}
    for name in ("torch", "ultralytics", "opencv-python", "numpy"):
        try:
            versions[name] = md.version(name)
        except md.PackageNotFoundError:
            versions[name] = None
    manifest = {
        "mode": args.mode,
        "label": args.label,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "open_loop": True,
        "claim_boundary": "video_replay_open_loop: recorded frames do not respond to signal "
                          "decisions; no causal traffic-control metric",
        "checkpoint": ({"path": ckpt_info["path"], "sha256": ckpt_info["sha256"],
                        "reward_label": ckpt_info["label"],
                        "reward_mismatches": ckpt_info["mismatches"],
                        "stored_reward": ckpt_info["stored"],
                        "provisional": ckpt_info["label"] != "ALIGNED"} if ckpt_info else None),
        "ppo_repo": {"path": str(ppo_env.ppo_app(cfg)), "commit": head, "git_status_clean": True},
        "controller": ({"governor": cfg.get("governor"), "legal_mask": cfg.get("legal_mask"),
                        "untrained_inputs": cfg.get("untrained_inputs"),
                        "untrained_inputs_neutralised": int(untrained.sum()) if untrained is not None else 0,
                        "duration_output": "logged only, not used for timing"}
                       if args.mode == "ppo" else
                       {"type": "assumed_round_robin", "source": cfg["assumed_signals_csv"],
                        "label": ASSUMED_LABEL}),
        "cadence": {"decision_interval_s": interval, "yellow_s": cfg["yellow_s"], "all_red_s": cfg["all_red_s"],
                    "same_phase": "extend green, no yellow",
                    "different_phase": "yellow then all-red then new green"},
        "initial_signal": {"source": ASSUMED_LABEL, "green_at_t0": initial_green},
        "topology": topology,
        "calibration_status": calib.get("status", "uncalibrated"),
        "config": {"bridge": cfg, "replay": replay, "calibration": calib},
        "clip": {"processed_until_s": last_t, "reached_eof": eof,
                 "max_seconds": args.max_seconds, "media": media_report},
        "steps": step,
        "decisions": decisions,
        "governor_overrides": overrides,
        "unique_tracks": {a: len(unique_tracks[a]) for a in ARMS},
        "governor_rule_counts": governor.get_rule_counts() if governor is not None else None,
        "failures": failures,
        "latency_ms": {"mean": float(lat.mean()), "p50": float(np.percentile(lat, 50)),
                       "p95": float(np.percentile(lat, 95)), "max": float(lat.max())} if lat.size else None,
        "wall_time_s": round(wall_s, 1),
        "python": platform.python_version(),
        "versions": versions,
    }
    (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")
    print(f"[replay] done: {step} steps, {decisions} decisions, {overrides} overrides, "
          f"{last_t:.1f} s of clip in {wall_s:.0f} s wall -> {run_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
