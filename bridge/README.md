# Bridge: PPO repo → Smart Traffic UI

Runs the PPO repo's video replay (YOLO26n perception → StateExtractor → PPO policy →
safety governor → SignalProgram) on the Chennai T-junction clips and turns the result into
the static JSON the UI reads from `public/data/`.

**PPO repo:** `C:\Users\Juju\Desktop\Smart-Traffic-PPO` (path set once in
`config/bridge.yaml`, key `ppo_repo`; env `PPO_REPO` overrides).
**PPO repo commit used:** `6071e3dd558ce3e771a5f7950b2f8cb35cac7fb7`
("Add retraining and evaluation handover").

The PPO repo is treated as read-only. Its code is imported through `sys.path`; every process
that runs it has `PYTHONDONTWRITEBYTECODE=1` and `STS_RESULTS_DIR`, `STS_LOGS_DIR`,
`STS_SUMO_FILES_DIR` (and Ultralytics' `YOLO_CONFIG_DIR`) pointing into `bridge/out/ppo_runtime/`.
Its models, configs and data are not redirected; the checkpoint is passed by explicit path.
`git status --porcelain` of the PPO repo is checked at the start and end of every run and must
be empty.

## Junction and signals

- T-junction, three arms: West (`videos/approach_west.mp4`), East (`approach_east.mp4`),
  South (`approach_south.mp4`). No north road.
- The model needs four cameras, so North is a blank black clip and its adjacency row and
  column are zero (`config/replay_tjunction.yaml`).
- With `drive_side: left` the PPO repo's `phase_topology.phase_component_mask` gives:

  | Phase | Green arms |
  |---|---|
  | NS-through | South |
  | NS-protected | South |
  | EW-through | East + West |
  | EW-protected | West |

  So two arms can be green together (EW-through), and East is never green alone.
- **Decision cadence:** fixed, every `decision_interval_s` = 30 s of clip time. At each decision
  the policy (legal mask on, governor on, untrained inputs neutralised) picks a phase. Same phase
  → the green continues, no yellow. Different phase → 3 s yellow, 2 s all-red, then the new green.
  The model's duration output is logged (`requested_duration_s`) but never used for timing.
- **Assumed signal timing (no signal visible in footage):** `data/assumed_signals.csv`, one row
  every 5 s for 0–600 s (`t_s,west,east,south,note`, note = `assumed`). West → East → South,
  each 25 s green + 5 s clearance (3 s yellow + 2 s all-red), 90 s cycle, one arm non-red at a
  time. Used as the round-robin controller and for the PPO run's initial signal state
  (West green at t = 0) and time-since-green inputs.

## Calibration

Postponed. `config/calibration.yaml` holds every calibration value (the PPO repo's defaults)
with `TODO(calibration)` comments; all outputs are labelled **uncalibrated**. Speeds are pixel
based with an assumed 25 px/m, "inbound" means moving down the image, and queue counts are
rough.

## Model

Until the lead's ALIGNED-reward checkpoint arrives, the replay uses the PPO repo's
`models/ppo_normal_mlp_best.pth`, whose stored `reward_config` is the OLD reward. Every output
from it is labelled **provisional (old reward)** and the UI shows a
"Provisional — old-reward model" badge.

A checkpoint is ALIGNED when its stored `reward_config` has queue_weight 4.0,
throughput_weight 20.0, emergency_weight 1.0, emergency_delay_weight 0.5, gridlock_weight 0.0,
max_wait_penalty 1.0 and queue_scale 1.5 (the PPO repo's `configs/reward.yaml`); anything else,
or no stored reward, is OLD (`reward_label.py`).

### Swapping in the aligned checkpoint

```bash
cd bridge
.venv/Scripts/python scripts/swap_model.py --checkpoint "C:\path\to\aligned_checkpoint.pth"
```

This copies the file into `bridge/models/` (git-ignored), prints its reward label (a loud
warning if it is not ALIGNED), re-runs the PPO replay on the full clip (about 30–40 min on
this laptop's CPU, see PROGRESS.md for measured times), re-runs `convert.py` and prints a summary.
Add `--max-seconds 60` for a quick check (convert then accepts the partial run), or `--no-run`
to only copy and label. The round-robin run does not depend on the model and is reused.
Commit the regenerated `public/data/*.json` afterwards.

## Commands

```bash
cd bridge
py -3.11 -m venv .venv
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install "gymnasium>=0.29,<1.0" "numpy>=1.26,<3.0" "pandas>=2.0" "matplotlib>=3.7" "scikit-learn>=1.3" "scipy>=1.11" "pyyaml>=6.0" "ultralytics>=8.1" "opencv-python>=4.8" "imageio-ffmpeg>=0.6" "psutil>=5.9" "pytest>=7.4" "traci==1.18.0" "sumolib==1.18.0" "tensorboard>=2.15"
.venv/Scripts/python scripts/check_imports.py           # imports + phase topology
.venv/Scripts/python scripts/prepare_media.py           # CSV, normalised clips, blank North (needs ffmpeg)
.venv/Scripts/python runner/run_replay.py --mode ppo --max-seconds 60          # smoke test
.venv/Scripts/python runner/run_replay.py --mode ppo                           # full clip
.venv/Scripts/python runner/run_replay.py --mode round_robin                   # full clip
.venv/Scripts/python convert.py                         # -> ../public/data/*.json
.venv/Scripts/python -B -m pytest -q -p no:cacheprovider tests
```

## Outputs

`bridge/out/` (git-ignored):

- `videos/` – normalised clips (1280x720, 30 fps CFR, H.264, 600 s) + `north_blank.mp4` +
  `media_report.json`. The originals in `videos/` are never modified. Trimming only removes the
  tail, so clip second *t* is the same moment in the original and the normalised file.
- `lanes/` – lane geometry caches written by the PPO repo's CameraBridge on first sight.
- `<mode>_<timestamp>/trace.jsonl` – one row per perception step (6 Hz): clip time, aspects per
  arm, green arms, vehicles per arm (detections, tracked records, unique tracks), queue per arm
  (normalised StateExtractor value and a rough vehicle count, both labelled), decision fields
  (proposed / governed phase, override + rule, requested duration), latency.
- `<mode>_<timestamp>/manifest.json` – checkpoint path + sha256 + reward label, PPO repo commit,
  full config, calibration status, cadence, clip durations, timings.
- `ppo_runtime/` – where the PPO code's own logs/results/settings would go.

`public/data/` (committed, read by the UI's StaticDataSource):
`ppo_timeline.json`, `round_robin_timeline.json`, `observed_metrics.json`,
`simulation_metrics.json` (copied from the PPO repo's `research/results/*.md`, with citations;
SUMO is not re-run), `run_info.json`.

## What the numbers mean

The footage is recorded, so the replay is **open loop**: the signals the controllers choose do
not change the video. The dashboard therefore keeps two separate sections:

- **Observed on Chennai footage** – what our runs actually output: vehicles detected per arm,
  decisions, switches per hour, green/yellow/red share per arm, governor overrides, model
  duration requests. It cannot show PPO beating round robin.
- **Simulation (SUMO)** – PPO vs fixed time from the PPO repo's research results, with the
  source file and the reward/checkpoint each row used.
