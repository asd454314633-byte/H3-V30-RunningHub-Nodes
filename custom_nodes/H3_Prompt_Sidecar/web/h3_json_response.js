// P0-8207 fix: every JSON read must report the concrete request + HTTP context.
// Pure read-only helper. It NEVER retries, NEVER resubmits and NEVER mutates the
// Response. A missing durable receipt (HTTP 404 + empty body) is a normal
// "no receipt written yet" state for a freshly created isolated project, not a
// parse failure -- callers decide what an empty receipt means for their gate.
// This helper must not change any submit / rerun / acceptance decision.
export async function readJsonResponse(response, url, options = {}) {
  const { optional404 = false, empty404AsObject = false, label = '' } = options;
  const status = response.status;
  const statusText = response.statusText || '';
  const contentType = response.headers && typeof response.headers.get === 'function'
    ? response.headers.get('content-type') : null;
  let text;
  try {
    text = await response.text();
  } catch (error) {
    throw new Error(`${label}读取响应体失败：${url}｜HTTP ${status} ${statusText}｜${(error && error.message) || error}`);
  }
  const length = typeof text === 'string' ? text.length : 0;
  const head = `${label}${url}｜HTTP ${status} ${statusText}｜响应长度 ${length} 字节｜Content-Type: ${contentType || '无'}`;
  if (length === 0) {
    if (status === 404) {
      if (optional404) return null;
      if (empty404AsObject) return {};
    }
    throw new Error(`${label}响应为空，JSON 解析失败（Unexpected end of JSON input）：${head}｜实际返回内容：<空>`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const preview = text.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`${label}JSON 解析失败（${(error && error.message) || error}）：${head}｜实际返回内容前200字符: ${preview}`);
  }
}
