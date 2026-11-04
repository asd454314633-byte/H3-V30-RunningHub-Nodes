# RunningHub engineer review scope

**Not production-ready.** The private review snapshot requires
platform-hosted Python custom-node deployment, frontend JS support,
the H3 Sidecar backend, and /h3/* services. Full six-segment operation
and cloud GPU performance have never been validated on RunningHub.

1. Confirm isolated custom-node install permissions and platform
   ComfyUI/Python/Torch/CUDA/GPU image versions.
2. Install first-party package and pinned third-party dependencies.
3. Verify /object_info registration of all 84 actual node classes;
   UUID subgraph instances are *not* separate installable plugins.
4. Verify Sidecar configuration injection using H3_SIDECAR_CONFIG,
   extension imports and /h3/* API health. Never request production
   sidecar.ini, model registry, user files or API tokens.
5. On Linux, verify H3SelectiveTEUnload telemetry fail-closed path.
6. Only after CPU/preflight acceptance, request an explicit budgeted
   cloud GPU test authorization.

An independent 8210 compiler is not a required part of this review.
Never treat successful import as successful end-to-end generation.
