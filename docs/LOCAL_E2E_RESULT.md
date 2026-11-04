# Local end-to-end result (2026-11-04, Windows, RTX 5090 D 24 GB)

Isolated ComfyUI instance built ONLY from this repository's `custom_nodes/`
plus the 7 pinned third-party packages in `docs/DEPENDENCIES.md`.
Synthetic test assets only; production instances untouched.

| Gate | Result |
|---|---|
| A static | STATIC_PASS_ONLY: 186 nodes / 240 links / 1 subgraph / 84 node classes |
| B CPU import | 84/84 classes in /object_info; subgraph resolved; workflow loads 186/240 with 0 frontend errors; Sidecar config injection; /h3/* routes live |
| C single segment | PASS: 608x1056, 243 frames, 24 fps, H.264 + AAC stereo, receipt SUCCESS (112.7 s incl. model load) |
| C six segments | PASS: S1-S6 all SUCCESS, 88-91 s each (~7.55 s/it, 8 steps), 541 s total |
| C 39-frame protection | PASS: S2-S6 trimmed 39 frames -> 204 frames each |
| C merge | PASS: 1263 frames (243 + 5x204), 52.6 s, video + stereo audio |
| S4 Clean Rebase | NOT TESTED (disabled by default in this workflow) |

Fixes applied during local testing (see `SHA256_MANIFEST.json` -> `redactions`):
1. `H3_ChineseDirectorUI/js/chinese_director.js`: find continuation nodes on the
   main canvas when subgraph 1056 is inlined (NOLOOP); previously every run was refused.
2. `h3_sampler_to_vae_residency_probe`: passive `H3SamplerToVAEResidencyProbe`
   restored (called by `h3_partial_diffusion_evict`); no global hooks installed.
3. Workflow node 992: stale empty S2 manual shot-time table cleared; it blocked
   six-segment chains at segment 2.
4. `h3_conditioning_prebake/model_registry.json` shipped as empty `[]` (import-time required).
5. Four local filesystem paths in comments / tool defaults redacted.

Known non-blocking gap: 3 model files referenced only by disabled optional route
nodes are not listed in `docs/MODEL_INDEX.csv`.

RunningHub cloud installation and execution are NOT verified by this result.
