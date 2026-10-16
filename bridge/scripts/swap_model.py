"""Swap in a new PPO checkpoint and regenerate the UI data.

    .venv/Scripts/python scripts/swap_model.py --checkpoint C:\\path\\to\\aligned_best.pth

1. copies the file into bridge/models/ (never touches the PPO repo),
2. reads its stored reward_config and labels it ALIGNED or OLD (loud warning if OLD),
3. re-runs the PPO replay on the full clip with that checkpoint,
4. re-runs convert.py (uses the newest round-robin run already in bridge/out/),
5. prints a summary.

Options: --max-seconds N for a quick check (convert then needs --allow-partial, which
this script passes automatically when N is given); --no-run to only copy + label.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

BRIDGE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BRIDGE))
from bridge_common import assert_ppo_clean, load_config  # noqa: E402
import ppo_env  # noqa: E402

BANNER = "!" * 78


def label_in_child(path: Path) -> dict:
    """Load the checkpoint in a child process that has the PPO-safe environment."""
    code = ("import json,sys; sys.path.insert(0, r'%s'); import ppo_env; ppo_env.prepare(); "
            "import reward_label; print(json.dumps(reward_label.label_checkpoint(r'%s')))") % (BRIDGE, path)
    out = subprocess.run([sys.executable, "-c", code], env=ppo_env.child_env(), cwd=str(BRIDGE / "out"),
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip().splitlines()[-1])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--checkpoint", required=True, type=Path)
    ap.add_argument("--max-seconds", type=float, default=None)
    ap.add_argument("--no-run", action="store_true")
    args = ap.parse_args(argv)
    cfg = load_config()
    assert_ppo_clean(cfg, "swap start")
    src = args.checkpoint.resolve()
    if not src.is_file():
        raise SystemExit(f"checkpoint not found: {src}")
    dest_dir = BRIDGE / "models"
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / src.name
    if src != dest.resolve():
        shutil.copy2(src, dest)
    print(f"[swap] copied {src} -> {dest}")

    (BRIDGE / "out").mkdir(exist_ok=True)
    info = label_in_child(dest)
    print(f"[swap] reward label: {info['label']}  sha256={info['sha256'][:16]}...")
    if info["label"] != "ALIGNED":
        print(BANNER)
        print("!! WARNING: this checkpoint's reward_config is NOT the aligned reward.")
        print("!! Every output will be labelled PROVISIONAL (old reward).")
        for key, mm in info["mismatches"].items():
            print(f"!!   {key}: checkpoint={mm['checkpoint']} aligned={mm['aligned']}")
        print(BANNER)
    if args.no_run:
        return 0

    from datetime import datetime
    run_dir = BRIDGE / "out" / f"ppo_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    run_cmd = [sys.executable, str(BRIDGE / "runner" / "run_replay.py"), "--mode", "ppo",
               "--checkpoint", str(dest), "--label", f"swap_model {src.name}", "--out", str(run_dir)]
    if args.max_seconds:
        run_cmd += ["--max-seconds", str(args.max_seconds)]
    print("[swap] running:", " ".join(run_cmd))
    subprocess.run(run_cmd, check=True, env=ppo_env.child_env())
    # Convert exactly this run (the newest round-robin run is reused).
    conv_cmd = [sys.executable, str(BRIDGE / "convert.py"), "--ppo-run", str(run_dir)]
    if args.max_seconds:
        conv_cmd.append("--allow-partial")
    subprocess.run(conv_cmd, check=True)
    assert_ppo_clean(cfg, "swap end")

    ui_data = BRIDGE.parent / cfg["ui_data_dir"]
    run_info = json.loads((ui_data / "run_info.json").read_text(encoding="utf-8"))
    obs = json.loads((ui_data / "observed_metrics.json").read_text(encoding="utf-8"))["ppo"]
    print("\n=== swap_model summary ===")
    print(f"model file      : {run_info['modelFile']}")
    print(f"reward label    : {run_info['rewardLabel']}  provisional={run_info['provisional']}")
    print(f"PPO commit      : {run_info['ppoCommit']}")
    print(f"run             : {run_info['runs']['ppo']}  ({run_info['processedS']['ppo']} s of clip)")
    print(f"decisions       : {obs['decisions']}  switches={obs['switches']}  "
          f"overrides={obs['governorOverrides']}")
    print(f"phases governed : {obs['governedPhases']}")
    print(f"duration asks   : {obs['durationRequestsS']}")
    print(f"UI data         : {ui_data}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
