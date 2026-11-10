"""Six-panel transport bookkeeping. Native latent storage/algorithms stay unchanged."""
import hashlib
import json
import os
import threading
import time
import uuid
from pathlib import Path

PROVIDER = "CORE_NATIVE_MASKED_AV"
FILE_STATE_LOCK = threading.RLock()
TAIL12_SCHEMA = "H3_TAIL12_V1"
TAIL12_VIDEO_NODE = "h3_tail12_save"


def retire_stale_tail12(root, project, index):
    """Move a repaired prefix aside once its source latent has been overwritten.

    seg_%05d.safetensors is replaced in place by every rerun, so a prefix whose
    recorded source no longer matches the latent on disk can never become valid
    again (e.g. a segment first run with tail-12 ON, then rerun with it OFF).
    Raising on it would strand the new verified result forever; consuming it
    would be wrong. Retire it (move, never delete) and let the caller continue
    as "no repaired prefix". Returns the retired paths.
    """
    directory = project_dir(root, project)
    stem = "seg_%05d_tail12" % int(index)
    files = [directory / (stem + ext) for ext in (".json", ".safetensors")]
    if not any(f.is_file() for f in files):
        return []
    accepted = directory / ("seg_%05d.safetensors" % int(index))
    source = str(read_json(files[0], {}).get("source_sha256", "")).upper()
    if source and accepted.is_file() and source == hashlib.sha256(accepted.read_bytes()).hexdigest().upper():
        return []  # still describes the current latent: keep (validated by tail12_prefix)
    target = directory / "_superseded" / "tail12_stale"
    target.mkdir(parents=True, exist_ok=True)
    tag = "%s_%d" % ((source or "nosource")[:12], int(time.time() * 1000))
    moved = []
    for f in files:
        if f.is_file():
            dest = target / ("%s_%s%s" % (stem, tag, f.suffix))
            os.replace(f, dest)
            moved.append(str(dest))
    print("[tail12] retired stale prefix S%d (source latent was overwritten) -> %s"
          % (int(index) + 1, target), flush=True)
    return moved


def tail12_prefix(root, project, index):
    """The durable repaired prefix written by H3Tail12Commit for one accepted segment.

    Returns None when the segment was never repaired. Raises when a repair
    exists but no longer matches its recorded source, SHA or 39/65 geometry:
    a stale prefix must never be silently consumed by a successor.
    """
    from safetensors import safe_open
    directory = project_dir(root, project)
    stem = "seg_%05d_tail12" % int(index)
    sidecar = directory / (stem + ".json")
    repaired = directory / (stem + ".safetensors")
    if not sidecar.is_file() or not repaired.is_file():
        return None
    data = read_json(sidecar, {})
    if data.get("schema") != TAIL12_SCHEMA:
        raise ValueError("尾12修复记录格式不受支持：S%d" % (int(index) + 1))
    if data.get("project_id") not in (None, project) or int(data.get("segment_index", -1)) != int(index):
        raise ValueError("尾12修复记录的项目/段号不一致：S%d" % (int(index) + 1))
    digest = hashlib.sha256(repaired.read_bytes()).hexdigest().upper()
    if digest != str(data.get("repaired_sha256", "")).upper():
        raise ValueError("尾12修复版latent SHA256与记录不一致：S%d" % (int(index) + 1))
    accepted = directory / ("seg_%05d.safetensors" % int(index))
    if not accepted.is_file() or str(data.get("source_sha256", "")).upper() != \
            hashlib.sha256(accepted.read_bytes()).hexdigest().upper():
        raise ValueError("尾12修复所依据的原始latent已被替换：S%d" % (int(index) + 1))
    with safe_open(str(repaired), framework="pt", device="cpu") as handle:
        video = handle.get_slice("video").get_shape()
        audio = handle.get_slice("audio").get_shape()
        if len(video) != 5 or video[2] < 12 or len(audio) < 3 or audio[-1] < 65:
            raise ValueError("尾12修复版latent不满足39帧/65步前缀条件：S%d" % (int(index) + 1))
        if (video[2] - 12) % 5:
            raise ValueError("尾12修复版latent时间网格相位不符，无法作为39帧前缀：S%d" % (int(index) + 1))
    return {"segment_index": int(index), "path": str(repaired), "sha256": digest,
            "source_sha256": str(data.get("source_sha256", "")).upper(),
            "params": data.get("params"), "video_shape": video, "audio_shape": audio}


def tail12_video_nodes(output_graph):
    """Split the submitted graph's SaveVideo nodes into the segment's own and the
    optional tail-12 evidence video. The segment contract stays exactly one."""
    main, tail = [], []
    for node_id, node in (output_graph or {}).items():
        if node.get("class_type") != "SaveVideo":
            continue
        (tail if str(node_id) == TAIL12_VIDEO_NODE else main).append((node_id, node))
    return main, tail


