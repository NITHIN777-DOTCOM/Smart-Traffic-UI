"""Classify a checkpoint's stored reward_config as ALIGNED or OLD.

ALIGNED = the PPO repo's configs/reward.yaml (made the default on 2026-10-11).
Anything else, including a checkpoint with no reward_config, is OLD.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

ALIGNED_REWARD = {
    "queue_weight": 4.0,
    "throughput_weight": 20.0,
    "emergency_weight": 1.0,
    "emergency_delay_weight": 0.5,
    "gridlock_weight": 0.0,
    "max_wait_penalty": 1.0,
    "queue_scale": 1.5,
}


def sha256(path: str | Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def classify(reward_config: dict | None) -> dict:
    rc = dict(reward_config or {})
    mismatches = {}
    for key, want in ALIGNED_REWARD.items():
        got = rc.get(key)
        try:
            ok = got is not None and abs(float(got) - want) < 1e-9
        except (TypeError, ValueError):
            ok = False
        if not ok:
            mismatches[key] = {"checkpoint": got, "aligned": want}
    label = "ALIGNED" if not mismatches else "OLD"
    return {
        "label": label,
        "mismatches": mismatches,
        "stored_reward_config_present": bool(rc),
        "checked_keys": dict(ALIGNED_REWARD),
        "stored": {k: rc.get(k) for k in ALIGNED_REWARD},
    }


def label_checkpoint(path: str | Path) -> dict:
    """Load a checkpoint (PPO code must already be importable) and classify it."""
    import torch

    ckpt = torch.load(str(path), map_location="cpu", weights_only=False)
    info = classify(ckpt.get("reward_config") if isinstance(ckpt, dict) else None)
    info["path"] = str(Path(path).resolve())
    info["sha256"] = sha256(path)
    info["format_version"] = ckpt.get("format_version") if isinstance(ckpt, dict) else None
    info["episode"] = ckpt.get("episode") if isinstance(ckpt, dict) else None
    info["global_step"] = ckpt.get("global_step") if isinstance(ckpt, dict) else None
    return info
