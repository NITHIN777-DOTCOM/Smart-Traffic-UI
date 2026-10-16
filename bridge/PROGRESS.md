# Bridge progress log

Unattended run started 2026-10-16 17:05 IST. Times are wall-clock IST.

## Steps

| # | Step | Status | Started | Time taken |
|---|------|--------|---------|------------|
| 0 | Setup (venv, torch CPU, PPO requirements, import check) | done | 17:07 | ~21 min (torch 7 min, other packages 11 min) |
| 1 | assumed_signals.csv, normalised clips, blank North | done | 17:09 | 22.5 min (ffmpeg, overlapped setup) |
| 2 | T-junction replay config + calibration.yaml | done | 17:12 | ~5 min |
| 3 | run_replay.py, smoke test, full runs | done | 17:15 | smoke: 60 s of clip = 114 s wall alone; full: 600 s of clip = 35 min wall per mode, both in parallel (17:38-18:13) |
| 4 | convert.py → public/data | done (11 tests pass) | 17:20 | conversion < 2 s |
| 5 | swap_model.py | done (copy + label tested; full path = run_replay + convert) | 17:22 | |
| 6 | UI changes | done; build + lint pass, checked in the browser | 17:20 | ~1 h incl. checks |
| 7 | Final checks, push | done | 18:14 | ~10 min |

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
- 17:25 venv ready. Versions: torch 2.14.1+cpu, torchvision 0.29.1+cpu, ultralytics 8.4.178,
  opencv-python 5.0.0, numpy 2.4.6, Python 3.11. No pin conflicts (requirements.txt only has floors).
  Install took ~18 min wall (torch 17:07-17:15, rest 17:15-17:25); the media encode overlapped it.
- 17:27 `scripts/check_imports.py`: video_replay, StateExtractor, checkpoint/PPO, governor,
  SignalProgram and phase_topology all import. PPO status clean before/after.
- 17:27 **Phase topology verified** (`phase_component_mask`, adjacency with North row/col zeroed,
  drive_side left): NS-through → South only; NS-protected → South only; EW-through → East + West;
  EW-protected → West only. All four phases stay legal. Matches the expected behaviour.
  Consequence: no phase gives East alone, so the UI needs multi-arm greens (done: `arms: Arm[]`).
