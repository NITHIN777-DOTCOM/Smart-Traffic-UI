"""Converter / timing tests on synthetic traces (no torch, no PPO code, no video)."""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge_common as bc  # noqa: E402
import convert  # noqa: E402
import reward_label  # noqa: E402

DT = 1 / 6


def _row(t, aspects, decision=None, det=(3, 2, 1), q=(0.1, 0.05, 0.0)):
    arms = bc.ARMS
    return {
        "t_s": round(t, 4),
        "aspects": dict(aspects),
        "green_arms": [a for a in arms if aspects[a] == "green"],
        "vehicles": {"detections": dict(zip(arms, det)), "tracked_records": dict(zip(arms, det)),
                     "unique_tracks_so_far": dict(zip(arms, det))},
        "queue": {"normalised": dict(zip(arms, q)), "approx_vehicles": {a: v * 20 for a, v in zip(arms, q)}},
        "decision_point": decision is not None,
        "decision": decision,
    }


def _ppo_dec(t, proposed, governed, current, switch, arms, dur=30.0, override=False, rule=None):
    return {"controller": "ppo", "current_phase": current, "proposed_action": [0, 1],
            "proposed_phase": proposed, "governed_action": [0, 1], "governed_phase": governed,
            "phase_green_arms": arms, "switch": switch, "override": override,
            "action_changed": override, "override_rule": rule, "requested_duration_index": 1,
            "requested_duration_s": dur, "proposed_duration_s": dur,
            "duration_used_for_timing": False, "error": None}


PLAN = [  # (t, governed phase, green arms, switch)
    (0.0, "EW-protected", ["West"], False),
    (30.0, "EW-through", ["East", "West"], True),
    (60.0, "EW-through", ["East", "West"], False),
    (90.0, "NS-through", ["South"], True),
]


def ppo_trace(clip_s=120.0):
    """Trace following the bridge cadence for PLAN."""
    def aspects_at(t):
        a = {"West": "green", "East": "red", "South": "red"}
        if 30 <= t < 33:
            a = {"West": "yellow", "East": "red", "South": "red"}
        elif 33 <= t < 35:
            a = {"West": "red", "East": "red", "South": "red"}
        elif 35 <= t < 90:
            a = {"West": "green", "East": "green", "South": "red"}
        elif 90 <= t < 93:
            a = {"West": "yellow", "East": "yellow", "South": "red"}
        elif 93 <= t < 95:
            a = {"West": "red", "East": "red", "South": "red"}
        elif t >= 95:
            a = {"West": "red", "East": "red", "South": "green"}
        return a
    rows, current = [], "EW-protected"
    n = int(round(clip_s / DT))
    plan = {p[0]: p for p in PLAN}
    for i in range(n):
        t = i * DT
        dec = None
        key = round(t, 6)
        if key in plan:
            _, phase, arms, switch = plan[key]
            dec = _ppo_dec(t, phase, phase, current, switch, arms,
                           override=(key == 60.0), rule=("rule2_near_equal_tiebreak" if key == 60.0 else None))
            current = phase
        rows.append(_row(t, aspects_at(t), dec))
    return rows


