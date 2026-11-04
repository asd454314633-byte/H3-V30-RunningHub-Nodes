"""Pure route identity helpers shared by PreBake planning and CPU tests."""

CONDITIONING_NODE_CLASS = "MiniMaxH3ReferenceToVideo"
ROUTE_BY_NODE_ID = {"136": "Ref2VA", "1106": "OmniRef8"}
REFERENCE_PREFIXES = (
    ("ref_images.ref_image_", "image"),
    ("ref_videos.ref_video_", "video"),
    ("ref_video_audios.ref_video_audio_", "video_audio"),
    ("ref_audios.ref_audio_", "audio"),
)


def select_conditioning_source(graph, expected_route=None, expected_node_id=None):
    """Require one active H3 reference-conditioning node and the matching route."""
    candidates = [
        (str(node_id), node)
        for node_id, node in graph.items()
        if isinstance(node, dict) and node.get("class_type") == CONDITIONING_NODE_CLASS
    ]
    if len(candidates) != 1:
        raise ValueError("Expected exactly one active MiniMaxH3ReferenceToVideo node")
    node_id, node = candidates[0]
    route = ROUTE_BY_NODE_ID.get(node_id)
    if route is None:
        raise ValueError("Unregistered H3 conditioning route node: " + node_id)
    if expected_node_id is not None and str(expected_node_id) != node_id:
        raise ValueError("Conditioning node differs from the selected UI route")
    if expected_route is not None and expected_route != route:
        raise ValueError("Conditioning route differs from the selected UI route")
    return node_id, route, node


def reference_slots(inputs):
    """Return ordered, explicit OmniRef reference slots from node inputs."""
    result = []
    for name, value in inputs.items():
        for prefix, kind in REFERENCE_PREFIXES:
            if not name.startswith(prefix):
                continue
            suffix = name[len(prefix):]
            if not suffix.isdigit():
                raise ValueError("Malformed reference slot: " + name)
            if not (isinstance(value, list) and len(value) == 2
                    and isinstance(value[0], str) and type(value[1]) is int):
                raise ValueError("Unresolved reference slot: " + name)
            result.append({"kind": kind, "slot": int(suffix), "input": name,
                           "source_node": value[0], "source_output": value[1]})
            break
    return sorted(result, key=lambda item: (item["kind"], item["slot"]))
