// Independent ordered-video merge; no continuation state is read or changed.
export function installFreeMerge(root, host) {
  if (root.__h3FreeMerge) return;
  root.__h3FreeMerge = true;
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = '自由合并';
  host.append(document.createTextNode(' '), button);
  const dialog = document.createElement('dialog');
  dialog.className = 'h3-free-merge';
  dialog.style.cssText = 'width:min(1000px,94vw);max-height:88vh;overflow:auto;background:#202833;color:#f4f6fa;border:1px solid #6d8099;border-radius:8px;padding:16px';
  const title = document.createElement('h2'); title.textContent = '自由合并视频';
  const hint = document.createElement('p'); hint.textContent = '选择输出目录中的 2 至 50 段视频；可重复添加并调整顺序。尺寸、帧率及音频会按第一段统一。';
  const search = document.createElement('input'); search.placeholder = '搜索文件名'; search.setAttribute('aria-label', '搜索文件名');
  const folder = document.createElement('input'); folder.placeholder = '文件夹筛选（可留空）'; folder.setAttribute('aria-label', '文件夹筛选');
  const find = document.createElement('button'); find.type = 'button'; find.textContent = '查找';
  const more = document.createElement('button'); more.type = 'button'; more.textContent = '更多'; more.hidden = true;
  const files = document.createElement('div'); files.style.cssText = 'max-height:30vh;overflow:auto;border:1px solid #52657a;padding:6px;margin:8px 0';
  const selectedTitle = document.createElement('h3'); selectedTitle.textContent = '合并顺序';
  const selected = document.createElement('ol'); selected.style.cssText = 'max-height:24vh;overflow:auto';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = '请选择视频';
  const start = document.createElement('button'); start.type = 'button'; start.textContent = '开始自由合并';
  const reveal = document.createElement('button'); reveal.type = 'button'; reveal.textContent = '打开输出文件夹'; reveal.hidden = true;
  const video = document.createElement('video'); video.controls = true; video.hidden = true; video.style.cssText = 'display:block;max-width:100%;max-height:240px;margin-top:8px';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭'; close.onclick = () => dialog.close();
  dialog.append(title, hint, search, folder, find, more, files, selectedTitle, selected, status, start, reveal, video, close);
  document.body.append(dialog);
  let chosen = [], next = null, timer = null, active = false;
  const cleanup = setInterval(() => {
    if (root.isConnected) return;
    if (timer) clearTimeout(timer);
    dialog.remove(); clearInterval(cleanup);
  }, 3000);
  const request = async (url, opts) => {
    const response = await fetch(url, opts); const data = await response.json();
    if (!response.ok) throw Error(data.error || '请求失败');
    return data;
  };
  const describe = item => {
    if (item.error) return `${item.folder || ''}/${item.name}：${item.error}`;
    const v = item.video, a = item.audio;
    return `${item.folder}/${item.name} · ${Number(item.duration).toFixed(2)} 秒 · ${v.width}×${v.height} · ${v.fps} fps · ${a ? '有音频' : '无音频'}`;
  };
  function renderChosen() {
    selected.replaceChildren();
    chosen.forEach((item, i) => {
      const row = document.createElement('li'), label = document.createElement('span'); label.textContent = describe(item);
      const up = document.createElement('button'); up.type = 'button'; up.textContent = '上移'; up.disabled = i === 0;
      const down = document.createElement('button'); down.type = 'button'; down.textContent = '下移'; down.disabled = i === chosen.length - 1;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除';
      up.onclick = () => { [chosen[i - 1], chosen[i]] = [chosen[i], chosen[i - 1]]; renderChosen(); };
      down.onclick = () => { [chosen[i + 1], chosen[i]] = [chosen[i], chosen[i + 1]]; renderChosen(); };
      remove.onclick = () => { chosen.splice(i, 1); renderChosen(); };
      row.append(label, up, down, remove); selected.append(row);
    });
    selectedTitle.textContent = `合并顺序（${chosen.length}/50）`;
  }
  async function load(offset = 0) {
    find.disabled = true; more.disabled = true;
    try {
      const params = new URLSearchParams({q: search.value.trim(), folder: folder.value.trim(), offset: String(offset)});
      const data = await request('/h3/free-merge/list?' + params);
      if (!offset) files.replaceChildren();
      for (const item of data.items) {
        const row = document.createElement('div'), label = document.createElement('span'); label.textContent = describe(item);
        const add = document.createElement('button'); add.type = 'button'; add.textContent = '添加'; add.disabled = !!item.error;
        add.onclick = () => { if (chosen.length >= 50) { status.textContent = '最多选择 50 段'; return; } chosen.push(item); renderChosen(); };
        row.append(label, add); files.append(row);
      }
      next = data.next_offset; more.hidden = next === null; status.textContent = `找到 ${data.total} 个视频`;
    } catch (error) { status.textContent = '读取失败：' + error.message; }
    finally { find.disabled = false; more.disabled = false; }
  }
  async function poll() {
    try {
      const data = await request('/h3/free-merge/status');
      status.textContent = data.status + (data.error ? '：' + data.error : '') + (data.filename ? `：${data.filename}（${data.mode}）` : '');
      active = data.status === '排队' || data.status === '处理中';
      if (active) { if (dialog.open) timer = setTimeout(poll, 1500); return; }
      if (data.status === '完成') {
        video.src = '/view?' + new URLSearchParams({filename: data.filename, subfolder: data.subfolder, type: 'output'});
        video.hidden = false; reveal.hidden = false;
      }
    } catch (error) { status.textContent = '状态读取失败：' + error.message; active = false; }
  }
  find.onclick = () => load(); more.onclick = () => load(next || 0);
  button.onclick = () => { dialog.showModal(); status.textContent = '输入名称搜索，或点击查找显示视频'; void poll(); };
  dialog.addEventListener('close', () => { if (timer) clearTimeout(timer); });
  start.onclick = async () => {
    if (active) { status.textContent = '正在合并，请稍候'; return; }
    if (chosen.length < 2) { status.textContent = '请至少选择 2 段视频'; return; }
    active = true; status.textContent = '排队'; video.hidden = true; reveal.hidden = true;
    try {
      const files = chosen.map(({path, identity}) => ({path, identity}));
      await request('/h3/free-merge/start', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({files})});
      await poll();
    } catch (error) { status.textContent = '合并失败：' + error.message; active = false; }
  };
  reveal.onclick = async () => { try { await request('/h3/free-merge/reveal', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}); } catch (error) { status.textContent = error.message; } };
}