def tail12_single_decode(output_graph):
    """单次解码：主成片的视频解码直接读 H3Tail12Commit 的输出，主成片本身就是修复版，
    回执把它同时登记为尾12证据（见 h3_quality_switches.applyTail12Produce）。"""
    commits = {str(node_id) for node_id, node in (output_graph or {}).items()
               if node.get("class_type") == "H3Tail12Commit"}
    # 旧证据支路自己的 h3_tail12_decode 也读 commit，只认主成片的解码节点。
    return any(node.get("class_type") == "VAEDecode"
               and not str(node_id).startswith("h3_tail12_")
               and isinstance(node.get("inputs", {}).get("samples"), list)
               and str(node["inputs"]["samples"][0]) in commits
               for node_id, node in (output_graph or {}).items())


def output_files(result, key):
    """Unique real video files of one History output block."""
    if not isinstance(result, dict):
        return []
    return [entry for entry in result.get(key, [])
            if Path(entry.get("filename", "")).suffix.lower() in (".mp4", ".webm", ".mov", ".mkv")]


def video_frame_count(path):
    """真实帧数。优先 PyAV（运行时依赖内），退回 ffprobe；都不可用则返回 None。

    返回 None 时调用方必须硬报错：拿不到帧数就无法证明证据视频与主成片同约定，
    静默放过会让合并插入重复前缀。
    """
    try:
        import av
        with av.open(str(path)) as container:
            stream = container.streams.video[0]
            if stream.frames:
                return int(stream.frames)
            return sum(1 for _ in container.decode(video=0))
    except Exception:
        pass
    try:
        import shutil
        import subprocess
        exe = shutil.which("ffprobe")
        if exe:
            done = subprocess.run([exe, "-v", "error", "-select_streams", "v:0",
                                   "-show_entries", "stream=nb_frames", "-of", "csv=p=0", str(path)],
                                  capture_output=True, text=True, check=True)
            value = done.stdout.strip().splitlines()[0].strip()
            return int(value) if value.isdigit() else None
    except Exception:
        pass
    return None



def project_dir(root, project):
    if not project or len(project) > 64 or any(not (c.isalnum() or c in "-_") for c in project):
        raise ValueError("存档项目只能使用字母、数字、中文、横线和下划线（最多64字符）")
    return Path(root) / "h3_continuation" / project


def read_json(path, default):
    with FILE_STATE_LOCK:return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else default


def write_json_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp-" + uuid.uuid4().hex)
    try:
        with temporary.open("wb") as handle:
            handle.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def resolve_save_enabled(output, node):
    """A subgraph-exposed boolean arrives as an internal link, not a literal.

    The six-segment graph wraps the Native continuation nodes in a subgraph, so
    the flattened prompt stores ``enabled`` as ``["<primitive node>", 0]``.
    Resolve the link to its literal before judging whether Save actually ran;
    comparing the raw link against ``True`` would reject every real submission.
    """
    value = (node.get("inputs") or {}).get("enabled")
    if value is True:
        return True
    if isinstance(value, list) and len(value) == 2 and isinstance(output, dict):
        source = output.get(str(value[0]))
        if isinstance(source, dict) and str(source.get("class_type", "")).startswith("PrimitiveBoolean"):
            if (source.get("inputs") or {}).get("value") is True:
                return True
    return False


def latent_prompt_id(path):
    """The durable latent records the exact prompt_id that produced it."""
    try:
        from safetensors import safe_open
        with safe_open(str(path), framework="pt", device="cpu") as handle:
            return (handle.metadata() or {}).get("prompt_id")
    except Exception:
        return None


def archived_success_history(root, prompt_id, pending_at):
    """Recover an exact completed prompt from this instance's pre-restart snapshot."""
    instance_id = os.environ.get("H3_INSTANCE_ID", "")
    if not instance_id or any(not (c.isalnum() or c in "-_") for c in instance_id):
        return None
    output = Path(root).resolve()
    snapshots = output.parent.parent / "instances" / instance_id
    for path in sorted(snapshots.glob("snapshot-*.json"), reverse=True):
        try:
            stamp = int(path.stem.removeprefix("snapshot-")) / 1e9
            if pending_at and stamp < float(pending_at):
                break
            data = read_json(path, {})
            instance = data.get("instance", {})
            if instance.get("id") != instance_id or Path(instance.get("dirs", {}).get("output", "")).resolve() != output:
                continue
            history = data.get("history", {}).get(prompt_id)
            if history and history.get("status", {}).get("completed") is True and history["status"].get("status_str") == "success":
                return history
        except (OSError, ValueError, TypeError, KeyError):
            continue
    return None


