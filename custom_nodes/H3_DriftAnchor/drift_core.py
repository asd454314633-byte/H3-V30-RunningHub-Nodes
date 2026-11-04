"""Array-library-agnostic H3 latent drift anchor (NumPy and torch).

Video latents use [B, C, T, H, W]. Version 2 stores per-token-class,
per-channel energies for the mid (box3 - box7) and fine (x - box3) bands on a
coarse spatial grid. Filters use separable mean kernels and replicate padding.
Version 1 anchor files retain the original global 3x3/Laplacian behavior.
"""

import json
import os

CLASSES = 5
DEFAULT_GRID_H = 6
DEFAULT_GRID_W = 4
MIN_GAIN = 0.6
MAX_GAIN = 1.5


def _is_np(x):
    try:
        import numpy as np
        return isinstance(x, np.ndarray)
    except Exception:
        return False


def _is_torch(x):
    try:
        import torch
        return isinstance(x, torch.Tensor)
    except Exception:
        return False


def _mean_last2(x):
    return x.mean(axis=(-2, -1)) if _is_np(x) else x.mean(dim=(-2, -1))


def _lap_rms(x):
    """Legacy v1 statistic; x has shape [..., H, W]."""
    c = x[..., 1:-1, 1:-1]
    lap = 4 * c - x[..., :-2, 1:-1] - x[..., 2:, 1:-1] - x[..., 1:-1, :-2] - x[..., 1:-1, 2:]
    return _mean_last2(lap * lap) ** 0.5


def _box_mean(x, size):
    """Separable square mean filter with replicate padding; preserves shape."""
    if size <= 1:
        return x.clone() if _is_torch(x) else x.copy()
    radius = size // 2
    if _is_np(x):
        import numpy as np
        h, w = x.shape[-2:]
        hp = np.pad(x, [(0, 0)] * (x.ndim - 1) + [(radius, radius)], mode="edge")
        horizontal = sum(hp[..., i:i + w] for i in range(size)) / size
        vp = np.pad(horizontal, [(0, 0)] * (x.ndim - 2) + [(radius, radius), (0, 0)], mode="edge")
        return sum(vp[..., i:i + h, :] for i in range(size)) / size
    import torch.nn.functional as F
    h, w = x.shape[-2:]
    flat = x.reshape(-1, 1, h, w)
    flat = F.pad(flat, (radius, radius, 0, 0), mode="replicate")
    flat = F.avg_pool2d(flat, kernel_size=(1, size), stride=1)
    flat = F.pad(flat, (0, 0, radius, radius), mode="replicate")
    flat = F.avg_pool2d(flat, kernel_size=(size, 1), stride=1)
    return flat.reshape(*x.shape[:-2], h, w)


def _bands(x):
    box3 = _box_mean(x, 3)
    low = _box_mean(x, 7)
    return low, box3 - low, x - box3


def _adaptive_mean_square(x, grid_h, grid_w):
    """Per-channel adaptive block mean-square, x shape [C, H, W]."""
    if _is_np(x):
        import numpy as np
        c, h, w = x.shape
        out = np.empty((c, grid_h, grid_w), dtype=np.float64)
        for iy in range(grid_h):
            y0, y1 = (iy * h) // grid_h, ((iy + 1) * h + grid_h - 1) // grid_h
            for ix in range(grid_w):
                x0, x1 = (ix * w) // grid_w, ((ix + 1) * w + grid_w - 1) // grid_w
                block = x[:, y0:y1, x0:x1]
                out[:, iy, ix] = np.mean(block.astype(np.float64) ** 2, axis=(-2, -1))
        return out
    import torch.nn.functional as F
    return F.adaptive_avg_pool2d(x.unsqueeze(0).square(), (grid_h, grid_w))[0]


def _to_nested_list(x):
    if _is_torch(x):
        return x.detach().cpu().tolist()
    return x.tolist()


