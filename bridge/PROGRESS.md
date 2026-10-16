# Bridge progress log

Unattended run started 2026-10-16 17:05 IST. Times are wall-clock IST.

## Steps

| # | Step | Status | Started | Time taken |
|---|------|--------|---------|------------|
| 0 | Setup (venv, torch CPU, PPO requirements, import check) | done | 17:06 | ~38 min (mostly pip on Windows) |
| 1 | assumed_signals.csv, normalised clips, blank North | in progress | 17:09 | |
| 2 | T-junction replay config + calibration.yaml | done | 17:15 | ~10 min |
| 3 | run_replay.py, smoke test, full runs | | | |
| 4 | convert.py → public/data | | | |
| 5 | swap_model.py | | | |
| 6 | UI changes | | | |
| 7 | Final checks, push | | | |

## Log

- 17:05 PPO repo `git status --porcelain` empty at start. HEAD `6071e3dd558ce3e771a5f7950b2f8cb35cac7fb7`.
- 17:05 UI repo had 5 uncommitted files (traffic.ts loop-jump fix, mock timeline last green,
  sim.ts last-cycle fit, junction.css / app.css scrollbar fixes) that predate this work.
  **Decision:** committed them unchanged as a separate commit (3d732a6) so the bridge commits
  only carry bridge changes and the files I edit later don't mix authorship.
- 17:06 `py -3.11 -m venv bridge/.venv`; torch from https://download.pytorch.org/whl/cpu
  (torch 2.14.1+cpu), then requirements.txt packages minus the edge-deployment ones
  (onnx, onnxscript, onnxruntime, pyserial) which the replay pipeline never imports.
- 17:09 Started prepare_media.py with the system Python 3.14 (stdlib + PyYAML only) so the
  encode overlaps the venv install. Video settings: scale 1280x720 bicubic, fps=30 (CFR),
  libx264 CRF 23 preset medium, yuv420p, no audio, `-t 600`. Shortest source is East at
  600.1 s → trimmed to 600 s.
- 17:44 venv ready. Versions: torch 2.14.1+cpu, torchvision 0.29.1+cpu, ultralytics 8.4.178,
  opencv-python 5.0.0, numpy 2.4.6, Python 3.11. No pin conflicts (requirements.txt only has floors).
  Install took ~38 min wall (torch wheel + Defender scanning); the media encode overlapped it.
- 17:45 `scripts/check_imports.py`: video_replay, StateExtractor, checkpoint/PPO, governor,
  SignalProgram and phase_topology all import. PPO status clean before/after.
- 17:45 **Phase topology verified** (`phase_component_mask`, adjacency with North row/col zeroed,
  drive_side left): NS-through → South only; NS-protected → South only; EW-through → East + West;
  EW-protected → West only. All four phases stay legal. Matches the expected behaviour.
  Consequence: no phase gives East alone, so the UI needs multi-arm greens (done: `arms: Arm[]`).
- 17:46 PPO tests: ran only the write-free subset (test_signal_program, test_adjacency,
  test_yolo26_replay) from bridge/out with `-B -p no:cacheprovider --rootdir bridge/out` and the
  STS_* output redirects: **24 passed**. Skipped the rest: several tests use tmp/model/results dirs or
  subprocesses and I can't guarantee they write nothing into the repo. `git status --porcelain
  --ignored` in the PPO repo shows only the pre-existing `.claude/` before and after.
- Decision: Ultralytics settings are redirected with YOLO_CONFIG_DIR to bridge/out/ppo_runtime/
  (otherwise it writes to the user profile; never into the PPO repo either way).
- Decision: replay config is a template (bridge/config/replay_tjunction.yaml); the runner fills
  in absolute paths to bridge/out/videos and bridge/out/lanes and writes the resolved copy into
  the run folder. Lane caches go to bridge/out/lanes/ (the repo's DETRAC lane caches are for
  960x540 views of other roads, so they are not reused).
- Decision: SignalProgram is used with min_green 0 and a very long max_green/requested green so the
  bridge's fixed 30 s cadence owns every switch; `advance(0)` right after a switching request makes
  the yellow start exactly at the decision time. The remaining-phase-time input is
  (time to next decision)/60 s, 60 s being the repo replay profile's max_green.
- Decision: time-since-green at t=0 is seeded from the assumed timing (East last green ended
  at -35 s, South at -5 s, West green at 0, North never) by setting StateExtractor's per-approach
  last-green clock after reset (in-process only).
