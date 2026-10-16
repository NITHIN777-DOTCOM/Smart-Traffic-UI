"""Verify that the PPO repo's replay modules import in the bridge venv (no writes there)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge_common import assert_ppo_clean, load_config  # noqa: E402
import ppo_env  # noqa: E402

cfg = load_config()
app = ppo_env.prepare(cfg)
assert_ppo_clean(cfg, "import check start")
import numpy as np  # noqa: E402

from src.deployment.signal_program import SignalProgram  # noqa: E402,F401
from src.deployment.video_replay import PerceptionObservationAdapter  # noqa: E402,F401
from src.perception.state_extractor import StateExtractor  # noqa: E402,F401
from src.ppo.checkpoint import build_agent_from_checkpoint, load_checkpoint  # noqa: E402,F401
from src.safety.edge_case_governor import EdgeCaseGovernor  # noqa: E402,F401
from src.state.phase_topology import legal_phase_mask, phase_component_mask  # noqa: E402

adj = np.array([[0, 0, 0, 0], [0, 0, 1, 1], [0, 1, 0, 1], [0, 1, 1, 0]], dtype=np.float32)
names = ("NS-through", "NS-protected", "EW-through", "EW-protected")
comp = phase_component_mask(adj, "left")
print("legal mask:", dict(zip(names, legal_phase_mask(adj, "left").tolist())))
for i, n in enumerate(names):
    src = ("North", "South") if i < 2 else ("East", "West")
    print(f"  {n:13s} green arms: {[s for j, s in enumerate(src) if comp[i, j]]}")
print("imports OK from", app)
assert_ppo_clean(cfg, "import check end")