def anchor_stats(video, start=None, end=None, grid_h=DEFAULT_GRID_H, grid_w=DEFAULT_GRID_W):
    """Record v2 per-class mean and localized mid/fine RMS energies."""
    b, c, t_count, h, w = video.shape
    start = t_count // 2 if start is None else start
    end = t_count if end is None else end
    grid_h, grid_w = int(grid_h), int(grid_w)
    if not (1 <= grid_h <= h and 1 <= grid_w <= w):
        raise ValueError("grid dimensions must fit inside the latent spatial dimensions")

    if _is_torch(video):
        import torch
        mean_sum = torch.zeros((CLASSES, c), dtype=video.dtype, device=video.device)
        mid_sum = torch.zeros((CLASSES, c, grid_h, grid_w), dtype=video.dtype, device=video.device)
        fine_sum = torch.zeros_like(mid_sum)
    else:
        import numpy as np
        mean_sum = np.zeros((CLASSES, c), dtype=np.float64)
        mid_sum = np.zeros((CLASSES, c, grid_h, grid_w), dtype=np.float64)
        fine_sum = np.zeros_like(mid_sum)
    counts = [0] * CLASSES

    for t in range(start, end):
        k = t % CLASSES
        tok = video[0, :, t]
        _, mid, fine = _bands(tok)
        mean_sum[k] += _mean_last2(tok)
        mid_sum[k] += _adaptive_mean_square(mid, grid_h, grid_w)
        fine_sum[k] += _adaptive_mean_square(fine, grid_h, grid_w)
        counts[k] += 1

    safe_counts = [max(n, 1) for n in counts]
    if _is_torch(video):
        import torch
        divisor = torch.tensor(safe_counts, dtype=video.dtype, device=video.device)
        means = mean_sum / divisor[:, None]
        mid_energy = (mid_sum / divisor[:, None, None, None]).clamp_min(0).sqrt()
        fine_energy = (fine_sum / divisor[:, None, None, None]).clamp_min(0).sqrt()
    else:
        means = mean_sum / np.asarray(safe_counts)[:, None]
        mid_energy = np.sqrt(np.maximum(mid_sum / np.asarray(safe_counts)[:, None, None, None], 0))
        fine_energy = np.sqrt(np.maximum(fine_sum / np.asarray(safe_counts)[:, None, None, None], 0))

    return {
        "version": 2,
        "mean": _to_nested_list(means),
        "mid_energy": _to_nested_list(mid_energy),
        "fine_energy": _to_nested_list(fine_energy),
        "count": counts,
        "grid_h": grid_h,
        "grid_w": grid_w,
        "shape": [int(b), int(c), int(t_count), int(h), int(w)],
        "window": [int(start), int(end)],
    }


def write_anchor_file(path, stats):
    """Atomically write anchor statistics without touching other anchor files."""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(stats, f)
    os.replace(tmp, path)


def process_segment(video, anchor, segment_index, reanchor_segment=-1,
                    reanchor_anchor=None, prefix=12, ramp_tokens=24,
                    strength_mean=1.0, strength_hf=1.0, strength_fine=None,
                    strength_mid=1.0, grid_h=DEFAULT_GRID_H, grid_w=DEFAULT_GRID_W):
    """Apply the original anchor, record an identity reanchor segment, or use its new anchor."""
    segment_index = int(segment_index)
    reanchor_segment = int(reanchor_segment)
    if reanchor_segment >= 0 and segment_index == reanchor_segment:
        stats = anchor_stats(video, grid_h=grid_h, grid_w=grid_w)
        identity = video.copy() if _is_np(video) else video.clone()
        return identity, [], stats, "record_reanchor"

    target = anchor
    mode = "anchor"
    if reanchor_segment >= 0 and segment_index > reanchor_segment:
        if reanchor_anchor is None:
            raise ValueError("reanchor segment anchor is missing")
        target = reanchor_anchor
        mode = "anchor_reanchored"
    if target is None:
        raise ValueError("base drift anchor is missing")
    fixed, report = apply_anchor(
        video, target, prefix, ramp_tokens,
        strength_mean=strength_mean, strength_hf=strength_hf,
        strength_fine=strength_fine, strength_mid=strength_mid,
        grid_h=grid_h, grid_w=grid_w,
    )
    return fixed, report, None, mode


def ramp(t, prefix, ramp_tokens, strength):
    if t < prefix:
        return 0.0
    return float(min(1.0, (t - prefix + 1) / max(1, ramp_tokens)) * strength)


def _legacy_apply_anchor(video, ref, prefix, ramp_tokens, strength_mean, strength_hf):
    """Read and apply the round-1 global 3x3/Laplacian anchor unchanged."""
    out = video.copy() if _is_np(video) else video.clone()
    _, c, t_count, _, _ = video.shape
    report = []
    for t in range(prefix, t_count):
        k = t % CLASSES
        am = ramp(t, prefix, ramp_tokens, strength_mean)
        ah = ramp(t, prefix, ramp_tokens, strength_hf)
        tok = out[:, :, t]
        if ah > 0:
            hf_cur = _lap_rms(tok[0])
            low = tok.copy() if _is_np(tok) else tok.clone()
            low[..., 1:-1, 1:-1] = (tok[..., :-2, :-2] + tok[..., :-2, 1:-1] + tok[..., :-2, 2:] +
                                    tok[..., 1:-1, :-2] + tok[..., 1:-1, 1:-1] + tok[..., 1:-1, 2:] +
                                    tok[..., 2:, :-2] + tok[..., 2:, 1:-1] + tok[..., 2:, 2:]) / 9.0
            for ch in range(c):
                r = ref["hf"][k][ch] / max(float(hf_cur[ch]), 1e-6)
                g = 1.0 + ah * (min(max(r, MIN_GAIN), MAX_GAIN) - 1.0)
                tok[:, ch] = low[:, ch] + g * (tok[:, ch] - low[:, ch])
        if am > 0:
            m_cur = _mean_last2(tok[0])
            for ch in range(c):
                tok[:, ch] = tok[:, ch] + am * (ref["mean"][k][ch] - float(m_cur[ch]))
        out[:, :, t] = tok
        report.append((t, round(am, 3)))
    return out, report