- 17:28 PPO tests: ran only the write-free subset (test_signal_program, test_adjacency,
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
- 17:31 Media done: West/East/South/North all 1280x720, 30/1 fps, 18000 frames, 600.00 s
  (`bridge/out/videos/media_report.json`). East re-encodes to 286 MB at CRF 23 (noisy source);
  it is git-ignored so size doesn't matter. Total encode 1349 s.
- 17:31 Confirmed `ppo_normal_mlp_best.pth` (sha256 c9dbdb0c…, episode 300) stores the OLD reward:
  queue_weight 2.0, throughput_weight 5.0, emergency_weight 20.0, emergency_delay_weight 2.0,
  gridlock_weight 3.0, max_wait_penalty 2.0, queue_scale 3.0 → everything from it is provisional.
- 17:32 Smoke test (60 s, PPO): ran first time. 360 steps, 2 decisions, ~300 ms/step (4 cameras),
  first step 5.4 s (model warm-up). Notes:
  - Ultralytics auto-installed `lap==0.5.13` (ByteTrack dependency) into **bridge/.venv** on first
    use. Nothing touched the PPO repo; added `lap` to the README install line.
  - The PPO repo's lane model finds no lane markings in these views, so no lane cache is written
    and CameraBridge uses its synthetic "toward_point" ROI (as designed for cropped views).
  - Fix: trace rows recorded the aspects from *before* the decision taken at that step; now
    `aspects` = in force from that instant, `aspects_observed` = what the model's input saw.
- 17:35 Smoke for both modes in parallel: 2.2 steps/s each (vs 3.1 alone) → parallel is faster
  overall. Converter on the smoke runs: segments, shares and run_info as expected.
- 17:38 Full-clip runs started, PPO and round robin in parallel.
- 17:39 UI dev server + browser starved the CPU (requests hung, replays slowed to 1.4 steps/s);
  stopped it until the runs finish.
- 17:44 `scripts/check_alignment.py`: the UI plays the ORIGINAL clips, perception saw the
  normalised ones. Frame-by-frame at 0/300/590 s (ffmpeg accurate seek, as the browser seeks),
  offset 0 is the best match for every arm (mean abs diff 0.4–1.2 grey levels; ±0.2 s gives
  2.5–44). Trimming only removed the tail, so clip time t is the same moment in both.
  (OpenCV's msec seek is approximate on the VFR West original and wrongly showed +0.2 s at 590 s.)
- 18:13 Full runs finished: 3600 steps each (600 s of clip), PPO 2099 s wall, round robin
  2105 s wall, mean 581 ms/step while both ran (p95 ~1.1 s). PPO repo status clean after each.
  Perception is identical in both modes (same unique-track counts: West 689, East 1012, South 740).
- 18:14 `convert.py` → public/data. PPO (OLD reward) result: 20 decisions, all switches, strictly
  alternating NS-through (South) ↔ EW-through (West + East); never EW-protected, never an
  extension; asked for 30 s at 19 decisions and 15 s once. One governor override: rule 1
  "all lanes empty" at 6:00 (the inbound filter saw ~no queued/dense traffic that instant; this
  is the uncalibrated "moving down the image" direction rule at work, see TODOs). Round robin:
  20 greens, 19 switches (114/h) vs PPO 20 switches (120/h).
- 18:16 Browser check (dev server, DOM read because the pane was hidden): Control shows the
  provisional badge, placeholder device status, replay wording and the assumed-timing label; the
  switch flips between the PPO and round-robin timelines. Live Junction at 0/300/590 s: video
  currentTime = clock time, signal heads/feed chips/decision card match the trace in both modes,
  West + East green together during EW-through. Dashboard renders both labelled sections,
  "Model used" line and citations. Fixed: decision card said "next signal change" counting to the
  next green; now "Yellow in N s".
- 18:17 `check_alignment.py` with the full timelines: ALIGNED; PPO at 0 s yellow West (switched
  away at once), 300 s yellow West+East, 590 s green West+East; round robin 0 s green West,
  300 s green East, 590 s green East — identical to the raw traces.
- 18:20 Final PPO repo check: `git status --porcelain` empty, `--ignored` only the pre-existing
  `.claude/`, HEAD still 6071e3d.

## Final summary

**Works**
- Bridge venv (Python 3.11, CPU torch) imports the PPO repo's replay stack read-only; the PPO
  repo stayed clean at every check (start, after every model run, end).
- `assumed_signals.csv`, normalised 600 s clips + blank North, T-junction replay config,
  uncalibrated `calibration.yaml` with TODOs.
- `runner/run_replay.py --mode ppo|round_robin` on the fixed 30 s cadence, trace + manifest.
- `convert.py` → `public/data/*.json`; 11 converter tests pass.
- `scripts/swap_model.py --checkpoint <path>` (copy + reward label tested; replay + convert path
  is the same code the full runs used).
- UI: `arms: Arm[]` with two-arm greens, StaticDataSource as default (mock/api still build),
  Control switch picks the timeline, dashboard with the two labelled sections, provisional
  badge, assumed-timing labels, placeholder device status. `npm run build` and `npm run lint` pass.

**Provisional**
- Every model output comes from `ppo_normal_mlp_best.pth` (OLD reward, episode 300). The UI shows
  "Provisional — old-reward model" until an ALIGNED checkpoint is swapped in.
- Camera calibration is postponed: speeds use an assumed 25 px/m, "inbound" = moving down the
  image, queue counts are rough. Labelled "uncalibrated" everywhere.
- The round-robin timing is assumed (no signal visible in the footage).
- Open loop: the Observed section cannot show PPO beating round robin; the SUMO section is
  copied from the PPO repo's research results (not re-run).

**Run times**: setup ~21 min, media 22.5 min (overlapped), smoke runs 2-3 min, full runs 35 min
(both modes in parallel), conversion < 2 s. A swap_model full run alone should take ~20 min
(3.1 steps/s alone).

**What you need to do**
1. When the aligned checkpoint arrives: `cd bridge` then
   `.venv/Scripts/python scripts/swap_model.py --checkpoint <path>`, check that it prints ALIGNED,
   check the UI, commit `public/data/*.json`.
2. Calibration: fill the TODOs in `bridge/config/calibration.yaml` (direction rule /
   intersection point per arm first — it decides what counts as inbound), then re-run both modes.
3. Optional: the real capture time of the clips (`capture_start_time`, currently the repo's
   assumed Tuesday 08:00).
