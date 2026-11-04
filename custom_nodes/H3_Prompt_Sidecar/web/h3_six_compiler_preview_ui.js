import {previewCompilePrompt} from './h3_six_compiler.js?v=20261024compiler_advisory1';

// Compiler feedback stays beside the everyday prompt editor. The compiler is
// advisory: failures keep the original prompt and never submit a video job.
export function installCompilerPreview(ui, root, app) {
  if (!ui?.cards?.length || root.dataset.h3CompilerPreview === 'installed') return;
  root.dataset.h3CompilerPreview = 'installed';
  const notice = root.querySelector('.six-status');
  async function preview(index) {
    const card = ui.cards[index];
    if (!card) throw Error('请先选择要检查的段落');
    if (!card.area.value.trim()) throw Error(`第${index + 1}段提示词为空`);
    if (notice) { notice.dataset.state = 'running'; notice.textContent = `S${index + 1} 正在检查提示词；不会提交视频生成`; }
    try {
      const snapshot = await app.graphToPrompt();
      const result = await previewCompilePrompt(card.area.value, index, snapshot);
      const details = result.reason ? `：${result.reason}` : '';
      if (result.status === 'COMPILED' || result.status === 'VALIDATED') {
        if (notice) { notice.dataset.state = 'success'; notice.textContent = `S${index + 1} 编译检查通过（仅预览，提示词未被改写）`; }
      } else if (result.status === 'RAW_FALLBACK') {
        if (notice) { notice.dataset.state = 'warning'; notice.textContent = `S${index + 1} 编译服务暂不可用，原稿已保留；可重试检查${details}`; }
      } else {
        if (notice) { notice.dataset.state = 'error'; notice.textContent = `S${index + 1} 检查未完成；原稿保留，未提交生成${details}`; }
      }
      return result;
    } catch (error) {
      if (notice) { notice.dataset.state = 'error'; notice.textContent = `S${index + 1} 编译检查失败；原稿保留，未提交生成：${error.message}。可重试`; }
      throw error;
    }
  }
  ui.previewCompile = preview;
}
