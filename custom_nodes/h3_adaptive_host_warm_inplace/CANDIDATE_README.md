# PASSIVE AUXILIARY DIRECTORY (candidate A) - NOT the production pack

Contains ONLY `omniref_model_contract.py` (SHA256-verified copy of 8207 runtime,
passive data/logic module: no monkey patching, NODE_CLASS_MAPPINGS = {}).

Required at import time by `h3_partial_diffusion_evict/__init__.py` (fail-closed
RuntimeError "OmniRef model contract unavailable" if absent).

Deliberately EXCLUDED: this pack's real `__init__.py` auto-installs production
hooks (native MiniMaxH3ReferenceToVideo.execute wrap + global
model_management.load_models_gpu replacement). That belongs to candidate B only.
