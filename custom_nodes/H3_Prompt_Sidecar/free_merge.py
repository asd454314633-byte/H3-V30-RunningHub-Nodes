"""Independent, output-root-only video concatenation for the director UI."""
import asyncio
import json
import os
import re
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

from aiohttp import web
import folder_paths
from .request_guard import reject

EXTENSIONS = {'.mp4', '.mov', '.mkv', '.webm', '.m4v'}
MAX_ITEMS = 50


def resolve_video(root, relative):
    if not isinstance(relative, str) or not relative or any(ord(c) < 32 for c in relative):
        raise ValueError('文件路径无效')
    rel = Path(relative)
    if rel.is_absolute() or rel.drive or any(p in ('..', '.') for p in rel.parts):
        raise ValueError('文件必须位于输出目录内')
    try:
        path = (root / rel).resolve(strict=True)
    except (FileNotFoundError, OSError):
        raise ValueError(f'文件不存在或不可读：{rel.name}') from None
    if not path.is_relative_to(root) or not path.is_file() or path.suffix.lower() not in EXTENSIONS:
        raise ValueError('文件不存在、类型不支持或超出输出目录')
    return path


def identity(path):
    s = path.stat()
    # Send large Windows file identifiers as strings; JavaScript numbers cannot
    # represent nanosecond timestamps or every NTFS inode exactly.
    return {'size': str(s.st_size), 'mtime_ns': str(s.st_mtime_ns), 'dev': str(s.st_dev), 'ino': str(s.st_ino)}


async def probe(path):
    exe = shutil.which('ffprobe')
    if not exe:
        raise ValueError('找不到 ffprobe，请检查 FFmpeg 安装')
    proc = await asyncio.create_subprocess_exec(exe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), 30)
    except asyncio.TimeoutError:
        proc.kill(); await proc.wait()
        raise ValueError('读取视频信息超时')
    if proc.returncode:
        raise ValueError('无法读取视频信息')
    data = json.loads(out)
    video = next((s for s in data.get('streams', []) if s.get('codec_type') == 'video' and not s.get('disposition', {}).get('attached_pic')), None)
    audio = next((s for s in data.get('streams', []) if s.get('codec_type') == 'audio'), None)
    if not video:
        raise ValueError('文件不含可用的视频轨')
    duration = float(data.get('format', {}).get('duration') or video.get('duration') or 0)
    fps = video.get('avg_frame_rate') or video.get('r_frame_rate')
    if not re.fullmatch(r'\d+/[1-9]\d*', str(fps)) or duration <= 0:
        raise ValueError('无法确定视频帧率或时长')
    width, height = int(video.get('width') or 0), int(video.get('height') or 0)
    if width <= 0 or height <= 0 or width % 2 or height % 2:
        raise ValueError('视频分辨率无效或不是偶数')
    v = {k: video.get(k) for k in ('codec_name', 'width', 'height', 'time_base', 'pix_fmt')}
    v['fps'] = fps
    a = None if not audio else {k: audio.get(k) for k in ('codec_name', 'sample_rate', 'channels', 'channel_layout')}
    return {'duration': duration, 'video': v, 'audio': a}


def ffconcat_quote(path):
    return "'" + str(path).replace('\\', '/').replace("'", "'\\''") + "'"


