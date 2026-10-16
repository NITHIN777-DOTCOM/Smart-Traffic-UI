"""Shared helpers for the bridge: config loading, paths, assumed signal timing.

Kept free of PPO-repo imports so it can be used by the converter and tests
without torch or the PPO code on the path.
"""
from __future__ import annotations

import csv
import os
import subprocess
from pathlib import Path

import yaml

BRIDGE_DIR = Path(__file__).resolve().parent
UI_ROOT = BRIDGE_DIR.parent
CONFIG_PATH = BRIDGE_DIR / "config" / "bridge.yaml"

# The UI's three real arms. North is a blank placeholder camera for the model.
ARMS = ("West", "East", "South")
APPROACH_ORDER = ("North", "East", "South", "West")

ASSUMED_LABEL = "Assumed signal timing (no signal visible in footage)"


def load_config(path: Path | str = CONFIG_PATH) -> dict:
    with open(path, encoding="utf-8") as stream:
        cfg = yaml.safe_load(stream) or {}
    env = os.environ.get("PPO_REPO")
    if env:
        cfg["ppo_repo"] = env
    return cfg


def ui_path(rel: str | Path) -> Path:
    """Resolve a path from bridge.yaml relative to the UI repo root."""
    p = Path(rel)
    return p if p.is_absolute() else (UI_ROOT / p)


def ppo_repo(cfg: dict) -> Path:
    return Path(cfg["ppo_repo"]).resolve()


def ppo_app(cfg: dict) -> Path:
    return ppo_repo(cfg) / cfg.get("ppo_app_subdir", "smart_traffic_ppo")


def ppo_git_status(cfg: dict) -> str:
    """Porcelain status of the PPO repo; must always be empty."""
    out = subprocess.run(["git", "-C", str(ppo_repo(cfg)), "status", "--porcelain"],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()


def ppo_head(cfg: dict) -> str:
    out = subprocess.run(["git", "-C", str(ppo_repo(cfg)), "rev-parse", "HEAD"],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()


def assert_ppo_clean(cfg: dict, when: str) -> None:
    status = ppo_git_status(cfg)
    if status:
        raise SystemExit(f"BLOCKER: PPO repo git status not empty ({when}):\n{status}")
    print(f"[bridge] PPO repo git status clean ({when})")


# ---------------------------------------------------------------------------
# Assumed signal timing (no signal visible in footage)
# West -> East -> South, each 25 s green + 5 s clearance (3 s yellow + 2 s all-red).
# ---------------------------------------------------------------------------
GREEN_S = 25.0
YELLOW_S = 3.0
ALL_RED_S = 2.0
SLOT_S = GREEN_S + YELLOW_S + ALL_RED_S
CYCLE = ("West", "East", "South")
CYCLE_S = SLOT_S * len(CYCLE)


def assumed_aspects(t_s: float) -> dict:
    """Exact assumed aspects at clip time t (one arm non-red at a time)."""
    t = t_s % CYCLE_S
    slot = int(t // SLOT_S)
    within = t - slot * SLOT_S
    aspects = {arm: "red" for arm in ARMS}
    if within < GREEN_S:
        aspects[CYCLE[slot]] = "green"
    elif within < GREEN_S + YELLOW_S:
        aspects[CYCLE[slot]] = "yellow"
    return aspects


def assumed_last_green_end(arm: str, t_s: float) -> float | None:
    """Clip time at which `arm` was last green before t (may be negative)."""
    slot = CYCLE.index(arm)
    k = (t_s - slot * SLOT_S) // CYCLE_S
    start = slot * SLOT_S + k * CYCLE_S
    end = start + GREEN_S
    return min(end, t_s) if start <= t_s else end - CYCLE_S


def read_assumed_csv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    for r in rows:
        r["t_s"] = float(r["t_s"])
    return rows


def csv_aspects(rows: list[dict], t_s: float) -> dict:
    """Aspects from the 5 s CSV. A 'yellow' row covers the 5 s clearance:
    its first 3 s are shown yellow, its last 2 s all-red."""
    row = rows[0]
    for r in rows:
        if r["t_s"] <= t_s + 1e-9:
            row = r
        else:
            break
    out = {}
    for arm in ARMS:
        aspect = row[arm.lower()]
        if aspect == "yellow" and t_s - row["t_s"] >= YELLOW_S:
            aspect = "red"
        out[arm] = aspect
    return out