def write_run(tmp: Path, name: str, rows, manifest):
    d = tmp / name
    d.mkdir(parents=True)
    with open(d / "trace.jsonl", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    (d / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return d


def manifest(mode, until, label="OLD"):
    return {
        "mode": mode, "clip": {"processed_until_s": until, "reached_eof": False},
        "checkpoint": {"path": "C:/x/ppo_normal_mlp_best.pth", "sha256": "ab" * 32, "reward_label": label},
        "ppo_repo": {"commit": "deadbeef"}, "calibration_status": "uncalibrated",
        "cadence": {"decision_interval_s": 30.0},
        "controller": {"governor": "enabled", "legal_mask": "enabled", "untrained_inputs": "neutralize"},
        "initial_signal": {"green_at_t0": ["West"]},
        "topology": {"phase_green_arms": {"NS-through": ["South"], "NS-protected": ["South"],
                                          "EW-through": ["East", "West"], "EW-protected": ["West"]}},
        "unique_tracks": {"West": 10, "East": 7, "South": 4},
        "latency_ms": {"mean": 100.0},
    }


# ----------------------------------------------------------------------------- tests
def test_assumed_cycle_one_arm_at_a_time():
    for t in [x * 0.5 for x in range(0, 1200)]:
        a = bc.assumed_aspects(t)
        assert sum(v != "red" for v in a.values()) <= 1
    assert bc.assumed_aspects(0)["West"] == "green"
    assert bc.assumed_aspects(26)["West"] == "yellow"
    assert all(v == "red" for v in bc.assumed_aspects(29).values())
    assert bc.assumed_aspects(30)["East"] == "green"
    assert bc.assumed_aspects(60)["South"] == "green"
    assert bc.assumed_aspects(90)["West"] == "green"


def test_csv_rows_and_lookup(tmp_path):
    sys.path.insert(0, str(Path(bc.BRIDGE_DIR / "scripts")))
    import prepare_media
    p = tmp_path / "a.csv"
    n = prepare_media.write_csv(p, 600)
    assert n == 121
    with open(p, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert rows[0] == {"t_s": "0", "west": "green", "east": "red", "south": "red", "note": "assumed"}
    assert {r["note"] for r in rows} == {"assumed"}
    parsed = bc.read_assumed_csv(p)
    for t in [0, 12.5, 25.1, 27.9, 28.0, 29.9, 30, 61, 88, 89.5, 90, 599]:
        assert bc.csv_aspects(parsed, t) == bc.assumed_aspects(t), t


def test_last_green_seed():
    assert bc.assumed_last_green_end("East", 0.0) == -35.0   # East green -60..-35
    assert bc.assumed_last_green_end("South", 0.0) == -5.0   # South green -30..-5
    assert bc.assumed_last_green_end("West", 10.0) == 10.0   # currently green


def test_ppo_segments_follow_cadence():
    rows = ppo_trace()
    decs = [r for r in rows if r["decision_point"]]
    segs = convert.ppo_segments(decs, 120.0, ["west"], "EW-protected", 3.0, 2.0)
    got = [(s["t"], s["arms"], s["durationS"], s["yellowS"], s["allRedS"]) for s in segs]
    assert got == [
        (0.0, ["west"], 30.0, 3.0, 2.0),
        (35.0, ["west", "east"], 55.0, 3.0, 2.0),
        (95.0, ["south"], 25.0, 0.0, 0.0),
    ]
    assert segs[0]["extendedAt"] == [0.0]
    assert segs[1]["extendedAt"] == [60.0]


def test_segments_agree_with_trace_aspects():
    rows = ppo_trace()
    decs = [r for r in rows if r["decision_point"]]
    segs = convert.ppo_segments(decs, 120.0, ["west"], "EW-protected", 3.0, 2.0)
    for r in rows:
        t = r["t_s"]
        seg = [s for s in segs if s["t"] <= t + 1e-6][-1]
        e = t - seg["t"]
        for arm in bc.ARMS:
            want = "red"
            if arm.lower() in seg["arms"]:
                want = "green" if e < seg["durationS"] else "yellow" if e < seg["durationS"] + 3 else "red"
            assert r["aspects"][arm] == want, (t, arm)


def test_round_robin_segments():
    segs = convert.round_robin_segments(600.0)
    assert len(segs) == 20
    assert [s["arms"][0] for s in segs[:4]] == ["west", "east", "south", "west"]
    assert segs[1]["t"] == 30 and segs[1]["durationS"] == 25


def test_shares_sum_to_one():
    rows = ppo_trace()
    shares = convert.aspect_shares(rows, 120.0)
    for arm, s in shares.items():
        assert abs(sum(s.values()) - 1.0) < 1e-3, arm
    assert shares["south"]["green"] == pytest.approx(25 / 120, abs=0.01)


def test_parse_md_table():
    md = "x\n## Comparison\n\n| Controller | Queue |\n|---|---:|\n| a | 1.5 |\n| b | **2.0** |\n\nend"
    rows = convert.parse_md_table(md, "## Comparison")
    assert rows == [{"Controller": "a", "Queue": "1.5"}, {"Controller": "b", "Queue": "**2.0**"}]
    assert convert._num("**2.0**") == 2.0
    assert convert._num("314.4 (310.1, 318.2)") == 314.4


def test_reward_label():
    assert reward_label.classify(dict(reward_label.ALIGNED_REWARD))["label"] == "ALIGNED"
    old = dict(reward_label.ALIGNED_REWARD, emergency_weight=20.0)
    info = reward_label.classify(old)
    assert info["label"] == "OLD" and "emergency_weight" in info["mismatches"]
    assert reward_label.classify(None)["label"] == "OLD"


def test_build_end_to_end(tmp_path, monkeypatch):
    rows = ppo_trace()
    rr_rows = [_row(i * DT, bc.assumed_aspects(i * DT),
                    {"controller": "assumed_round_robin", "green_arms": []} if (i * DT) % 30 < 1e-6 else None)
               for i in range(int(round(120 / DT)))]
    p = write_run(tmp_path, "ppo_20260101_000000", rows, manifest("ppo", 120 - DT))
    r = write_run(tmp_path, "round_robin_20260101_000000", rr_rows, manifest("round_robin", 120 - DT))
    monkeypatch.setattr(convert, "simulation_metrics", lambda cfg, c: {"label": "Simulation (SUMO)", "rows": []})
    cfg = {"video": {"duration_s": 120}, "yellow_s": 3, "all_red_s": 2}
    files = convert.build(cfg, p, r)
    tl = files["ppo_timeline.json"]["timeline"]
    assert [d["arms"] for d in tl] == [["west"], ["west", "east"], ["south"]]
    assert tl[1]["override"] is False and tl[1]["phase"] == "EW-through"
    obs = files["observed_metrics.json"]
    assert obs["label"] == "Observed on Chennai footage"
    assert obs["ppo"]["decisions"] == 4 and obs["ppo"]["switches"] == 2
    assert obs["ppo"]["governorOverrides"] == 1
    assert obs["ppo"]["governorRules"] == {"rule2_near_equal_tiebreak": 1}
    assert obs["ppo"]["durationRequestsS"] == {"30": 4}
    assert obs["roundRobin"]["switches"] == 3
    assert obs["roundRobin"]["signalTiming"].startswith("Assumed signal timing")
    info = files["run_info.json"]
    assert info["rewardLabel"] == "OLD" and info["provisional"] is True
    assert info["provisionalLabel"] == "Provisional — old-reward model"
    assert info["calibration"] == "uncalibrated"
    rr = files["round_robin_timeline.json"]
    assert rr["signalTiming"].startswith("Assumed signal timing")
    assert [d["arms"][0] for d in rr["timeline"]] == ["west", "east", "south", "west"]
    # aligned checkpoint -> not provisional
    p2 = write_run(tmp_path, "ppo_20260102_000000", rows, manifest("ppo", 120 - DT, label="ALIGNED"))
    assert convert.build(cfg, p2, r)["run_info.json"]["provisional"] is False


def test_latest_run_requires_full_clip(tmp_path):
    write_run(tmp_path, "ppo_20260101_000000", [], manifest("ppo", 59.8))
    with pytest.raises(SystemExit):
        convert.latest_run(tmp_path, "ppo", 600, allow_partial=False)
    assert convert.latest_run(tmp_path, "ppo", 600, allow_partial=True).name == "ppo_20260101_000000"
    write_run(tmp_path, "ppo_20260101_010000", [], manifest("ppo", 599.9))
    assert convert.latest_run(tmp_path, "ppo", 600, allow_partial=False).name == "ppo_20260101_010000"