def _gain_map(reference, current, height, width, alpha, min_gain, max_gain):
    if _is_np(current):
        import numpy as np
        ratio = np.asarray(reference) / np.maximum(current, 1e-6)
        gains = 1.0 + alpha * (np.clip(ratio, min_gain, max_gain) - 1.0)
        return _upsample_grid(gains, height, width)
    import torch
    ref = torch.as_tensor(reference, dtype=current.dtype, device=current.device)
    ratio = ref / current.clamp_min(1e-6)
    gains = 1.0 + alpha * (ratio.clamp(min_gain, max_gain) - 1.0)
    import torch.nn.functional as F
    return F.interpolate(gains.unsqueeze(0), size=(height, width), mode="bilinear", align_corners=True)[0]


def _upsample_grid(grid, height, width):
    """Bilinearly resize [C, grid_h, grid_w] gains, NumPy implementation."""
    import numpy as np
    gh, gw = grid.shape[-2:]
    if gh == height and gw == width:
        return grid.copy()
    yy = np.linspace(0, gh - 1, height)
    xx = np.linspace(0, gw - 1, width)
    y0 = np.floor(yy).astype(int); y1 = np.minimum(y0 + 1, gh - 1); wy = yy - y0
    x0 = np.floor(xx).astype(int); x1 = np.minimum(x0 + 1, gw - 1); wx = xx - x0
    along_y = grid[:, y0, :] * (1 - wy)[None, :, None] + grid[:, y1, :] * wy[None, :, None]
    return along_y[:, :, x0] * (1 - wx)[None, None, :] + along_y[:, :, x1] * wx[None, None, :]


def apply_anchor(video, ref, prefix, ramp_tokens=24, strength_mean=1.0, strength_hf=1.0,
                 strength_fine=None, strength_mid=1.0, grid_h=DEFAULT_GRID_H, grid_w=DEFAULT_GRID_W,
                 max_gain=MAX_GAIN, min_gain=MIN_GAIN):
    """Apply v2 local mid/fine correction; v1 anchor files use the legacy path.

    ``strength_hf`` remains an alias for ``strength_fine`` for old callers.
    """
    fine_strength = float(strength_hf if strength_fine is None else strength_fine)
    if int(ref.get("version", 1)) < 2 or "mid_energy" not in ref or "fine_energy" not in ref:
        return _legacy_apply_anchor(video, ref, prefix, ramp_tokens, strength_mean, fine_strength)

    if float(strength_mean) == 0 and float(strength_mid) == 0 and fine_strength == 0:
        return (video.copy() if _is_np(video) else video.clone()), []

    out = video.copy() if _is_np(video) else video.clone()
    _, c, t_count, h, w = video.shape
    grid_h, grid_w = int(grid_h), int(grid_w)
    if int(ref["grid_h"]) != grid_h or int(ref["grid_w"]) != grid_w:
        raise ValueError("drift anchor grid does not match segment grid")
    if len(ref["mean"][0]) != c:
        raise ValueError("drift anchor channel count mismatch")
    report = []

    if _is_np(video):
        import numpy as np
        means = np.asarray(ref["mean"], dtype=np.float64)
        mid_ref = np.asarray(ref["mid_energy"], dtype=np.float64)
        fine_ref = np.asarray(ref["fine_energy"], dtype=np.float64)
    else:
        import torch
        means = torch.as_tensor(ref["mean"], dtype=video.dtype, device=video.device)
        mid_ref = torch.as_tensor(ref["mid_energy"], dtype=video.dtype, device=video.device)
        fine_ref = torch.as_tensor(ref["fine_energy"], dtype=video.dtype, device=video.device)

    for t in range(prefix, t_count):
        k = t % CLASSES
        am = ramp(t, prefix, ramp_tokens, strength_mean)
        amid = ramp(t, prefix, ramp_tokens, strength_mid)
        afine = ramp(t, prefix, ramp_tokens, fine_strength)
        tok = out[:, :, t]
        low, mid, fine = _bands(tok)
        corrected = low
        if amid > 0:
            cur = _adaptive_mean_square(mid[0], grid_h, grid_w)
            if _is_np(video):
                cur = np.sqrt(np.maximum(cur, 0))
            else:
                cur = cur.clamp_min(0).sqrt()
            gain = _gain_map(mid_ref[k], cur, h, w, amid, min_gain, max_gain)
            corrected = corrected + mid * (gain[None, ...] if _is_np(video) else gain.unsqueeze(0))
        else:
            corrected = corrected + mid
        if afine > 0:
            cur = _adaptive_mean_square(fine[0], grid_h, grid_w)
            if _is_np(video):
                cur = np.sqrt(np.maximum(cur, 0))
            else:
                cur = cur.clamp_min(0).sqrt()
            gain = _gain_map(fine_ref[k], cur, h, w, afine, min_gain, max_gain)
            corrected = corrected + fine * (gain[None, ...] if _is_np(video) else gain.unsqueeze(0))
        else:
            corrected = corrected + fine
        if am > 0:
            m_cur = _mean_last2(tok)
            delta = means[k] - m_cur
            corrected = corrected + am * delta[..., None, None]
        out[:, :, t] = corrected
        report.append((t, round(am, 3)))
    return out, report