def reconcile_pending(server, root, project, index):
    recover = getattr(server, "h3_prebake_recover", None)
    if recover and recover(project, index):
        return
    directory = project_dir(root, project)
    path = directory / "six_acceptance.json"
    with FILE_STATE_LOCK:
        receipts = read_json(path, {})
    receipt = receipts.get(str(index), {})
    group_id = receipt.get("group_id")
    # PENDING：常规补登。SUCCESS+pending_attempt_at_epoch：一次重跑已落盘但
    # 浏览器收口丢失的中间态（页面刷新/断开导致 SUCCESS POST 未达服务端）；
    # 磁盘 latent 已是新身份，这里按同一验证器补收口，业务永不被状态卡死。
    rerun_landed = receipt.get("status") == "SUCCESS" and receipt.get("pending_attempt_at_epoch") is not None
    if receipt.get("status") != "PENDING" and not rerun_landed:
        return
    if group_id:
        controller = getattr(server, "h3_native_merge_control", None)
        state = controller.read(project).get("_native_merge", {}) if controller else {}
        group = state.get("groups", {}).get(group_id, {})
        prompt_id = group.get("prompt_ids", {}).get(str(index))
    else:
        # Native direct sampling carries no PreBake group. The saved latent
        # records the exact prompt_id that produced it; reconcile from that
        # identity so a browser disconnect mid-run cannot strand the segment
        # in PENDING and block every successor segment.
        prompt_id = latent_prompt_id(directory / ("seg_%05d.safetensors" % index))
        if rerun_landed and prompt_id == receipt.get("prompt_id"):
            # 磁盘 latent 仍是旧回执身份：重跑尚未落盘（在途），保持 pending 标记。
            return
    if not prompt_id:
        return
    # PreBake owns a second, group-scoped ledger. Delegate its refresh recovery
    # to the same validator/committer used after live completion; never mint a
    # SUCCESS receipt from this UI transport layer alone.
    if group_id:
        reconcile = getattr(server, "h3_prebake_acceptance_reconcile", None)
        if not reconcile:
            return
        prebake_path = directory / ("prebake_" + group_id + ".json")
        prebake = read_json(prebake_path, {})
        segment = prebake.get("segments", {}).get(str(index), {})
        if prebake.get("group_id") != group_id or segment.get("group_id") != group_id:
            return
        reconcile({"context": {"project_id": project, "group_id": group_id},
                   "index": index, "prompt_id": prompt_id,
                   "cache_key": segment.get("cache_key")})
        return
    try:
        history = server.prompt_queue.get_history(prompt_id=prompt_id).get(prompt_id)
        if not history and rerun_landed:
            history = archived_success_history(root, prompt_id, receipt.get("pending_attempt_at_epoch"))
        if not history or history["status"].get("status_str") != "success" or history["status"].get("completed") is not True:
            return
        output_graph = history["prompt"][2]
        saves = [n for n in output_graph.values() if n["class_type"] == "H3ContinuationSave" and resolve_save_enabled(output_graph, n)]
        videos, _tail_videos = tail12_video_nodes(output_graph)
        if len(saves) != 1 or len(videos) != 1 or saves[0]["inputs"].get("project_id") != project or int(saves[0]["inputs"].get("segment_index", -1)) != index:
            return
        saved_video = history.get("outputs", {}).get(videos[0][0], {})
        files = [entry for key in ("images", "videos") for entry in saved_video.get(key, [])
                 if Path(entry.get("filename", "")).suffix.lower() in (".mp4", ".webm", ".mov", ".mkv")]
        if len(files) != 1 or files[0].get("type") != "output":
            return
        video_path = (Path(root) / files[0].get("subfolder", "") / files[0]["filename"]).resolve()
        if not video_path.is_relative_to(Path(root).resolve()) or not video_path.is_file():
            return
        inspected = inspect_segment(root, project, index, require_accepted=False,
                                    expected_prompt_id=prompt_id, supersede=rerun_landed)
        latent_path = Path(inspected["path"])
        tail_evidence = None
        if rerun_landed and (_tail_videos or tail12_single_decode(output_graph)):
            if _tail_videos:
                tail_files = output_files(history.get("outputs", {}).get(_tail_videos[0][0], {}), "images") + \
                             output_files(history.get("outputs", {}).get(_tail_videos[0][0], {}), "videos")
            else:
                tail_files = files  # 单次解码：主成片即修复版
            if len(tail_files) == 1 and tail_files[0].get("type") == "output":
                tail_path = (Path(root) / tail_files[0].get("subfolder", "") / tail_files[0]["filename"]).resolve()
                if tail_path.is_relative_to(Path(root).resolve()) and tail_path.is_file():
                    try:
                        prefix_record = tail12_prefix(root, project, index)
                    except Exception:
                        prefix_record = None  # 记录缺失/过期：合并退回主成片，不阻塞
                    main_frames = video_frame_count(video_path)
                    tail_frames = video_frame_count(tail_path)
                    if prefix_record and main_frames is not None and tail_frames is not None and main_frames == tail_frames:
                        tail_evidence = {"segment_index": index, "repaired_by_segment": index,
                                         "repaired_latent": prefix_record["path"],
                                         "repaired_latent_sha256": prefix_record["sha256"],
                                         "source_latent_sha256": prefix_record["source_sha256"],
                                         "frames": tail_frames,
                                         "params": prefix_record["params"],
                                         "video_output_ref": {**tail_files[0], "prompt_id": prompt_id},
                                         "video_sha256": hashlib.sha256(tail_path.read_bytes()).hexdigest(),
                                         "at_epoch": time.time()}
    except Exception:
        # Best-effort read-time reconciliation; a verification failure simply
        # leaves the PENDING receipt untouched for the next attempt.
        return
    with FILE_STATE_LOCK:
        latest = read_json(path, {})
        pending = latest.get(str(index), {})
        pending_landed = pending.get("status") == "SUCCESS" and pending.get("pending_attempt_at_epoch") is not None
        if pending.get("group_id") != group_id or (pending.get("status") != "PENDING" and not pending_landed):
            return
        if pending_landed:
            lineage = (latest.get("_rerun_pending") or {}).get(str(index))
            if lineage:
                parent = latest.get(str(index - 1), {})
                if (parent.get("status") != "SUCCESS" or
                        parent.get("prompt_id") != lineage.get("prompt_id") or
                        parent.get("latent_sha256") != lineage.get("latent_sha256")):
                    return  # 前驱已变化：本段结果保留，但不作为当前链回执
        new_receipt = {"status": "SUCCESS", "prompt_id": prompt_id, "group_id": group_id,
                       "project_id": project,
                       "latent_path": str(latent_path),
                       "latent_sha256": hashlib.sha256(latent_path.read_bytes()).hexdigest().upper(),
                       "video_output_ref": {**files[0], "prompt_id": prompt_id},
                       "video_sha256": hashlib.sha256(video_path.read_bytes()).hexdigest(),
                       "accepted_at_epoch": time.time(), "reconciled_from_history": True}
        if tail_evidence:
            new_receipt["tail12_prefix"] = tail_evidence
        if pending_landed:
            old_prompt = pending.get("prompt_id")
            if old_prompt and old_prompt != prompt_id:
                for following in range(index + 1, 6):
                    prior = latest.get(str(following))
                    if prior and prior.get("status") in ("SUCCESS", "PENDING"):
                        latest.setdefault("_invalidated_receipts", []).append(
                            {"segment_index": following, "reason": "前段已重跑",
                             "receipt": prior.copy(), "at_epoch": time.time()})
                        latest[str(following)] = {**prior, "status": "STALE",
                                                  "invalidated_by_segment": index,
                                                  "invalidated_at_epoch": time.time()}
            latest.setdefault("_rerun_pending", {}).pop(str(index), None)
        latest[str(index)] = new_receipt
        write_json_atomic(path, latest)


