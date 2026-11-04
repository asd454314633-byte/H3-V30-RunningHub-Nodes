"""Exact MiniMaxH3 residency release after sampling, before all VAE branches."""

import folder_paths
import json
import logging
import hashlib
import math
import os
from pathlib import Path
import sys
import time
import comfy.model_management as mm
import torch



# Identity is independent of current GPU/pinned/HostBuffer residency.
H3_VARIANT_CONTRACTS = {'INT8_CONVROT': {'checkpoint': 'minimax_h3_ref2va_pruned_int8_convrot.safetensors', 'sha256': '9255F52B6677845AD238F20DFAAFA94727053694127AB7F255C048F0F9365779', 'file_size': 20970379616, 'quant_format': 'int8_tensorwise', 'weights': {'blocks.0.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.0.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.0.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.0.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.1.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.1.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.1.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.1.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.10.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.10.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.10.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.10.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.11.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.11.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.11.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.11.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.12.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.12.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.12.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.12.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.13.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.13.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.13.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.13.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.14.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.14.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.14.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.14.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.15.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.15.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.15.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.15.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.16.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.16.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.16.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.16.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.17.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.17.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.17.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.17.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.18.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.18.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.18.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.18.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.19.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.19.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.19.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.19.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.2.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.2.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.2.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.2.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.20.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.20.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.20.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.20.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.21.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.21.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.21.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.21.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.22.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.22.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.22.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.22.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.23.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.23.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.23.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.23.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.24.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.24.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.24.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.24.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.25.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.25.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.25.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.25.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.26.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.26.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.26.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.26.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.27.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.27.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.27.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.27.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.28.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.28.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.28.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.28.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.29.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.29.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.29.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.29.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.3.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.3.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.3.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.3.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.30.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.30.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.30.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.30.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.31.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.31.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.31.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.31.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.32.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.32.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.32.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.32.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.33.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.33.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.33.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.33.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.34.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.34.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.34.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.34.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.35.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.35.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.35.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.35.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.36.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.36.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.36.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.36.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.37.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.37.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.37.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.37.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.38.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.38.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.38.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.38.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.39.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.39.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.39.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.39.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.4.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.4.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.4.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.4.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.40.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.40.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.40.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.40.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.41.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.41.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.41.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.41.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.42.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.42.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.42.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.42.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.43.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.43.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.43.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.43.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.44.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.44.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.44.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.44.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.45.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.45.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.45.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.45.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.46.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.46.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.46.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.46.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.47.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.47.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.47.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.47.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.48.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.48.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.48.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.48.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.49.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.49.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.49.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.49.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.5.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.5.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.5.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.5.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.6.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.6.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.6.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.6.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.7.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.7.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.7.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.7.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.8.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.8.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.8.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.8.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}, 'blocks.9.attn.out_proj': {'shape': [5376, 7168], 'bytes': 38535168}, 'blocks.9.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 115605504}, 'blocks.9.mlp.fc1': {'shape': [28672, 5376], 'bytes': 154140672}, 'blocks.9.mlp.fc2': {'shape': [5376, 14336], 'bytes': 77070336}}, 'signatures': {'video_patch_proj': [5376, 96], 'audio_patch_proj': [5376, 32], 'condition_proj': [5376, 5120]}, 'memory_min_bytes': 20955293488, 'memory_max_bytes': 22643002976, 'header_sha256': 'c1a65ff59085cbed8a6ea7c935ae7e58b1d2f870239df54c58a68fb7989e1cd8', 'range_basis': 'Packed quant weight bytes + nonquant tensors at permitted BF16/FP32 widths; quant metadata/scales excluded from lower bound. No residency threshold.'}, 'NVFP4': {'checkpoint': 'minimax_h3_ref2va_pruned_nvfp4.safetensors', 'sha256': '8EEA02F43902E69904990C4405968D01A13C6656AA392D37AB80331E79B5DF2F', 'file_size': 12528636800, 'quant_format': 'nvfp4', 'weights': {'blocks.0.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.0.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.0.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.0.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.1.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.1.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.1.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.1.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.10.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.10.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.10.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.10.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.11.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.11.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.11.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.11.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.12.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.12.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.12.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.12.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.13.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.13.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.13.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.13.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.14.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.14.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.14.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.14.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.15.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.15.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.15.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.15.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.16.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.16.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.16.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.16.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.17.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.17.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.17.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.17.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.18.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.18.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.18.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.18.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.19.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.19.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.19.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.19.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.2.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.2.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.2.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.2.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.20.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.20.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.20.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.20.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.21.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.21.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.21.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.21.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.22.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.22.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.22.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.22.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.23.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.23.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.23.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.23.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.24.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.24.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.24.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.24.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.25.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.25.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.25.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.25.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.26.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.26.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.26.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.26.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.27.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.27.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.27.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.27.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.28.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.28.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.28.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.28.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.29.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.29.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.29.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.29.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.3.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.3.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.3.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.3.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.30.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.30.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.30.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.30.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.31.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.31.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.31.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.31.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.32.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.32.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.32.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.32.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.33.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.33.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.33.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.33.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.34.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.34.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.34.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.34.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.35.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.35.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.35.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.35.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.36.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.36.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.36.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.36.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.37.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.37.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.37.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.37.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.38.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.38.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.38.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.38.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.39.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.39.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.39.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.39.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.4.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.4.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.4.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.4.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.40.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.40.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.40.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.40.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.41.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.41.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.41.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.41.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.42.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.42.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.42.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.42.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.43.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.43.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.43.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.43.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.44.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.44.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.44.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.44.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.45.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.45.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.45.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.45.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.46.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.46.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.46.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.46.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.47.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.47.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.47.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.47.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.48.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.48.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.48.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.48.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.49.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.49.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.49.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.49.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.5.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.5.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.5.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.5.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.6.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.6.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.6.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.6.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.7.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.7.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.7.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.7.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.8.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.8.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.8.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.8.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}, 'blocks.9.attn.out_proj': {'shape': [5376, 7168], 'bytes': 19267584}, 'blocks.9.attn.qkv_proj': {'shape': [21504, 5376], 'bytes': 57802752}, 'blocks.9.mlp.fc1': {'shape': [28672, 5376], 'bytes': 77070336}, 'blocks.9.mlp.fc2': {'shape': [5376, 14336], 'bytes': 38535168}}, 'signatures': {'video_patch_proj': [5376, 96], 'audio_patch_proj': [5376, 32], 'condition_proj': [5376, 5120]}, 'memory_min_bytes': 11321501488, 'memory_max_bytes': 13009210976, 'header_sha256': 'af8c4e1fd4745336b6c13d9c82e4716bc834f5ecaa7b7f5d377ae649b6bcd820', 'range_basis': 'Packed quant weight bytes + nonquant tensors at permitted BF16/FP32 widths; quant metadata/scales excluded from lower bound. No residency threshold.'}}

# Candidate-only, checkpoint-specific model contract; fail closed if unavailable.
import importlib.util as _h3_importlib_util
_h3_contract_path = Path(__file__).parent.parent / "h3_adaptive_host_warm_inplace" / "omniref_model_contract.py"
_h3_contract_spec = _h3_importlib_util.spec_from_file_location("h3_omniref_model_contract", _h3_contract_path)
if _h3_contract_spec is None or _h3_contract_spec.loader is None:
    raise RuntimeError("OmniRef model contract unavailable")
_h3_contract = _h3_importlib_util.module_from_spec(_h3_contract_spec)
_h3_contract_spec.loader.exec_module(_h3_contract)
H3_VARIANT_CONTRACTS = _h3_contract.extend_contracts(H3_VARIANT_CONTRACTS)

# FL2VA F4 fast-route contract, derived offline from the exact checkpoint file
# (safetensors header inventory + full-file SHA256); runtime re-proves every
# packed weight shape/byte before any release is allowed. The quantized module
# set is the frozen INT8_CONVROT base plus one to_gate_compress per block
# (packed I8 [7168,5376] + F32 per-row scale in the file); token_refiner stays
# unquantized BF16 and therefore contributes no quant module.
FL2VA_F4_CHECKPOINT = 'minimax_h3_fastvideo_vsa_datafree_1300step_4step_int8_convrot.safetensors'
_fl2va_f4_base = H3_VARIANT_CONTRACTS['INT8_CONVROT']
_fl2va_f4_weights = dict(_fl2va_f4_base['weights'])
for _fl2va_block in range(50):
    _fl2va_f4_weights[f'blocks.{_fl2va_block}.attn.to_gate_compress'] = {'shape': [7168, 5376], 'bytes': 38535168}
H3_VARIANT_CONTRACTS['FL2VA_F4_INT8_CONVROT'] = {
    **_fl2va_f4_base,
    'checkpoint': FL2VA_F4_CHECKPOINT,
    'sha256': '7221AE65D78780354D51E5048D29728D9F1F8FB9BAF50B1DD3DF85F5101413D3',
    'file_size': 22898594920,
    'weights': _fl2va_f4_weights,
    'memory_min_bytes': 21000000000,
    'memory_max_bytes': 24800000000,
    'header_sha256': '39AD3A134C3946D6E03A5B7D24EF7D9E3AB8E07C721AB9E91B8D965AAD713D6B',
    'range_basis': '21-24.8 GB structural-model storage sanity bound; identity is the exact 250 quant module names/shapes/bytes; residency excluded.',
}

def h3_variant_identity(entry, checkpoint=None):
    model = entry.model.model
    if (type(model).__module__, type(model).__qualname__) != ('comfy.model_base', 'MiniMaxH3'):
        raise RuntimeError('Variant contract: non-H3 model')
    diffusion = getattr(model, 'diffusion_model', None)
    if (type(diffusion).__module__, type(diffusion).__qualname__) != ('comfy.ldm.minimax.model', 'MiniMaxH3Model'):
        raise RuntimeError('Variant contract: wrong diffusion architecture')
    if (getattr(diffusion, 'hidden_size', None), getattr(diffusion, 'latents_dim', None),
        getattr(diffusion, 'audio_latents_dim', None), tuple(getattr(diffusion, 'patch_size', ())),
        len(diffusion.blocks)) != (5376, 24, 32, (1, 2, 2), 50):
        raise RuntimeError('Variant contract: wrong H3 Ref2VA structure')
    modules = dict(diffusion.named_modules())
    quant = {name: module for name, module in modules.items() if getattr(module, 'quant_format', None) is not None}
    formats = {module.quant_format for module in quant.values()}
    name = _h3_contract.select_variant(quant, H3_VARIANT_CONTRACTS)
    spec = H3_VARIANT_CONTRACTS[name]
    if checkpoint is not None and checkpoint != spec['checkpoint']:
        raise RuntimeError('Variant contract: graph checkpoint / loaded quant mismatch')
    if set(quant) != set(spec['weights']):
        raise RuntimeError('Variant contract: quant module signature mismatch')
    for key, signature in spec['signatures'].items():
        if tuple(modules[key].weight.shape) != tuple(signature):
            raise RuntimeError('Variant contract: projection shape mismatch')
    for key, expected in spec['weights'].items():
        weight = quant[key].weight
        params = getattr(weight, '_params', None)
        if tuple(weight.shape) != tuple(expected['shape']) or weight.nbytes != expected['bytes'] or params is None:
            raise RuntimeError('Variant contract: packed weight shape/size mismatch: ' + key)
        if name == 'INT8_CONVROT' and (getattr(params, 'convrot', None) is not True or getattr(params, 'convrot_groupsize', None) != 256):
            raise RuntimeError('Variant contract: INT8 ConvRot metadata mismatch')
        if name == 'NVFP4' and (getattr(params, 'block_scale', None) is None or getattr(params, 'scale', None) is None):
            raise RuntimeError('Variant contract: NVFP4 scales missing')
    memory = entry.model_memory()
    if isinstance(memory, bool) or not isinstance(memory, (int, float)) or not math.isfinite(memory) or not spec['memory_min_bytes'] <= memory <= spec['memory_max_bytes']:
        raise RuntimeError('Variant contract: variant-specific model storage mismatch')
    return {'variant': name, 'checkpoint': spec['checkpoint'], 'quant_format': spec['quant_format'],
            'quant_modules': len(quant), 'model_memory_bytes': memory,
            'memory_min_bytes': spec['memory_min_bytes'], 'memory_max_bytes': spec['memory_max_bytes'],
            'frozen_checkpoint_sha256': spec['sha256'], 'sha_scope': 'Preflight file hash; runtime checks architecture/quant/shape/storage, not full byte hash',
            'residency_used_as_identity': False}

def select_loaded_h3_candidate(targets, checkpoint, identity_fn=None):
    """Select the graph's H3 variant; otherwise use Comfy's newest/currently-used ordering."""
    identity_fn = identity_fn or h3_variant_identity
    if not targets:
        raise RuntimeError('Expected exactly one exact MiniMaxH3 LoadedModel')

    seen = set()
    valid = []
    rejected = []
    for index, candidate in enumerate(targets):
        entry, patcher, model = candidate
        identity = (id(entry), id(patcher), id(model))
        if len(set(identity)) != 3 or identity in seen:
            raise RuntimeError('Duplicate MiniMaxH3 LoadedModel identity; refusing ambiguous release')
        seen.add(identity)
        try:
            variant = identity_fn(entry, checkpoint)
        except RuntimeError as exc:
            rejected.append({'index': index, 'entry_id': id(entry), 'reason': str(exc)})
            continue
        valid.append((index, entry, patcher, model, variant))

    if not valid:
        raise RuntimeError('Expected exactly one exact MiniMaxH3 LoadedModel')

    if len(valid) == 1:
        selected = valid[0]
        reason = 'graph_checkpoint_identity'
    else:
        used = [candidate for candidate in valid if getattr(candidate[1], 'currently_used', False)]
        if len(used) == 1:
            selected = used[0]
            reason = 'unique_currently_used'
        else:
            # ComfyUI inserts newly loaded entries at current_loaded_models[0].
            selected = valid[0]
            reason = 'current_loaded_models_newest_first'

    index, entry, patcher, model, variant = selected
    evidence = {
        'reason': reason,
        'selected_index_newest_first': index,
        'selected_entry_id': id(entry),
        'candidate_count': len(targets),
        'checkpoint_match_count': len(valid),
        'rejected_candidates': rejected,
    }
    return entry, patcher, model, variant, evidence

def branch_identity(prompt, unique_id, ancestors):
    """Prove the active guider's model lineage, never infer from UI labels."""
    def linked(node, key, slot=0):
        ref = node['inputs'].get(key)
        if not isinstance(ref, list) or len(ref) != 2 or ref[1] != slot or str(ref[0]) not in prompt:
            raise RuntimeError('Unknown H3 branch: invalid ' + key + ' link')
        return str(ref[0])

    sampler = prompt[linked(prompt[str(unique_id)], 'latent')]
    if sampler['class_type'] != 'SamplerCustomAdvanced':
        raise RuntimeError('Unknown H3 branch: expected final sampler latent')
    guider = prompt[linked(sampler, 'guider')]
    if guider['class_type'] != 'BasicGuider':
        raise RuntimeError('Unknown H3 branch: expected BasicGuider')
    current = linked(guider, 'model')
    seen = set()
    route = []
    while current not in seen:
        seen.add(current)
        node = prompt[current]
        kind = node['class_type']
        route.append((current, node))
        if kind == 'UNETLoader':
            break
        if kind == 'Any Switch (rgthree)':
            active = [key for key in node['inputs'] if key.startswith('any_')]
            if len(active) != 1:
                raise RuntimeError('Unknown H3 branch: ambiguous model switch')
            current = linked(node, active[0])
        elif kind in ('ModelAttentionBackend', 'H3MemoryOptimization', 'ModelPreviewOverrideKJ',
                      'MiniMaxH3SigmaShift', 'LoraLoaderModelOnly', 'MiniMaxH3PDDAccApply'):
            current = linked(node, 'model')
        elif kind == 'BlockSparseAttention':
            # OmniRef8 is accepted only with the exact VSA contract used by
            # this candidate. Unknown sparse layouts remain fail-closed.
            if any(n['class_type'] == kind for _, n in route[:-1]):
                raise RuntimeError('Unknown H3 branch: duplicate BlockSparseAttention patches')
            inputs = node['inputs']
            expected = {'selection': 'vsa', 'selection.keep_percent': 10,
                        'start_percent': 0, 'end_percent': 1,
                        'dense_blocks': '', 'min_tokens': 12288,
                        'extra_tokens': 256,
                        'sink_conditioning': 'exact_kv_and_rows', 'verbose': False}
            if (set(inputs) != set(expected) | {'model'} or
                    any(inputs.get(key) != value for key, value in expected.items())):
                raise RuntimeError('Unknown H3 branch: unvalidated OmniRef VSA contract')
            current = linked(node, 'model')
        elif kind == 'MiniMaxH3SparkAttentionSM120':
            # T018: Spark-H3 replaces the VSA node only with the exact T017 C4
            # contract (speed, 10%); optional inputs may be omitted or default.
            if any(n['class_type'] in (kind, 'BlockSparseAttention') for _, n in route[:-1]):
                raise RuntimeError('Unknown H3 branch: duplicate sparse attention patches')
            inputs = node['inputs']
            expected = {'mode': 'speed', 'steps': 8, 'warmup_mode': 'warmup_ratio',
                        'warmup_ratio': 0.0, 'warmup_steps': 0, 'topk_mode': 'topk_ratio',
                        'topk_ratio': 0.1, 'topk_blocks': 228, 'dense_layers': 0,
                        'min_tokens': 12288, 'strict': True}
            optional = {'dense_backend': 'inherit', 'tail_granularity': 'query',
                        'reblock_layout': 'q_reuse_k', 'sparse_scope': 'target-video',
                        'producer_chunk': 16384}
            if (not set(expected) | {'model'} <= set(inputs) <= set(expected) | set(optional) | {'model'} or
                    any(inputs.get(key) != value for key, value in expected.items()) or
                    any(key in inputs and inputs[key] != value for key, value in optional.items())):
                raise RuntimeError('Unknown H3 branch: unvalidated OmniRef Spark contract')
            current = linked(node, 'model')
        elif kind == 'H3PrecisionAudit':
            # Opt-in observation clone; no weight/attention edits. Keep all
            # model/PDD/provenance checks below, and reject duplicate observers.
            if any(n['class_type'] == kind for _, n in route[:-1]):
                raise RuntimeError('Unknown H3 branch: duplicate precision observers')
            if set(node['inputs']) != {'model', 'label'} or not isinstance(node['inputs']['label'], str):
                raise RuntimeError('Unknown H3 branch: invalid precision observer')
            current = linked(node, 'model')
        elif kind == 'MiniMaxH3FunControlNetApply':
            # Official MODEL clone: prove this validated Union2 route, but keep
            # release ownership on the actual H3 LoadedModel below. Its sampler
            # owns Fun patch cleanup; this guard never unloads the control model.
            if any(n['class_type'] == kind for _, n in route[:-1]):
                raise RuntimeError('Unknown H3 branch: multiple Fun control patches')
            control = prompt[linked(node, 'model_patch')]
            if (control['class_type'] != 'ModelPatchLoader' or
                    control['inputs'].get('name') !=
                    'minimax_h3_fun_controlnet_union_2.0_pruned_int8_convrot.safetensors'):
                raise RuntimeError('Unknown H3 branch: unvalidated Fun control model patch')
            current = linked(node, 'model')
        else:
            raise RuntimeError('Unknown H3 branch: unsupported model route ' + kind)
    else:
        raise RuntimeError('Unknown H3 branch: model route cycle')
    pdds = [(nid, node) for nid, node in route if node['class_type'] == 'MiniMaxH3PDDAccApply']
    loras = [(nid, node) for nid, node in route if node['class_type'] == 'LoraLoaderModelOnly']
    all_pdds = [nid for nid in ancestors if prompt[nid]['class_type'] == 'MiniMaxH3PDDAccApply']
    all_loras = [nid for nid in ancestors if prompt[nid]['class_type'] == 'LoraLoaderModelOnly']
    if len(pdds) == 1 and all_pdds == [pdds[0][0]] and all_loras == [nid for nid, _ in loras]:
        pdd_id, pdd = pdds[0]
        pdd_inputs = pdd['inputs']
        if (pdd_inputs.get('enabled', True) is not True or
                pdd_inputs.get('pdd_file') != 'MiniMax-H3-Ref2VA-Acc-8Step.safetensors' or
                str(pdd_inputs.get('nfe')) != '8'):
            raise RuntimeError('Unknown H3 branch: unvalidated PDD8 identity')
        route_ids = [nid for nid, _ in route]
        # PDD8's trained curves are frozen to this exact checkpoint; the
        # variant-contract set now also contains other INT8 checkpoints, so
        # the route terminal must be re-proven here to keep the pdd8 branch
        # from accepting a mixed PDD8-on-other-checkpoint graph.
        if (route[-1][1]['class_type'] != 'UNETLoader' or
                route[-1][1]['inputs'].get('unet_name') !=
                'minimax_h3_ref2va_pruned_int8_convrot.safetensors'):
            raise RuntimeError('Unknown H3 branch: PDD8 requires the frozen Ref2VA INT8 checkpoint')
        if not loras:
            return {'branch': 'pdd8', 'model_route': route_ids, 'pdd_node': pdd_id,
                    'people_lora': None}
        if len(loras) == 1:
            lora_id, lora = loras[0]
            inputs = lora['inputs']
            name = inputs.get('lora_name', '').replace('\\', '/')
            strength = inputs.get('strength_model')
            # route is traversed from sampler toward the source UNET: PDD must
            # consume the already-LoRA-patched MODEL, not the reverse.
            if (name == 'h3-realism-people-t2v-i2v-r2v.safetensors' and
                    isinstance(strength, (int, float)) and not isinstance(strength, bool) and
                    math.isfinite(strength) and strength == 1.0 and
                    route_ids.index(pdd_id) < route_ids.index(lora_id) and
                    route[-1][1]['class_type'] == 'UNETLoader' and
                    route[-1][1]['inputs'].get('unet_name') ==
                    'minimax_h3_ref2va_pruned_int8_convrot.safetensors'):
                return {'branch': 'pdd8_people_lora', 'model_route': route_ids,
                        'pdd_node': pdd_id, 'people_lora_node': lora_id,
                        'people_lora': name, 'people_lora_strength': float(strength),
                        'people_lora_sha256':
                        'ACC529601D2DA117FB81179E76C56E488A3BEAB1171659D305F04FA3655B787E'}
        raise RuntimeError('Unknown H3 branch: PDD8 permits only the allowlisted People LoRA')
    if not pdds and not all_pdds and not loras and not all_loras:
        route_ids = [nid for nid, _ in route]
        terminal = route[-1][1] if route else {}
        if (terminal.get('class_type') == 'UNETLoader' and
                terminal.get('inputs', {}).get('unet_name') ==
                'fasth3_omniref_8step_pruned_int8_convrot.safetensors'):
            # Spark-H3 sits in the VSA slot; branch_identity already enforced its contract.
            sparse = [(nid, node) for nid, node in route
                      if node['class_type'] in ('BlockSparseAttention', 'MiniMaxH3SparkAttentionSM120')]
            route_types = ['BlockSparseAttention' if node['class_type'] == 'MiniMaxH3SparkAttentionSM120'
                           else node['class_type'] for _, node in route]
            expected_types = ['Any Switch (rgthree)', 'BlockSparseAttention',
                              'ModelAttentionBackend', 'MiniMaxH3SigmaShift', 'UNETLoader']
            # Official KJ preview clones MODEL and adds only OUTER_SAMPLE.
            preview_types = ['Any Switch (rgthree)', 'ModelPreviewOverrideKJ', *expected_types[1:]]
            attention = [node for _, node in route if node['class_type'] == 'ModelAttentionBackend']
            shifts = [node for _, node in route if node['class_type'] == 'MiniMaxH3SigmaShift']
            if len(sparse) != 1 or route_types not in (expected_types, preview_types):
                raise RuntimeError('Unknown H3 branch: OmniRef8 requires one validated VSA node')
            if (len(attention) != 1 or
                    attention[0]['inputs'].get('attention') != 'comfy kitchen attention' or
                    set(attention[0]['inputs']) != {'model', 'attention'} or
                    len(shifts) != 1 or
                    shifts[0]['inputs'].get('shift_video') != 12 or
                    shifts[0]['inputs'].get('shift_audio') != 3 or
                    set(shifts[0]['inputs']) != {'model', 'shift_video', 'shift_audio'}):
                raise RuntimeError('Unknown H3 branch: unvalidated OmniRef attention/sigma route')
            def choice(key):
                node = prompt[linked(sampler, key)]
                if node['class_type'] == 'Any Switch (rgthree)':
                    keys = [k for k in node['inputs'] if k.startswith('any_')]
                    if len(keys) != 1:
                        raise RuntimeError('Unknown H3 branch: ambiguous OmniRef ' + key)
                    node = prompt[linked(node, keys[0])]
                return node
            schedule, algorithm = choice('sigmas'), choice('sampler')
            if (terminal['inputs'].get('weight_dtype') != 'default' or
                    schedule['class_type'] != 'BasicScheduler' or
                    schedule['inputs'].get('scheduler') != 'simple' or
                    schedule['inputs'].get('steps') != 8 or
                    schedule['inputs'].get('denoise') != 1 or
                    schedule['inputs'].get('model') != [sparse[0][0], 0] or
                    algorithm['class_type'] != 'KSamplerSelect' or
                    algorithm['inputs'].get('sampler_name') != 'euler'):
                raise RuntimeError('Unknown H3 branch: OmniRef8 requires VSA/simple/Euler/8 steps')
            return {'branch': 'omniref8', 'model_route': route_ids,
                    'pdd_node': None, 'people_lora': None,
                    'checkpoint': 'fasth3_omniref_8step_pruned_int8_convrot.safetensors',
                    'PDD_REQUIREMENT': 'PDD32 checkpoint heads; no legacy PDD Apply'}
        if (terminal.get('class_type') == 'UNETLoader' and
                terminal.get('inputs', {}).get('unet_name') ==
                'minimax_h3_ref2va_pruned_int8_convrot.safetensors'):
            route_types = [node['class_type'] for _, node in route]
            expected_routes = (
                ['Any Switch (rgthree)', 'ModelPreviewOverrideKJ',
                 'Any Switch (rgthree)', 'UNETLoader'],
                # The V29 Full Director candidate's actual default route is
                # a two-selector chain; the UI-selected preview override is
                # absent from its active API graph. Keep this exact shape
                # allowlisted while all unknown model nodes remain rejected.
                ['Any Switch (rgthree)', 'Any Switch (rgthree)', 'UNETLoader'],
            )
            if route_types not in expected_routes:
                raise RuntimeError('Unknown H3 branch: unvalidated original Ref2VA model route')
            sampler_node = prompt[linked(sampler, 'sampler')]
            if (sampler_node['class_type'] != 'Any Switch (rgthree)' or
                    len([k for k in sampler_node['inputs'] if k.startswith('any_')]) != 1):
                raise RuntimeError('Unknown H3 branch: ambiguous original Ref2VA sampler switch')
            sampler_choice = prompt[linked(sampler_node,
                next(k for k in sampler_node['inputs'] if k.startswith('any_')))]
            sigma_node = prompt[linked(sampler, 'sigmas')]
            if (sigma_node['class_type'] != 'Any Switch (rgthree)' or
                    len([k for k in sigma_node['inputs'] if k.startswith('any_')]) != 1):
                raise RuntimeError('Unknown H3 branch: ambiguous original Ref2VA sigma switch')
            scheduler = prompt[linked(sigma_node,
                next(k for k in sigma_node['inputs'] if k.startswith('any_')))]
            if (sampler_choice['class_type'] != 'KSamplerSelect' or
                    sampler_choice['inputs'].get('sampler_name') != 'er_sde' or
                    scheduler['class_type'] != 'BasicScheduler' or
                    scheduler['inputs'].get('scheduler') != 'beta'):
                raise RuntimeError('Unknown H3 branch: original Ref2VA sampler/scheduler mismatch')
            steps_node = prompt[linked(scheduler, 'steps')]
            if (steps_node['class_type'] != 'Any Switch (rgthree)' or
                    len([k for k in steps_node['inputs'] if k.startswith('any_')]) != 1):
                raise RuntimeError('Unknown H3 branch: ambiguous original Ref2VA step switch')
            steps_source = prompt[linked(steps_node,
                next(k for k in steps_node['inputs'] if k.startswith('any_')))]
            if (steps_source['class_type'] != 'PrimitiveInt' or
                    steps_source['inputs'].get('value') != 8):
                raise RuntimeError('Unknown H3 branch: original Ref2VA is limited to verified default 8 steps')
            if terminal['inputs'].get('weight_dtype') != 'default':
                raise RuntimeError('Unknown H3 branch: original Ref2VA loader contract mismatch')
            return {'branch': 'ref2va_original_default8', 'model_route': route_ids,
                    'checkpoint': 'minimax_h3_ref2va_pruned_int8_convrot.safetensors',
                    'sampler': 'er_sde', 'scheduler': 'beta', 'steps': 8,
                    'pdd_node': None, 'people_lora': None}
        if (terminal.get('class_type') == 'UNETLoader' and
                terminal.get('inputs', {}).get('unet_name') == FL2VA_F4_CHECKPOINT):
            # FL2VA first/last-frame fast route: F4 INT8 4-step euler/simple.
            # The active API graph prunes the inactive OmniRef branch, so the
            # preview override node appears only when the user enabled it.
            route_types = [node['class_type'] for _, node in route]
            expected_routes = (
                ['Any Switch (rgthree)', 'ModelPreviewOverrideKJ',
                 'Any Switch (rgthree)', 'MiniMaxH3SigmaShift', 'UNETLoader'],
                ['Any Switch (rgthree)', 'Any Switch (rgthree)',
                 'MiniMaxH3SigmaShift', 'UNETLoader'],
            )
            if route_types not in expected_routes:
                raise RuntimeError('Unknown H3 branch: unvalidated FL2VA F4 model route')
            shifts = [node for _, node in route if node['class_type'] == 'MiniMaxH3SigmaShift']
            if (len(shifts) != 1 or
                    shifts[0]['inputs'].get('shift_video') != 12 or
                    shifts[0]['inputs'].get('shift_audio') != 3 or
                    set(shifts[0]['inputs']) != {'model', 'shift_video', 'shift_audio'}):
                raise RuntimeError('Unknown H3 branch: unvalidated FL2VA F4 sigma route')
            sampler_node = prompt[linked(sampler, 'sampler')]
            if (sampler_node['class_type'] != 'Any Switch (rgthree)' or
                    len([k for k in sampler_node['inputs'] if k.startswith('any_')]) != 1):
                raise RuntimeError('Unknown H3 branch: ambiguous FL2VA F4 sampler switch')
            sampler_choice = prompt[linked(sampler_node,
                next(k for k in sampler_node['inputs'] if k.startswith('any_')))]
            sigma_node = prompt[linked(sampler, 'sigmas')]
            if (sigma_node['class_type'] != 'Any Switch (rgthree)' or
                    len([k for k in sigma_node['inputs'] if k.startswith('any_')]) != 1):
                raise RuntimeError('Unknown H3 branch: ambiguous FL2VA F4 sigma switch')
            scheduler = prompt[linked(sigma_node,
                next(k for k in sigma_node['inputs'] if k.startswith('any_')))]
            if (sampler_choice['class_type'] != 'KSamplerSelect' or
                    sampler_choice['inputs'].get('sampler_name') != 'euler' or
                    scheduler['class_type'] != 'BasicScheduler' or
                    scheduler['inputs'].get('scheduler') != 'simple' or
                    scheduler['inputs'].get('steps') != 4 or
                    scheduler['inputs'].get('denoise') != 1 or
                    terminal['inputs'].get('weight_dtype') != 'default'):
                raise RuntimeError('Unknown H3 branch: FL2VA F4 sampler contract mismatch')
            return {'branch': 'fl2va_f4_fast4', 'model_route': route_ids,
                    'pdd_node': None, 'people_lora': None,
                    'checkpoint': FL2VA_F4_CHECKPOINT,
                    'PDD_REQUIREMENT': 'NONE'}

    if not pdds and not all_pdds and len(loras) == 1 and all_loras == [loras[0][0]]:
        inputs = loras[0][1]['inputs']
        name = inputs.get('lora_name', '').replace('\\', '/')
        strength = inputs.get('strength_model')
        if (name == 'MINIMAX/minimax_h3_ref2v_turbo_8step_v1.0_768p_comfyui_bf16.safetensors'
                and isinstance(strength, (int, float)) and not isinstance(strength, bool)
                and math.isfinite(strength) and strength != 0):
            return {'branch': 'stable8', 'model_route': [nid for nid, _ in route],
                    'turbo_lora': name, 'PDD_REQUIREMENT': 'NONE'}
    raise RuntimeError('Unknown or conflicting H3 branch; fail closed')


def verify_pdd_people_patch_stack(patcher, prompt, branch):
    """Prove exact PDD and allowlisted People-LoRA patches, including overlays."""
    import comfy.lora
    import comfy.utils
    import folder_paths
    # The PDD node package keeps this helper as a relative module; its folder
    # is not on sys.path as a top-level import in this isolated runtime.
    try:
        import pdd_acc_core
    except ModuleNotFoundError as exc:
        if exc.name != 'pdd_acc_core':
            raise
        import importlib
        # Match MiniMaxH3PDDAccApply's registered Comfy package and its normal
        # relative submodule import instead of changing sys.path or duplicating
        # the PDD core module.
        pdd_acc_core = importlib.import_module(
            'custom_nodes.ComfyUI-MiniMax-H3-PDD-Acc.pdd_acc_core')

    people_name = branch['people_lora']
    people_path = Path(folder_paths.get_full_path_or_raise('loras', people_name))
    digest = hashlib.sha256()
    with people_path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    if digest.hexdigest().upper() != branch['people_lora_sha256']:
        raise RuntimeError('People LoRA file SHA256 mismatch')
    people_sd = comfy.utils.load_torch_file(str(people_path), safe_load=True)
    key_map = comfy.lora.model_lora_keys_unet(patcher.model, {})
    people_loaded = comfy.lora.load_lora(people_sd, key_map)
    if not people_loaded:
        raise RuntimeError('People LoRA matched no H3 model patch keys')

    pdd_name = prompt[branch['pdd_node']]['inputs']['pdd_file']
    pdd_path = folder_paths.get_full_path_or_raise('pdd_acc', pdd_name)
    pdd_sd, metadata = comfy.utils.load_torch_file(
        pdd_path, safe_load=True, return_metadata=True)
    pdd_lora_sd, _heads, _config = pdd_acc_core.split_pdd_state_dict(
        pdd_sd, metadata, pdd_name)
    # Mirror MiniMaxH3PDDAccApply exactly. On pruned H3 checkpoints the PDD
    # node rebases each AdaLN curve LoRA into both a weight diff and a bias
    # diff. comfy.lora.load_lora maps each .diff_b to a separate target .bias
    # patch; omitting this official transformation makes those legitimate
    # PDD patches look like unknown extras at the release gate.
    pdd_nodes = __import__(
        'custom_nodes.ComfyUI-MiniMax-H3-PDD-Acc.nodes',
        fromlist=['_curve_rebase_if_pruned'])
    # PDD Apply receives Comfy's ModelPatcher. Its helper calls
    # get_model_object("diffusion_model"), which belongs to the patcher;
    # patcher.model is only the MiniMaxH3 model-base object. Mirror Apply.
    pdd_lora_sd, curve_note = pdd_nodes._curve_rebase_if_pruned(
        patcher, pdd_lora_sd, pdd_name)
    pdd_loaded = comfy.lora.load_lora(pdd_lora_sd, key_map)
    pdd_expected_modules = sum(
        1 for key in pdd_lora_sd
        if key.endswith(('.lora_A.weight', '.diff')))
    pdd_expected_entries = sum(
        1 for key in pdd_lora_sd
        if key.endswith(('.lora_A.weight', '.diff', '.diff_b')))
    if (not pdd_expected_modules or
            len(pdd_loaded) != pdd_expected_entries):
        raise RuntimeError(
            'PDD patch key identity mismatch: '
            f'expected {pdd_expected_entries} patch entries from '
            f'{pdd_expected_modules} trained modules, got {len(pdd_loaded)}')

    def patch_key(key):
        return key if isinstance(key, str) else key[0]

    expected = {}
    for key in pdd_loaded:
        expected[patch_key(key)] = expected.get(patch_key(key), 0) + 1
    for key in people_loaded:
        expected[patch_key(key)] = expected.get(patch_key(key), 0) + 1
    actual = {patch_key(key): len(value) for key, value in patcher.patches.items()}
    if actual != expected:
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        bad_counts = sorted((key, expected[key], actual.get(key, 0))
                            for key in set(expected) & set(actual)
                            if expected[key] != actual[key])
        raise RuntimeError('PDD/People patch provenance mismatch: '
                           f'missing={len(missing)} extra={len(extra)} overlays={len(bad_counts)}; '
                           f'missing_keys={missing[:64]} extra_keys={extra[:64]} '
                           f'overlay_keys={bad_counts[:64]}')

    # PDD Apply stores the Head Bank as a ModelPatcher object patch and its
    # sampler wrapper in ModelPatcher.wrappers (not model_options).
    pdd_nodes = __import__(
        'custom_nodes.ComfyUI-MiniMax-H3-PDD-Acc.nodes',
        fromlist=['WRAPPER_KEY'])
    pdd_wrappers = patcher.get_wrappers(
        comfy.patcher_extension.WrappersMP.DIFFUSION_MODEL,
        pdd_nodes.WRAPPER_KEY)
    if ('diffusion_model.final_layer.forward' not in patcher.object_patches or
            len(pdd_wrappers) != 1):
        raise RuntimeError('PDD Head Bank forward patch or sampler wrapper missing')
    shared = set(map(patch_key, pdd_loaded)) & set(map(patch_key, people_loaded))
    curve_bias_count = sum(1 for key in pdd_lora_sd if key.endswith('.diff_b'))
    return {'PDD_PATCH_KEYS': len(pdd_loaded),
            'PDD_TRAINED_MODULES': pdd_expected_modules,
            'PDD_CURVE_BIAS_PATCHES': curve_bias_count,
            'PDD_CURVE_REBASE_NOTE': curve_note,
            'PDD_DIFF_B_SOURCE_KEYS': sorted(
                key for key in pdd_lora_sd if key.endswith('.diff_b')),
            'PEOPLE_LORA_MATCHED_KEYS': len(people_loaded),
            'SHARED_PATCH_KEYS': len(shared), 'PATCH_DICT_KEYS': len(actual),
            'TOTAL_PATCH_ENTRIES': sum(actual.values()), 'PDD_HEAD_BANK_FORWARD': True,
            'PDD_SAMPLER_WRAPPER_COUNT': len(pdd_wrappers),
            'PEOPLE_LORA_SHA256': digest.hexdigest().upper()}


def classify_model_roles(prompt, ancestors, branch):
    """Classify MODEL loaders by their consumers, before releasing only H3."""
    consumers = {}
    for nid in ancestors:
        for field, ref in prompt[nid]['inputs'].items():
            if isinstance(ref, list) and len(ref) == 2 and ref[1] == 0:
                consumers.setdefault(str(ref[0]), []).append((nid, field))
    forward = {'ModelAttentionBackend', 'BlockSparseAttention', 'MiniMaxH3SparkAttentionSM120', 'H3MemoryOptimization', 'ModelPreviewOverrideKJ',
               'MiniMaxH3SigmaShift', 'LoraLoaderModelOnly', 'MiniMaxH3PDDAccApply',
               'MiniMaxH3FunControlNetApply', 'H3PrecisionAudit'}
    auxiliary = {'RTDETR_detect', 'SDPoseKeypointExtractor'}
    loaders = {'UNETLoader', 'CheckpointLoaderSimple'}
    for nid in ancestors:
        node = prompt[nid]
        if node['class_type'] in forward | auxiliary | {'BasicGuider', 'BasicScheduler'}:
            ref = node['inputs'].get('model')
            if isinstance(ref, list) and len(ref) == 2 and str(ref[0]) in prompt:
                if prompt[str(ref[0])]['class_type'] not in loaders | forward | {'Any Switch (rgthree)'}:
                    raise RuntimeError('Unknown model role: unclassified MODEL producer')

    def trace(nid, path):
        if nid in path:
            raise RuntimeError('Unknown model role: MODEL route cycle')
        uses = consumers.get(nid, [])
        if not uses:
            raise RuntimeError('Unknown model role: no proven consumer')
        roles, terminals = set(), []
        for child, field in uses:
            node = prompt[child]; kind = node['class_type']
            if kind == 'BasicGuider' and field == 'model':
                if not any(prompt[k]['class_type'] == 'SamplerCustomAdvanced' and
                           prompt[k]['inputs'].get('guider') == [child, 0] for k in ancestors):
                    raise RuntimeError('Unknown model role: guider without proven sampler')
                roles.add('H3_MAIN_MODEL'); terminals.append(child)
            elif kind in auxiliary and field == 'model':
                roles.add('AUXILIARY_MODEL'); terminals.append(child)
            elif kind == 'BasicScheduler' and field == 'model':
                terminals.append(child)  # Reads model sampling parameters; outputs only SIGMAS.
            elif ((kind in forward and field == 'model') or
                  (kind == 'Any Switch (rgthree)' and field.startswith('any_'))):
                if kind == 'Any Switch (rgthree)' and sum(k.startswith('any_') for k in node['inputs']) != 1:
                    raise RuntimeError('Unknown model role: ambiguous model switch')
                r, t = trace(child, path | {nid}); roles.update(r); terminals.extend(t)
            else:
                raise RuntimeError('Unknown model role: unsupported consumer ' + kind + '.' + field)
        return roles, terminals

    records = []
    for nid in sorted(ancestors):
        node = prompt[nid]
        if node['class_type'] not in loaders:
            continue
        roles, terminals = trace(nid, set())
        if len(roles) != 1:
            raise RuntimeError('Unknown model role: mixed main/auxiliary uses')
        records.append({'loader': nid, 'role': next(iter(roles)), 'consumers': sorted(set(terminals))})
    main = [r['loader'] for r in records if r['role'] == 'H3_MAIN_MODEL']
    if len(main) != 1 or main[0] != branch['model_route'][-1]:
        raise RuntimeError('Expected exactly one sampler-lineage H3 main MODEL loader')
    return records


def graph_branch_contract(prompt, unique_id):
    ancestors = set()
    def visit(nid):
        nid = str(nid)
        if nid in ancestors:
            return
        if nid not in prompt:
            raise RuntimeError('Unknown H3 branch: missing graph node')
        ancestors.add(nid)
        for value in prompt[nid]['inputs'].values():
            if isinstance(value, list) and len(value) == 2 and str(value[0]) in prompt:
                visit(value[0])
    visit(unique_id)
    branch = branch_identity(prompt, unique_id, ancestors)
    return ancestors, branch, classify_model_roles(prompt, ancestors, branch)


def preflight_for_conditioning(prompt, conditioning_id):
    """Use the same release contract before the consuming sampler executes."""
    results = []
    for nid, node in prompt.items():
        if node['class_type'] != 'H3PartialDiffusionEvictBeforeVAE':
            continue
        ref = node['inputs'].get('latent')
        sampler = prompt.get(str(ref[0]), {}) if isinstance(ref, list) and len(ref) == 2 else {}
        ref = sampler.get('inputs', {}).get('guider')
        guider = prompt.get(str(ref[0]), {}) if isinstance(ref, list) and len(ref) == 2 else {}
        if guider.get('inputs', {}).get('conditioning') != [str(conditioning_id), 0]:
            continue
        _, branch, roles = graph_branch_contract(prompt, nid)
        results.append({'release_node': str(nid), 'branch': branch, 'model_roles': roles})
    return results


def validate_residency(snapshot):
    """Validate this execution's measurements, independent of cache capacity."""
    target = snapshot['target']
    if snapshot['MEASUREMENT_ERRORS'] or target['errors']:
        raise RuntimeError('Residency measurement reported errors')
    values = [target['loaded_size_gib']] + [target['pins'][key] for key in
              ('TE_PIN_ALLOCATED_GIB', 'TE_PIN_REGISTERED_GIB', 'TE_HOSTBUFFER_GIB')]
    if any(isinstance(x, bool) or not isinstance(x, (int, float)) or
           not math.isfinite(x) or x < 0 for x in values):
        raise RuntimeError('Residency measurement missing or invalid')
    allocated, registered, host = values[1:]
    if registered > allocated + .01 or allocated > host + .01:
        raise RuntimeError('Residency pin/HostBuffer measurements inconsistent')
    return target


def cuda_snapshot():
    return {'allocated_gib': torch.cuda.memory_allocated()/1024**3,
            'reserved_gib': torch.cuda.memory_reserved()/1024**3}


def audit_module():
    path=Path(__file__).parent.parent/'h3_sampler_to_vae_residency_probe'/'__init__.py'
    for module in tuple(sys.modules.values()):
        filename=getattr(module,'__file__',None)
        if filename and Path(filename)==path and hasattr(module,'model_snapshot'):
            return module
    raise RuntimeError('Loaded read-only transition observer unavailable')


class H3PartialDiffusionEvictBeforeVAE:
    @classmethod
    def INPUT_TYPES(cls):
        return {'required':{'latent':('LATENT',)},'hidden':{'prompt':'PROMPT','unique_id':'UNIQUE_ID'}}
    RETURN_TYPES=('LATENT',)
    RETURN_NAMES=('latent',)
    FUNCTION='release'
    CATEGORY='H3/diagnostics'
    @classmethod
    def IS_CHANGED(cls,**kwargs):return float('nan')

    def release(self,latent,prompt,unique_id):
        started=time.perf_counter()
        record={'schema':'H3_V29_PARTIAL_EVICT_CURRENT_RESIDENCY_V2','pid':os.getpid(),'epoch':time.time(),'node_id':str(unique_id),'status':'FAIL_CLOSED','MEASUREMENT_PHASE_COUNT':0}
        folder=Path(folder_paths.get_user_directory())/'h3_partial_diffusion_evict'
        folder.mkdir(parents=True,exist_ok=True)
        output=folder/f'release_{os.getpid()}_{time.time_ns()}.json'
        try:
            audit=audit_module()
            ancestors, branch, roles = graph_branch_contract(prompt, unique_id)
            pdds=[n for nid,n in prompt.items() if str(nid) in ancestors and n['class_type']=='MiniMaxH3PDDAccApply']
            record['branch_identity'] = branch
            record['model_roles'] = roles
            loaders=[prompt[r['loader']] for r in record['model_roles'] if r['role']=='H3_MAIN_MODEL']
            if len(loaders)!=1 or loaders[0]['inputs'].get('unet_name') not in {v['checkpoint'] for v in H3_VARIANT_CONTRACTS.values()}:
                raise RuntimeError('Unique graph supported H3 variant identity not proven')
            if branch['branch'] in ('pdd8', 'pdd8_people_lora') and (len(pdds)!=1 or pdds[0]['inputs'].get('pdd_file')!='MiniMax-H3-Ref2VA-Acc-8Step.safetensors'):
                raise RuntimeError('Unique graph INT8 H3/PDD identity not proven')
            targets=[]
            for entry in tuple(mm.current_loaded_models):
                patcher=entry.model
                if patcher is not None and type(patcher.model).__module__=='comfy.model_base' and type(patcher.model).__qualname__=='MiniMaxH3':
                    targets.append((entry,patcher,patcher.model))
            record['H3_MATCH_COUNT']=len(targets)
            entry,patcher,model,variant_identity,selection=select_loaded_h3_candidate(
                targets, loaders[0]['inputs']['unet_name'])
            record['H3_SELECTION']=selection
            if entry.real_model is None or entry.real_model() is not model or entry.model is not patcher or not patcher.is_dynamic():
                raise RuntimeError('LoadedModel/patcher/model identity mismatch')
            record['H3_VARIANT_IDENTITY'] = variant_identity
            if branch['branch'] == 'pdd8_people_lora':
                stack = verify_pdd_people_patch_stack(patcher, prompt, branch)
                record['PATCH_STACK_IDENTITY'] = stack
                record['PDD_PATCH_COUNT'] = stack['PDD_PATCH_KEYS']
                record['TOTAL_PATCH_COUNT'] = stack['TOTAL_PATCH_ENTRIES']
            elif branch['branch'] == 'pdd8':
                if len(patcher.patches) != 308:
                    raise RuntimeError('H3 PDD 308 patch guard failed')
                record['PDD_PATCH_COUNT'] = 308
                record['TOTAL_PATCH_COUNT'] = sum(
                    len(v) for v in patcher.patches.values())
            else:
                record['PDD_PATCH_COUNT'] = None
                record['TOTAL_PATCH_COUNT'] = sum(
                    len(v) for v in patcher.patches.values())
            before=audit.shared.snapshot()
            before['target']=audit.model_snapshot(entry)
            record['before']=before
            record['MEASUREMENT_PHASE_COUNT']=1
            record['CUDA_BEFORE']=cuda_snapshot()
            target=validate_residency(before)
            peers=tuple(x for x in mm.current_loaded_models if x is not entry)
            record['identities']={'entry':id(entry),'patcher':id(patcher),'model':id(model)}
            record['MODEL_UNLOAD_CALLED']=False
            record['FULL_DETACH_CALLED']=False
            loaded=patcher.loaded_size()
            if not math.isfinite(loaded) or loaded<0 or abs(loaded/audit.shared.GIB-target['loaded_size_gib'])>.01:
                raise RuntimeError('Current GPU residency measurement inconsistent')
            request=max(0,int(loaded-audit.shared.GIB))
            record['RESIDENCY_STATE_BEFORE']='GPU_RESIDENT' if request else 'ALREADY_GPU_COLD'
            record['GPU_RELEASE_REQUEST_GIB']=request/audit.shared.GIB
            # Direct official partial API: never fall back to full detach on shortfall.
            record['PARTIALLY_UNLOAD_CALLED']=request>0
            freed=patcher.partially_unload(patcher.offload_device,request) if request else 0
            record['GPU_RELEASE_REPORTED_GIB']=freed/audit.shared.GIB
            if entry.model is not patcher or patcher.model is not model or entry.real_model() is not model:
                raise RuntimeError('Target identity changed')
            if peer_mutation(peers,entry):
                raise RuntimeError('Peer entry changed')
            after=audit.shared.snapshot()
            after['target']=audit.model_snapshot(entry)
            after['H3_ENTRY_PRESENT_AFTER']=any(x is entry for x in mm.current_loaded_models)
            record['after']=after
            record['MEASUREMENT_PHASE_COUNT']=2
            record['CUDA_AFTER']=cuda_snapshot()
            record['H3_UNLOAD_FREED_PINNED_GIB']=target['pins']['TE_PIN_REGISTERED_GIB']-after['target']['pins']['TE_PIN_REGISTERED_GIB']
            post=validate_residency(after)
            retained=post['pins']['TE_HOSTBUFFER_GIB']
            registered=post['pins']['TE_PIN_REGISTERED_GIB']
            record['HOST_CACHE_RETAINED_GIB']=retained
            if after['MEASUREMENT_ERRORS'] or post['errors'] or not after['H3_ENTRY_PRESENT_AFTER'] or post['loaded_size_gib']>1.5:
                raise RuntimeError('Partial GPU eviction insufficient; VAE branches blocked')
            if retained<.9*target['pins']['TE_HOSTBUFFER_GIB'] or registered<.9*target['pins']['TE_PIN_REGISTERED_GIB']:
                raise RuntimeError('Host cache not retained; VAE branches blocked')
            record['status']='PASS'
            record['RESIDENCY_STATE_AFTER']='GPU_COLD_HOST_RETAINED'
            # Arm existing read-only VAE load/decode observer AFTER successful release.
            audit.H3SamplerToVAEResidencyProbe().observe(latent)
            return {'ui':{'text':[json.dumps(record)]},'result':(latent,)}
        except Exception as e:
            record['error']=f'{type(e).__name__}: {e}'
            raise
        finally:
            record['elapsed_seconds']=time.perf_counter()-started
            output.write_text(json.dumps(record,indent=2),encoding='utf-8')
            logging.info('H3SelectiveDiffusionUnload status=%s path=%s',record['status'],output)


NODE_CLASS_MAPPINGS={'H3PartialDiffusionEvictBeforeVAE':H3PartialDiffusionEvictBeforeVAE}


def peer_mutation(peers, target):
    """Official cleanup_models() (a weakref finalizer that can fire inside an
    unload) may drop peers whose real model is already dead.  Any other change
    -- live peer removed, peer added, reordered -- still fails closed."""
    now = [x for x in mm.current_loaded_models if x is not target]
    kept = [x for x in peers if any(x is y for y in now)]
    if len(now) != len(kept) or any(a is not b for a, b in zip(now, kept)):
        return True
    dropped = [x for x in peers if not any(x is y for y in now)]
    if any(x.real_model is not None and x.real_model() is not None for x in dropped):
        return True
    if dropped:
        logging.info('H3 peer check: %d dead peer entries removed by official cleanup_models', len(dropped))
    return False
