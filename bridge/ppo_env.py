"""Run PPO-repo code safely: read-only import via sys.path, outputs redirected.

Every process that imports the PPO repo's code must call `prepare()` before the
first PPO import. It guarantees PYTHONDONTWRITEBYTECODE=1 for this process (by
re-executing itself once if the variable was not set at start-up) and points the
repo's OUTPUT directories at bridge/out/ppo_runtime/. Its models, configs and data
directories are NOT redirected; checkpoints are passed by explicit path.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from bridge_common import BRIDGE_DIR, load_config, ppo_app

RUNTIME_DIR = BRIDGE_DIR / "out" / "ppo_runtime"


def ppo_env_vars() -> dict:
    return {
        "PYTHONDONTWRITEBYTECODE": "1",
        "STS_RESULTS_DIR": str(RUNTIME_DIR / "results"),
        "STS_LOGS_DIR": str(RUNTIME_DIR / "logs"),
        "STS_SUMO_FILES_DIR": str(RUNTIME_DIR / "sumo_files"),
        # Ultralytics writes its settings under the user profile by default; keep it ours.
        "YOLO_CONFIG_DIR": str(RUNTIME_DIR / "ultralytics"),
    }


def child_env() -> dict:
    env = dict(os.environ)
    env.update(ppo_env_vars())
    return env


def prepare(cfg: dict | None = None) -> Path:
    """Ensure the safe environment, put the PPO app on sys.path, return its path."""
    wanted = ppo_env_vars()
    if os.environ.get("PYTHONDONTWRITEBYTECODE") != "1":
        # The flag must be in place before the interpreter starts importing; re-exec.
        completed = subprocess.run([sys.executable, *sys.argv], env=child_env())
        raise SystemExit(completed.returncode)
    sys.dont_write_bytecode = True
    for key, value in wanted.items():
        os.environ[key] = value
    for key in ("STS_RESULTS_DIR", "STS_LOGS_DIR", "STS_SUMO_FILES_DIR", "YOLO_CONFIG_DIR"):
        Path(os.environ[key]).mkdir(parents=True, exist_ok=True)
    cfg = cfg or load_config()
    app = ppo_app(cfg)
    if not (app / "src").is_dir():
        raise SystemExit(f"PPO app folder not found: {app} (set ppo_repo in bridge/config/bridge.yaml "
                         "or the PPO_REPO environment variable)")
    if str(app) not in sys.path:
        sys.path.insert(0, str(app))
    return app