def inspect_segment(root, project, index, require_accepted=True, expected_prompt_id=None, supersede=False):
    from safetensors import safe_open
    directory = project_dir(root, project)
    ledger = read_json(directory / "index.json", {})
    entry = next((s for s in ledger.get("segments", []) if int(s["segment_index"]) == index), None)
    path = directory / ("seg_%05d.safetensors" % index)
    receipts = read_json(directory / "six_acceptance.json", {})
    receipt = receipts.get(str(index))
    # Bound PreBake stories retain their acceptance authority even when the
    # unchanged Native Merge controller requests a header-only inspection.
    versions = read_json(Path(root) / 'h3_continuation' / '_prebake_executions.json', {})
    for b in read_json(Path(root) / 'h3_continuation' / '_prebake_stories.json', {}).values():
        versions[b['execution_version']] = b
    bindings = [b for b in versions.values() if b.get('project_id') == project]
    if bindings:
        if len(bindings) != 1:
            raise ValueError('Ambiguous bound PreBake project')
        binding = bindings[0]
        prebake = read_json(directory / ('prebake_' + binding['group_id'] + '.json'), {})
        accepted = prebake.get('segments', {}).get(str(index), {})
        if not receipt or receipt.get('status') != 'SUCCESS' or accepted.get('video_status') != 'SUCCESS':
            raise ValueError('Bound PreBake segment has no verified SUCCESS receipt')
        group = receipts.get('_native_merge', {}).get('groups', {}).get(binding['group_id'], {})
        legacy = (not accepted.get('attempt') and prebake.get('group_id') == binding['group_id']
                  and receipt.get('prompt_id') is not None
                  and group.get('prompt_ids', {}).get(str(index)) == receipt.get('prompt_id') == accepted.get('prompt_id'))
        fields = ('prompt_id', 'latent_sha256') if legacy else ('group_id', 'prompt_id', 'revision', 'cache_key', 'latent_sha256')
        if any(receipt.get(k) is None or receipt.get(k) != accepted.get(k) for k in fields) or receipt.get('group_id', binding['group_id'] if legacy else None) != binding['group_id']:
            raise ValueError('Bound PreBake receipt/ledger identity mismatch')
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest().upper() != receipt['latent_sha256']:
            raise ValueError('Bound PreBake latent SHA256 mismatch')
        if not require_accepted and expected_prompt_id is None:
            if group.get('prompt_ids', {}).get(str(index)) != receipt['prompt_id']:
                raise ValueError('Native Merge exact prompt_id differs from accepted PreBake attempt')
        if expected_prompt_id is not None and expected_prompt_id != receipt['prompt_id']:
            raise ValueError('Requested prompt_id differs from accepted PreBake attempt')
        expected_prompt_id = receipt['prompt_id']
    if require_accepted and (not receipt or receipt.get("status") != "SUCCESS"):
        raise ValueError("第%d段尚未实际SUCCESS，不能作为连续续跑状态" % (index + 1))
    if not entry or not path.is_file():
        raise ValueError("缺少第%d段已接受状态" % (index + 1))
    if ledger.get("provider") != PROVIDER or entry.get("provider") != PROVIDER:
        raise ValueError("存档不是CORE_NATIVE_MASKED_AV")
    verified_receipt = bool(receipt and receipt.get('status') == 'SUCCESS')
    if verified_receipt and not supersede:
        # supersede=True is used only by the acceptance SUCCESS commit, which
        # has already verified live history, the Native save identity and the
        # video output for this exact prompt: a preserved older SUCCESS is
        # being replaced by this newer verified run, so the recorded prompt_id
        # and latent SHA intentionally differ from what is on disk right now.
        receipt_prompt = receipt.get('prompt_id')
        if not receipt_prompt:
            raise ValueError('SUCCESS receipt has no exact prompt_id')
        if expected_prompt_id is not None and expected_prompt_id != receipt_prompt:
            raise ValueError('Requested prompt_id differs from SUCCESS receipt')
        expected_prompt_id = receipt_prompt
        claimed_sha = receipt.get('latent_sha256')
        if not claimed_sha or hashlib.sha256(path.read_bytes()).hexdigest().upper() != claimed_sha.upper():
            if receipt.get('pending_attempt_at_epoch'):
                raise ValueError('第%d段有进行中的重新生成尝试，旧回执已保留但latent已被替换；请等待该尝试完成' % (index + 1))
            raise ValueError('SUCCESS receipt latent SHA256 mismatch')
    if expected_prompt_id is not None and entry.get('prompt_id') != expected_prompt_id:
        raise ValueError('Native index differs from exact SUCCESS/History prompt_id')
    # Read tensor headers only, without loading a model or tensor into GPU memory.
    with safe_open(str(path), framework="pt", device="cpu") as handle:
        meta = handle.metadata()
        video = handle.get_slice("video").get_shape()
        audio = handle.get_slice("audio").get_shape()
        if meta.get("provider") != PROVIDER or int(meta.get("segment_index", -1)) != index:
            raise ValueError("latent元数据与段号/Provider不一致")
        if expected_prompt_id is not None and meta.get("prompt_id") != expected_prompt_id:
            raise ValueError("latent元数据与实际SUCCESS prompt_id不一致")
        if len(video) != 5 or video[2] < 12 or len(audio) < 3 or audio[-1] < 65:
            raise ValueError("latent不满足39帧/65步前缀条件")
    # A repaired prefix is only valid while it still describes this exact accepted
    # latent; a successor that consumed it must be re-verified against it, not
    # against the raw seg_n.
    # A prefix left over from an earlier run of this segment (its source latent
    # was overwritten) is retired here instead of failing every later check.
    retire_stale_tail12(root, project, index)
    repaired_prefix = tail12_prefix(root, project, index)
    # supersede=True 仅用于 SUCCESS 收口提交：此时提交的是新 latent，磁盘前缀
    # 已由 tail12_prefix 内部校验与磁盘 latent 一致；拿旧回执与新前缀比较必然
    # 失败，会卡死一切带尾12的重跑收口，故在提交路径跳过（提交后二者即一致）。
    if repaired_prefix and receipt and receipt.get('latent_sha256') and not supersede:
        if str(receipt['latent_sha256']).upper() != repaired_prefix['source_sha256']:
            raise ValueError('尾12修复版前缀与第%d段已接受latent不一致' % (index + 1))
    return {"segment_index": index, "path": str(path), "provider": PROVIDER,
            "video_shape": video, "audio_shape": audio, "accepted": verified_receipt,
            "tail12_prefix": repaired_prefix}


