"""Strict offline-derived OmniRef8 contract shared by candidate lifecycle guards."""
from copy import deepcopy

OMNIREF_CHECKPOINT = "fasth3_omniref_8step_pruned_int8_convrot.safetensors"
OMNIREF_SHA256 = "851b2dc9670ed864b7f1e951ac9da047d83b1c04ded9bfcc1a9e5bba0ee33f80"
OMNIREF_HEADER_SHA256 = "421d5d942bd0b6cb3bc9df322958099b5ffd16b65a3a1b3c2ef82ceed028722f"

# PDD32 output heads are structural identity, independent of residency.
OMNIREF_HEADS = {
    "final_layer.video_out": [3072, 5376],
    "final_layer.audio_out": [1024, 5376],
}

def extend_contracts(existing):
    # Never mutate the frozen Ref2VA entries.
    result = dict(existing)
    base = existing["INT8_CONVROT"]
    weights = dict(base["weights"])
    for block in range(50):
        weights[f"blocks.{block}.attn.to_gate_compress"] = {"shape": [7168, 5376], "bytes": 38535168}
    token_shapes = {
        "attn.qkv_proj": ([21504, 5376], 115605504),
        "attn.out_proj": ([5376, 7168], 38535168),
        "mlp.fc1": ([28672, 5376], 154140672),
        "mlp.fc2": ([5376, 14336], 77070336),
    }
    for block in range(2):
        for suffix, (shape, size) in token_shapes.items():
            weights[f"token_refiner.blocks.{block}.{suffix}"] = {"shape": shape, "bytes": size}
    result["OMNIREF8_INT8_CONVROT"] = {
        **base,
        "checkpoint": OMNIREF_CHECKPOINT,
        "sha256": OMNIREF_SHA256.upper(),
        "file_size": 22213723064,
        "weights": weights,
        "signatures": {**base["signatures"], **OMNIREF_HEADS},
        # Structural signatures below define identity. The storage interval is
        # a sanity bound, not a variant discriminator; runtime model_size may
        # reflect permitted bf16 casting and non-persistent loader buffers.
        "memory_min_bytes": 21000000000,
        "memory_max_bytes": 23000000000,
        "header_sha256": OMNIREF_HEADER_SHA256,
        "range_basis": "21-23 GB structural-model storage sanity bound; identity is exact 258 quant module names/shapes/bytes, ConvRot metadata, PDD32 output heads; residency excluded.",
        "pdd_steps": 32,
    }
    return result

def select_variant(quant, contracts):
    formats = {module.quant_format for module in quant.values()}
    same_format = [name for name, spec in contracts.items() if formats == {spec["quant_format"]}]
    exact = [name for name in same_format if set(quant) == set(contracts[name]["weights"])]
    if len(exact) == 1:
        return exact[0]
    if len(same_format) == 1 and set(quant) != set(contracts[same_format[0]]["weights"]):
        raise RuntimeError("Variant contract: quant module signature mismatch")
    raise RuntimeError("Variant contract: unknown or mixed quant format/signature")

def graph_checkpoint_matches(variant, checkpoint, contracts):
    return checkpoint is not None and variant in contracts and contracts[variant]["checkpoint"] == checkpoint

# Helper-only custom node package: loaded for sibling runtime contract imports; no nodes registered.
NODE_CLASS_MAPPINGS = {}
