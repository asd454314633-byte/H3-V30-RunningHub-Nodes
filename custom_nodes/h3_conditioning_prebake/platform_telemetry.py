"""Candidate-only Linux OS memory telemetry adapter.

Unknown OS metrics stay NOT_AVAILABLE, never fabricated as measured zero.
H3 TE pin / HostBuffer, identity and unloading guards are unchanged.
"""
from __future__ import annotations

import os

OS_TELEMETRY_FIELDS = (
    "PROCESS_RSS_BYTES", "PROCESS_VMS_BYTES", "PROCESS_PRIVATE_BYTES",
    "SYSTEM_RAM_USED_BYTES", "SYSTEM_RAM_AVAILABLE_BYTES",
    "SYSTEM_COMMIT_USED_BYTES", "SYSTEM_COMMIT_LIMIT_BYTES",
    "SYSTEM_COMMIT_PERCENT",
)


def system_memory(probe, *, platform_name: str | None = None):
    """Return platform OS telemetry without touching TE lifecycle state."""
    name = os.name if platform_name is None else platform_name
    if name == "nt":
        return probe._windows_memory()
    return {
        "OS_MEMORY_TELEMETRY": "UNSUPPORTED_PLATFORM",
        **{field: probe.NA for field in OS_TELEMETRY_FIELDS},
    }