def register_routes():
    import asyncio
    import folder_paths
    from aiohttp import web
    from server import PromptServer
    from .request_guard import reject
    server = PromptServer.instance
    server.h3_acceptance_state_lock = FILE_STATE_LOCK

    @server.routes.get("/h3/six/store")
    async def status(request):
        try:
            root = folder_paths.get_output_directory()
            project = request.query.get("project_id", "")
            index = int(request.query.get("segment_index", -1))
            if not 0 <= index <= 5:
                raise ValueError("无效段号")
            reconcile_pending(server, root, project, index)
            return web.json_response(inspect_segment(root, project, index))
        except Exception as exc:
            return web.json_response({"error": str(exc)}, status=409)

    # Isolated post-generation controller; no Continuation tensor/acceptance changes.
    from .native_merge_control import register as register_native_merge
    server.h3_native_merge_control = register_native_merge(server)
    from .free_merge import register as register_free_merge
    register_free_merge(server)

    @server.routes.post("/h3/six/archive-segment")
    async def archive_segment(request):
        """Copy (never move/delete) an accepted segment latent + receipt before an
        edited regeneration supersedes it in place. Missing data is not an error:
        there is simply nothing to protect."""
        blocked = reject(request)
        if blocked: return blocked
        try:
            data = await request.json()
            project, index = data["project_id"], int(data["segment_index"])
            if not 0 <= index <= 5:
                raise ValueError("无效段号")
            directory = project_dir(folder_paths.get_output_directory(), project)
            seg = directory / ("seg_%05d.safetensors" % index)
            with FILE_STATE_LOCK:
                receipts = read_json(directory / "six_acceptance.json", {})
                index_doc = read_json(directory / "index.json", {})
                if not seg.is_file() and str(index) not in receipts:
                    return web.json_response({"archived": 0, "path": None})
                stamp = time.strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]
                target = directory / "_superseded" / ("%s_S%d" % (stamp, index + 1))
                target.mkdir(parents=True, exist_ok=False)
                if seg.is_file():
                    import shutil
                    shutil.copy2(seg, target / seg.name)
                write_json_atomic(target / "receipt.json", {
                    "segment_index": index, "archived_at_epoch": time.time(),
                    "receipt": receipts.get(str(index)),
                    "index_entry": next((s for s in index_doc.get("segments", [])
                                         if int(s.get("segment_index", -1)) == index), None),
                    "latent_sha256": hashlib.sha256((target / seg.name).read_bytes()).hexdigest().upper() if seg.is_file() else None})
            return web.json_response({"archived": 1, "path": str(target.relative_to(Path(folder_paths.get_output_directory())).as_posix())})
        except Exception as exc:
            return web.json_response({"error": str(exc)}, status=409)

    @server.routes.post("/h3/six/acceptance")
    async def acceptance(request):
        blocked = reject(request)
        if blocked: return blocked
        try:
            data = await request.json()
            project, index = data["project_id"], int(data["segment_index"])
            group_id = data.get("group_id")
            if group_id is not None and (not group_id or len(group_id) > 160 or any(not (c.isalnum() or c in "-_") for c in group_id)):
                raise ValueError("无效PreBake group_id")
            if not 0 <= index <= 5:
                raise ValueError("无效段号")
            directory = project_dir(folder_paths.get_output_directory(), project)
            path = directory / "six_acceptance.json"
            with FILE_STATE_LOCK:
                receipts = read_json(path, {})
            phase = data["status"]
            tail_evidence = None
            prebake = read_json(directory / ("prebake_" + group_id + ".json"), {}) if group_id else {}
            if prebake.get("execution"):
                if phase != "PENDING":
                    raise ValueError("Bound PreBake SUCCESS must use exact history reconciliation")
                pending_writer = getattr(server, "h3_prebake_pending", None)
                if not pending_writer:
                    raise ValueError("PreBake lifecycle handler unavailable")
                return web.json_response(pending_writer(project, index, group_id))
            if phase == "SUCCESS":
                prompt_id = data["prompt_id"]
                pending = receipts.get(str(index), {})
                if group_id is not None and pending.get("group_id") != group_id:
                    raise ValueError("PreBake group changed while the prompt was running")
                # Core emits websocket SUCCESS just before it commits history.
                history = None
                for _ in range(40):
                    history = server.prompt_queue.get_history(prompt_id=prompt_id).get(prompt_id)
                    if history:
                        break
                    await asyncio.sleep(0.05)
                if not history or history["status"].get("status_str") != "success" or history["status"].get("completed") is not True or any(event == "execution_error" for event, _ in history["status"].get("messages", [])):
                    raise ValueError("未找到该任务的实际SUCCESS，拒绝接受latent")
                output = history["prompt"][2]
                saves = [n for n in output.values() if n["class_type"] == "H3ContinuationSave"]
                if len(saves) != 1 or saves[0]["inputs"].get("project_id") != project or saves[0]["inputs"].get("segment_index") != index or resolve_save_enabled(output, saves[0]) is not True:
                    raise ValueError("任务的Native存档项目/段号不一致")
                video_nodes, tail_video_nodes = tail12_video_nodes(output)
                if len(video_nodes) != 1:
                    raise ValueError("任务没有唯一的SaveVideo输出")
                if len(tail_video_nodes) > 1:
                    raise ValueError("任务重复了尾12证据视频输出")
                # 尾12 已接线但被服务端丢弃（ComfyUI 会"忽略无效输出"并让其余分支照常成功），
                # 这种"开了却没修"绝不能计为成功。
                tail12_submitted = any(node.get("class_type") == "H3Tail12Commit" for node in output.values())
                single_decode = tail12_single_decode(output)
                if single_decode and tail_video_nodes:
                    raise ValueError("尾12单次解码与证据视频同时存在，提交图不合约定；拒绝验收")
                if tail12_submitted and not tail_video_nodes and not single_decode:
                    raise ValueError("本次提交包含尾12修复节点，但修复证据被丢弃（未产出修复版）；拒绝验收")
                video_result = history.get("outputs", {}).get(video_nodes[0][0], {})
                video_files = [entry for key in ("images", "videos") for entry in video_result.get(key, [])
                               if Path(entry.get("filename", "")).suffix.lower() in (".mp4", ".webm", ".mov", ".mkv")]
                if len(video_files) != 1 or video_files[0].get("type") != "output":
                    raise ValueError("任务没有唯一的真实视频输出文件")
                video_path = (Path(folder_paths.get_output_directory()) / video_files[0].get("subfolder", "") / video_files[0]["filename"]).resolve()
                if not video_path.is_relative_to(Path(folder_paths.get_output_directory()).resolve()) or not video_path.is_file():
                    raise ValueError("真实视频输出文件缺失或超出output目录")
                # Tail-12 evidence: this run may also have re-decoded the predecessor's
                # repaired latent. Its video is what the merge must use for that segment,
                # otherwise the merged tail would show the unfixed pixels.
                tail_evidence = None
                if tail_video_nodes or single_decode:
                    if single_decode:
                        # 主成片的解码就读修复后 latent：证据即主成片本身。
                        tail_files, tail_path = video_files, video_path
                    else:
                        tail_files = output_files(history.get("outputs", {}).get(tail_video_nodes[0][0], {}), "images") + \
                                     output_files(history.get("outputs", {}).get(tail_video_nodes[0][0], {}), "videos")
                        if len(tail_files) != 1 or tail_files[0].get("type") != "output":
                            raise ValueError("尾12证据视频输出不是唯一真实文件")
                        tail_path = (Path(folder_paths.get_output_directory()) / tail_files[0].get("subfolder", "") / tail_files[0]["filename"]).resolve()
                        if not tail_path.is_relative_to(Path(folder_paths.get_output_directory()).resolve()) or not tail_path.is_file():
                            raise ValueError("尾12证据视频缺失或超出output目录")
                    # 方案A：修复由本段自己的提交产出（挂在存档之后），因此证据视频与
                    # 修复版前缀都属于**本段**，合并时用它替换本段的尾部像素。
                    prefix_record = tail12_prefix(folder_paths.get_output_directory(), project, index)
                    if not prefix_record:
                        raise ValueError("尾12证据视频对应的修复版前缀记录缺失")
                    # 证据视频会被合并**原地替换**本段成片，帧数必须与主成片完全一致；
                    # 否则合并时间线会插入（或丢失）39 帧重复前缀。
                    main_frames = video_frame_count(video_path)
                    tail_frames = video_frame_count(tail_path)
                    if main_frames is None or tail_frames is None:
                        raise ValueError("无法读取成片帧数，不能证明尾12证据视频与主成片同约定；拒绝验收")
                    if main_frames != tail_frames:
                        raise ValueError("尾12证据视频与主成片帧数不一致（%d vs %d）；合并会插入重复帧，拒绝验收"
                                         % (tail_frames, main_frames))
                    tail_evidence = {"segment_index": index, "repaired_by_segment": index,
                                     "repaired_latent": prefix_record["path"],
                                     "repaired_latent_sha256": prefix_record["sha256"],
                                     "source_latent_sha256": prefix_record["source_sha256"],
                                     "frames": tail_frames,
                                     "params": prefix_record["params"],
                                     "video_output_ref": {**tail_files[0], "prompt_id": prompt_id},
                                     "video_sha256": hashlib.sha256(tail_path.read_bytes()).hexdigest(),
                                     "at_epoch": time.time()}
                # PENDING is bypassed only here, after checking actual SUCCESS.
                inspected = inspect_segment(folder_paths.get_output_directory(), project, index, require_accepted=False, expected_prompt_id=prompt_id, supersede=True)
                latent_path = Path(inspected["path"])
                latent_sha256 = hashlib.sha256(latent_path.read_bytes()).hexdigest().upper()
                receipts[str(index)] = {"status": "SUCCESS", "prompt_id": prompt_id, "group_id": group_id,
                                        "latent_path": str(latent_path), "latent_sha256": latent_sha256,
                                        "video_output_ref": {**video_files[0], "prompt_id": prompt_id},
                                        "video_sha256": hashlib.sha256(video_path.read_bytes()).hexdigest(),
                                        "accepted_at_epoch": time.time()}
            elif phase == "PENDING":
                # A later error, cancellation or browser disconnect leaves this
                # segment unaccepted even if Save ran before the video failed.
                # A PENDING attempt must never downgrade an already verified
                # SUCCESS receipt: that receipt is the only proof the segment
                # completed, and losing it blocks every successor segment
                # ("前段没有完整SUCCESS/latent回执") plus the resume gate.
                existing = receipts.get(str(index)) or {}
                if existing.get("status") == "SUCCESS" and existing.get("prompt_id"):
                    receipts[str(index)] = {**existing, "pending_attempt_at_epoch": time.time()}
                else:
                    receipts[str(index)] = {"status": "PENDING", "group_id": group_id,
                                            "submitted_at_epoch": time.time()}
            else:
                raise ValueError("无效接受状态")
            with FILE_STATE_LOCK:
                latest = read_json(path, {})
                if phase == "SUCCESS":
                    pending = latest.get(str(index), {})
                    # Only a PENDING attempt pins the group/prompt identity. A
                    # preserved SUCCESS (see the PENDING branch) may be
                    # superseded by this newer verified run: history + Native
                    # save identity + latent SHA verification is the authority.
                    if pending.get("status") == "PENDING" and (
                            pending.get("group_id") != group_id
                            or (pending.get("prompt_id") and pending.get("prompt_id") != prompt_id)):
                        raise ValueError("PreBake group/prompt changed before SUCCESS receipt commit")
                    pending_lineage = (latest.get('_rerun_pending') or {}).get(str(index))
                    if pending_lineage:
                        parent = latest.get(str(index - 1), {})
                        if (data.get('submission_id') != pending_lineage.get('submission_id') or
                                parent.get('status') != 'SUCCESS' or
                                parent.get('prompt_id') != pending_lineage.get('prompt_id') or
                                parent.get('latent_sha256') != pending_lineage.get('latent_sha256')):
                            raise ValueError('前驱已变化，本段结果保留但不能作为当前链回执；请重新生成')
                        inspect_segment(folder_paths.get_output_directory(), project, index - 1,
                                        expected_prompt_id=parent['prompt_id'])
                    old = latest.get(str(index), {})
                    if old.get('status') == 'SUCCESS' and old.get('prompt_id') != prompt_id:
                        for following in range(index + 1, 6):
                            prior = latest.get(str(following))
                            if prior and prior.get('status') in ('SUCCESS', 'PENDING'):
                                latest.setdefault('_invalidated_receipts', []).append({'segment_index': following, 'reason': '前段已重跑', 'receipt': prior.copy(), 'at_epoch': time.time()})
                                latest[str(following)] = {**prior, 'status': 'STALE', 'invalidated_by_segment': index, 'invalidated_at_epoch': time.time()}
                    latest.setdefault('_rerun_pending', {}).pop(str(index), None)
                else:
                    # Capture the exact accepted predecessor at submission time.
                    # A later rerun may invalidate it while this task is queued.
                    if data.get('requires_predecessor') is True:
                        token = data.get('submission_id')
                        parent = latest.get(str(index - 1), {}) if index > 0 else {}
                        if not token or parent.get('status') != 'SUCCESS' or not parent.get('prompt_id') or not parent.get('latent_sha256'):
                            raise ValueError('当前链的前一段没有完整成功回执，不能续接')
                        inspect_segment(folder_paths.get_output_directory(), project, index - 1,
                                        expected_prompt_id=parent['prompt_id'])
                        latest.setdefault('_rerun_pending', {})[str(index)] = {'submission_id': token, 'prompt_id': parent['prompt_id'], 'latent_sha256': parent['latent_sha256']}
                    current = latest.get(str(index)) or {}
                    if current.get('status') == 'SUCCESS' and current.get('prompt_id'):
                        receipts[str(index)] = {**current, 'pending_attempt_at_epoch': time.time()}
                    else:
                        receipts[str(index)] = {'status': 'PENDING', 'group_id': group_id, 'submitted_at_epoch': time.time()}
                latest[str(index)] = receipts[str(index)]
                if tail_evidence:
                    # 修复属于本段：证据视频挂在**本段**回执上，合并时以它替换本段尾部。
                    current_receipt = latest.get(str(index)) or {}
                    if current_receipt.get("status") == "SUCCESS" and current_receipt.get("prompt_id"):
                        current_receipt["tail12_prefix"] = tail_evidence
                        latest[str(index)] = current_receipt
                    else:
                        latest.setdefault("_tail12_orphan", {})[str(index)] = tail_evidence
                write_json_atomic(path, latest)
            # The queue observer can see successful History just before the UI
            # commits this durable receipt. In that race complete() correctly
            # returns while the receipt is still PENDING, and no later observer
            # is guaranteed to retry. Recheck only after the exact SUCCESS
            # receipt is durable, and only for the active group whose observed
            # prompt_id matches this segment.
            # 2026-10-25 fix: an API/automation caller that passes its explicit
            # group_id hit the same race, but the old `group_id is None` gate
            # skipped this recheck, leaving merge at WAITING_6_OF_6 forever.
            # Recheck for an unbound receipt or one bound to the active group.
            if phase == "SUCCESS":
                controller = getattr(server, "h3_native_merge_control", None)
                if controller:
                    state = controller.read(project).get("_native_merge", {})
                    active_group_id = state.get("active_group_id")
                    active_group = state.get("groups", {}).get(active_group_id, {})
                    if (group_id is None or group_id == active_group_id) and \
                            active_group.get("prompt_ids", {}).get(str(index)) == prompt_id:
                        controller.spawn(controller.complete(project, active_group_id))
            return web.json_response({"status": phase, "segment_index": index})
        except Exception as exc:
            return web.json_response({"error": str(exc)}, status=409)



