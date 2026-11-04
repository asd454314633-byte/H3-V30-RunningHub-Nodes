# Third-party dependencies: source-verified Stage-D pins

These commits match representative files of the already-tested local Stage-D candidate. Documentation only; NOT a runtime upgrade.

| Package | Tested baseline | Git commit | Upstream |
|---|---|---|---|
| ComfyUI-MAINodes | 1.0.5 + port patch | `b99bb83f1b024c5b1c6e5368f7b38c9add6d74cf` | https://github.com/matlowai/ComfyUI-MAINodes |
| ComfyUI-Ref2VA-VSA | 1.0.0 | `328d98808f66fe62528d1af02506eeee5f8200a0` | https://github.com/Kablex/ComfyUI-Ref2VA-VSA |
| comfyui-obvpm | 2026-08-16 snapshot | `7d5b977add00c2fb9690dca9a5f20023a47c8a80` | https://github.com/chanon/comfyui-obvpm |
| ComfyUI-KJNodes | 1.5.2 | `d3cfe21625e5170126ce06fbfcfe1d88108688c3` | https://github.com/kijai/ComfyUI-KJNodes |
| rgthree-comfy | 1.0.2608210019 | `13b4399c00b5ef5a97b1b6800fc1185874740f5d` | https://github.com/rgthree/rgthree-comfy |
| ComfyUI-MiniMax-H3-PDD-Acc | 2026-08-30 snapshot | `993566bd49a4776e3b15f617a0b207d75dccaed7` | https://github.com/Jalen-Brunson/ComfyUI-MiniMax-H3-PDD-Acc |
| H3-Optimizations | 0.2.45 | `862774944a331bc1a66cee1cf805b94bd138ebbe` | https://github.com/Zironic/H3-Optimizations |

RunningHub installs third-party plugins separately from upstream only if missing. Do not substitute current main for these validated commits.
MAINodes requires `patches/ComfyUI-MAINodes_v1.0.5_timeline_port_range.patch` applied to commit `b99bb83`.

Licenses: MAINodes GPL-3.0-or-later; Ref2VA-VSA Apache-2.0; pinned old obvpm Apache-2.0 (current main GPL-3.0); KJNodes GPL-3.0; rgthree MIT; PDD-Acc Apache-2.0; H3-Optimizations whole-repository license UNCONFIRMED.
Third-party source and model weights are not redistributed by this reviewer repository.

Audit scope: representative source SHA-256 files matched the Stage-D candidate after accounting for Windows CRLF; not every file or binary was checked.
Local functional results: `docs/LOCAL_E2E_RESULT.md`. Six-segment time 541 s is a measurement, not a public performance deadline. RunningHub cloud validation remains pending.
