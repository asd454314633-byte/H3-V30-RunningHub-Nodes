"""Shared same-origin and request-size guard for H3 write endpoints."""
from aiohttp import web

MAX_BODY = 262144
_WRITE_METHODS = {"POST", "PUT", "DELETE", "PATCH"}


def reject(request, origin_error=None, body_error=None):
    if (request.headers.get("Sec-Fetch-Site") or "").lower() == "cross-site":
        return web.json_response({"error": "跨站请求已被拒绝"}, status=403)
    origin = request.headers.get("Origin")
    if origin and origin != f"{request.scheme}://{request.host}":
        return web.json_response({"error": origin_error or "来源与本机服务不一致"}, status=403)
    if request.method in _WRITE_METHODS:
        length = request.content_length
        if length is None or not 0 < length <= MAX_BODY:
            return web.json_response({"error": body_error or "请求体为空或超过 256KB"}, status=413)
    return None
