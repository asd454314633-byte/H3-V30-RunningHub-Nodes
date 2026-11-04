# Local end-to-end result (2026-11-04, Windows, RTX 5090 D 24 GB)

Isolated ComfyUI instance built ONLY from this repository's `custom_nodes/`
plus the 7 pinned third-party packages in `docs/DEPENDENCIES.md`.
Synthetic test assets only; production instances untouched.

## Run 2 — current snapshot, tail-12 token refinement included

| Gate | Result |
|---|---|
| B import | 19/19 first-party directories imported, 0 import failures; 84/84 workflow classes + 5 tail-12 classes in /object_info; `/h3/tail12/status` HTTP 200 |
| C six segments | PASS: S1-S6 all SUCCESS. Wall time per segment 144.7 / 107.2 / 141.9 / 107.7 / 108.4 / 108.4 s (S1 includes model load), ~718 s total |
| C tail-12 produce | PASS: S1-S5 each wrote `seg_%05d_tail12` (12 video tokens, 65 audio steps, 2-step refine); S6 (last) correctly does not |
| C tail-12 consume | PASS: submitted graphs of S2-S6 load `seg_00000..00004_tail12` respectively (checked per prompt in /history) |
| C 39-frame protection | PASS: S2-S6 trimmed 39 frames -> 204 frames each |
| C merge | PASS: 1263 frames (243 + 5x204), 52.66 s, H.264 608x1056 + AAC stereo |
| S4 Clean Rebase | NOT TESTED (disabled by default in this workflow) |

The tail-12 refinement is switched on by the workflow flag `extra.h3_tail12=true`
(no separate UI checkbox); the frontend (`H3_Prompt_Sidecar/web/h3_quality_switches.js`,
`h3_six_execute.js`) injects the refinement nodes at submit time.

## Run 1 — first snapshot (superseded, tail-12 missing)

S1-S6 SUCCESS, 88-91 s each, 541 s total, merge 1263 frames. That snapshot did
NOT contain the tail-12 refinement used in production; superseded by Run 2.

## Export changes (see `SHA256_MANIFEST.json` -> `redactions`)
1. `H3_ChineseDirectorUI/js/chinese_director.js`: find continuation nodes on the
   main canvas when subgraph 1056 is inlined (NOLOOP); otherwise every run is refused.
2. Workflow node 992: stale empty S2 manual shot-time table cleared; it blocked
   six-segment chains at segment 2.
3. `h3_conditioning_prebake/model_registry.json` shipped as empty `[]` (import-time required).
4. Local filesystem paths in comments / tool defaults redacted; optional Gemma path
   moved to the `H3_GEMMA_MODEL` environment variable.
5. Tests, lab-only configs and runtime user data (created on demand) are not shipped.

Known non-blocking gap: 3 model files referenced only by disabled optional route
nodes are not listed in `docs/MODEL_INDEX.csv`.

RunningHub cloud installation and execution are NOT verified by this result.