class FreeMerge:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.roots = {'output': self.root, 'input': Path(folder_paths.get_input_directory()).resolve(), 'temp': Path(folder_paths.get_temp_directory()).resolve()}
        self.job = None

    async def list_files(self, query='', folder='', offset=0):
        query, folder = str(query).casefold(), str(folder).replace('\\', '/')
        if folder and (Path(folder).is_absolute() or '..' in Path(folder).parts or ':' in folder):
            raise ValueError('文件夹筛选无效')
        matches = []
        for base, dirs, files in os.walk(self.root, followlinks=False):
            dirs[:] = [d for d in dirs if not (Path(base) / d).is_symlink()]
            for name in files:
                if name.startswith('.') and name.endswith('.partial.mp4'):
                    continue
                if Path(name).suffix.lower() not in EXTENSIONS or query not in name.casefold():
                    continue
                p = Path(base) / name
                try:
                    resolved = p.resolve(strict=True)
                    if not resolved.is_relative_to(self.root) or not resolved.is_file(): continue
                    rel = p.relative_to(self.root).as_posix()
                    if folder and not (rel.startswith(folder.rstrip('/') + '/') or str(Path(rel).parent).replace('\\', '/') == folder): continue
                    matches.append((p.stat().st_mtime_ns, rel))
                except OSError:
                    continue
        matches.sort(reverse=True)
        offset = max(0, int(offset))
        items = []
        for _, rel in matches[offset:offset + 60]:
            try:
                p = resolve_video(self.root, rel); info = await probe(p)
                items.append({'path': rel, 'name': p.name, 'folder': str(Path(rel).parent).replace('\\', '/'), 'identity': identity(p), **info})
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                items.append({'path': rel, 'name': Path(rel).name, 'error': str(exc)})
        return {'items': items, 'total': len(matches), 'next_offset': offset + 60 if offset + 60 < len(matches) else None}

    async def start(self, entries):
        if self.job and self.job['status'] in ('排队', '处理中'):
            raise ValueError('正在合并，请稍候')
        if not isinstance(entries, list) or not 1 <= len(entries) <= MAX_ITEMS:
            raise ValueError('请选择 1 至 50 段视频')
        # Reserve before awaiting, so concurrent requests cannot both start.
        self.job = {'id': uuid.uuid4().hex, 'status': '排队'}
        job = self.job
        try:
            sources = []
            for entry in entries:
                if not isinstance(entry, dict): raise ValueError('文件选择无效')
                root = self.roots.get(entry.get('type', 'output'))
                if root is None: raise ValueError('视频目录类型无效')
                path = resolve_video(root, entry.get('path'))
                if identity(path) != entry.get('identity'): raise ValueError(f'文件已变化，请重新选择：{path.name}')
                info = await probe(path)
                if identity(path) != entry.get('identity'): raise ValueError(f'文件已变化，请重新选择：{path.name}')
                sources.append((path, entry['identity'], info))
            asyncio.create_task(self.run(job, sources))
            return dict(job)
        except Exception:
            self.job = None
            raise

    async def run(self, job, sources):
        job['status'] = '处理中'
        outdir = self.root / 'free_merge'
        try:
            outdir.mkdir(parents=True, exist_ok=True)
        except OSError:
            job.update(status='失败', error='无法创建输出目录'); return
        if not outdir.resolve().is_relative_to(self.root):
            job.update(status='失败', error='输出目录超出范围'); return
        name = 'free_merge_' + datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S') + '_' + uuid.uuid4().hex[:8] + '.mp4'
        target = outdir / name
        temporary = outdir / ('.' + name + '.partial.mp4')
        exe = shutil.which('ffmpeg')
        if not exe:
            job.update(status='失败', error='找不到 ffmpeg，请检查 FFmpeg 安装'); return
        try:
            for path, stamp, _ in sources:
                if not any(path.is_relative_to(root) for root in self.roots.values()) or identity(path) != stamp:
                    raise ValueError(f'文件已变化：{path.name}')
            first = sources[0][2]
            copy_ok = first['audio'] is not None and all(s[2]['video'] == first['video'] and s[2]['audio'] == first['audio'] for s in sources)
            mode = '直接拼接' if copy_ok else '统一格式后重新编码'
            if copy_ok:
                with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.ffconcat', dir=outdir, delete=False, newline='\n') as f:
                    list_path = Path(f.name)
                    f.write('ffconcat version 1.0\n')
                    for path, _, _ in sources: f.write('file ' + ffconcat_quote(path) + '\n')
                try:
                    cmd = [exe, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'concat', '-safe', '0', '-i', str(list_path), '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', '-movflags', '+faststart', str(temporary)]
                    ok = await self.execute(cmd)
                finally:
                    list_path.unlink(missing_ok=True)
                if not ok:
                    temporary.unlink(missing_ok=True); copy_ok = False; mode = '统一格式后重新编码'
            if not copy_ok:
                cmd = [exe, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y']
                for path, _, _ in sources: cmd += ['-i', str(path)]
                width, height, fps = first['video']['width'], first['video']['height'], first['video']['fps']
                audio = first['audio'] or {'sample_rate': '48000', 'channels': 2, 'channel_layout': 'stereo'}
                rate = int(audio.get('sample_rate') or 48000)
                channels = int(audio.get('channels') or 2)
                layout = audio.get('channel_layout') or ({1: 'mono', 2: 'stereo'}.get(channels))
                if not layout or not re.fullmatch(r'[A-Za-z0-9_.()+-]+', layout) or not 8000 <= rate <= 192000:
                    raise ValueError('第一段音频声道或采样率不受支持')
                filters = []
                for i, (_, _, info) in enumerate(sources):
                    filters.append(f'[{i}:v:0]scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={fps},format=yuv420p,setpts=PTS-STARTPTS[v{i}]')
                    duration = f"{info['duration']:.6f}"
                    if info['audio']:
                        filters.append(f'[{i}:a:0]aresample={rate},aformat=sample_rates={rate}:channel_layouts={layout},apad,atrim=duration={duration},asetpts=PTS-STARTPTS[a{i}]')
                    else:
                        filters.append(f'anullsrc=r={rate}:cl={layout},atrim=duration={duration},asetpts=PTS-STARTPTS[a{i}]')
                filters.append(''.join(f'[v{i}][a{i}]' for i in range(len(sources))) + f'concat=n={len(sources)}:v=1:a=1[v][a]')
                cmd += ['-filter_complex', ';'.join(filters), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(temporary)]
                if not await self.execute(cmd): raise ValueError('视频合并失败，请检查输入格式和磁盘空间')
            for path, stamp, _ in sources:
                if identity(path) != stamp: raise ValueError(f'合并期间文件发生变化：{path.name}')
            await probe(temporary)
            os.link(temporary, target)
            temporary.unlink()
            job.update(status='完成', filename=name, mode=mode, subfolder='free_merge')
        except Exception as exc:
            temporary.unlink(missing_ok=True)
            job.update(status='失败', error=str(exc))

    async def execute(self, cmd):
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        try:
            await asyncio.wait_for(proc.wait(), 1800)
        except asyncio.TimeoutError:
            proc.kill(); await proc.wait()
            raise ValueError('合并超过30分钟，已停止')
        return proc.returncode == 0


def register(server):
    manager = FreeMerge(folder_paths.get_output_directory())

    @server.routes.get('/h3/free-merge/list')
    async def listing(request):
        try:
            return web.json_response(await manager.list_files(request.query.get('q', ''), request.query.get('folder', ''), request.query.get('offset', 0)))
        except Exception as exc:
            return web.json_response({'error': str(exc)}, status=400)

    @server.routes.get('/h3/free-merge/status')
    async def status(request):
        return web.json_response(manager.job or {'status': '尚未开始'})

    @server.routes.post('/h3/free-merge/start')
    async def start(request):
        blocked = reject(request)
        if blocked: return blocked
        try:
            return web.json_response(await manager.start((await request.json()).get('files')))
        except Exception as exc:
            return web.json_response({'error': str(exc)}, status=400)

    @server.routes.post('/h3/free-merge/current')
    async def current(request):
        blocked = reject(request)
        if blocked: return blocked
        try:
            refs = (await request.json()).get('videos')
            if not isinstance(refs, list) or not 1 <= len(refs) <= 6:
                raise ValueError('当前六段框没有可合并的视频')
            entries = []
            for ref in refs:
                if not isinstance(ref, dict) or ref.get('type') not in manager.roots:
                    raise ValueError('当前视频目录类型无效')
                name, subfolder = ref.get('filename'), ref.get('subfolder')
                if not isinstance(name, str) or Path(name).name != name or not isinstance(subfolder, str):
                    raise ValueError('视频引用无效')
                relative = (Path(subfolder) / name).as_posix()
                path = resolve_video(manager.roots[ref['type']], relative)
                entries.append({'path': relative, 'type': ref['type'], 'identity': identity(path)})
            return web.json_response(await manager.start(entries))
        except Exception as exc:
            return web.json_response({'error': str(exc)}, status=400)

    @server.routes.post('/h3/free-merge/reveal')
    async def reveal(request):
        blocked = reject(request)
        if blocked: return blocked
        path = manager.root / 'free_merge'
        if not path.is_dir() or not path.resolve().is_relative_to(manager.root):
            return web.json_response({'error': '输出文件夹尚不存在'}, status=400)
        os.startfile(str(path))
        return web.json_response({'ok': True})

    server.h3_free_merge = manager
