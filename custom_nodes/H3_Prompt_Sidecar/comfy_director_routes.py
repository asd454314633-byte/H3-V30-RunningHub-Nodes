"""ComfyUI transport only. Thread executor keeps sampling/event loop responsive."""
import asyncio
import json
import time
from aiohttp import web
from director_http_core import DirectorCore, PREFIX
try:
    from .request_guard import reject
except ImportError:  # ComfyUI loads this adapter as a top-level module.
    from request_guard import reject

def register_routes(routes):
    core = DirectorCore()
    async def handle(request):
        try:
            if request.method == 'POST':
                blocked = reject(request, origin_error='ORIGIN_REJECTED', body_error='INVALID_BODY_SIZE')
                if blocked: return blocked
                payload=await request.json()
            else:payload=None
            result=await asyncio.to_thread(core.dispatch,request.method,request.path,payload)
            return web.json_response(result,headers={'Cache-Control':'no-store'})
        except (ValueError,RuntimeError) as exc:
            return web.json_response({'error':str(exc)},status=404 if str(exc)=='NOT_FOUND' else 422)
        except Exception as exc:
            print(f'[h3-director] {exc}',flush=True)
            return web.json_response({'error':'DIRECTOR_INTERNAL_ERROR'},status=500)
    async def asset(request):
        data,kind=core.asset(request.path.removeprefix('/h3-director'))
        return web.Response(body=data,content_type=kind,headers={'Cache-Control':'no-store'})
    async def events(request):
        response = web.StreamResponse(headers={'Content-Type':'text/event-stream', 'Cache-Control':'no-store', 'X-Accel-Buffering':'no'})
        await response.prepare(request)
        previous = None
        try:
            while True:
                value = core.tasks.snapshot(request.query.get('task_id'), story_id=core.director.read()['story_id'])
                current = json.dumps(value['task'], ensure_ascii=False)
                if current != previous:
                    await response.write(('event: task\ndata: '+json.dumps(value, ensure_ascii=False)+'\n\n').encode())
                    previous = current
                else:
                    # Connection heartbeat has no effect on last_event_at or progress.
                    await response.write(('event: heartbeat\ndata: '+json.dumps({'server_time':time.time()})+'\n\n').encode())
                if value['task'] and value['task']['status'] in ('COMPLETED','FAILED','INTERRUPTED'):break
                await asyncio.sleep(2)
        except (ConnectionError, asyncio.CancelledError):
            pass  # The original worker is independent of this read-only connection.
        return response
    routes.get(PREFIX+'/groups/tasks/events')(events)
    routes.get(PREFIX+'/groups/tasks')(handle)
    routes.get(PREFIX+'/groups/tasks/{task_id}')(handle)
    routes.get(PREFIX+'/groups/result/{group_id}')(handle)
    routes.post(PREFIX+'/groups/tasks/start')(handle)
    for path in ('status','models','preferences','activity','state','groups/latest'):
        routes.get(PREFIX+'/'+path)(handle)
    for path in ('route-check','preferences','model/warm','planner/generate','groups/generate','generate','continue','refine','confirm','new-story','groups/save','groups/confirm'):
        routes.post(PREFIX+'/'+path)(handle)
    for path in ('director','six','six_ui.js'):
        routes.get('/h3-director/'+path)(asset)
    return core


