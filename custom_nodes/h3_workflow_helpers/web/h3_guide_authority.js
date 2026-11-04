import { app } from "../../../scripts/app.js";
// ============================================================================
// H3 关键帧轴·唯一权威状态源（2026-10-24 双控制器冲突修复）
//
// 历史缺陷（本模块修复）：
//   傻瓜面板⑧（N991「关键帧控制」）经 syncGuideMode 在提交期强制同步关键帧链
//   mode，但不写 guides_json.enabled；中文导演开关（setSwitch('guide')）只写
//   guides_json/N965/槽位 mode，不写 N991。两套 UI 各写各的派生状态，提交期
//   互相覆盖：轻则中文 preflight 抛「状态异常，请重新同步」误伤合法操作，
//   重则「UI 显示启用但执行被旁路」。
//
// 修复后的唯一权威：
//   H3GuideModeSelector（N991）的「关键帧控制」档位 = 唯一档位事实源（连续 0..3 张）。
//   reconcileGuideAxis 把全部派生状态一次写齐：
//     1) h3_guide_branch=1/2/3 的关键帧链 mode（点亮=slot<=count）
//     2) guides_json.guides[i].enabled = (i+1 <= count 且槽位图非空)，保留 time_seconds
//   guard 的 image_name 哨兵由 mirrorGuideSource 专职镜像，本模块不碰。
//
// 傻瓜面板与中文导演开关都只允许经由本模块写入派生状态；任何一侧的用户操作
// 都会先落回 N991，再由 reconcile 写齐另一侧可见状态 ⇒ 双向同步、单一真相。
//
// 载入纪律：本文件同时被 ComfyUI 扩展枚举自动装载（纯导出，不注册任何扩展，
// 双实例无害）与 ux/chinese_director 以带 ?v= 的 URL 显式导入（单实例共享）。
// 两处 import 必须使用同一 ?v= 版本串（当前 20261024gauth1），改码必换新串。
// ============================================================================

export const H3_GUIDE_MODES = ["不使用关键帧", "1 个关键帧画面", "2 个关键帧画面", "3 个关键帧画面"];
// 与 nodes.py 的 SENTINEL_GUIDE_NAME 同值：关键帧图片未选择时钉在这个占位上，
// 由 H3GuideImageGuard 在执行期抛中文错误（fail-closed，不自动回退）。
export const H3_SENTINEL_GUIDE_IMAGE = "__H3_GUIDE_NOT_SET__.png";

export function h3GuideCountOf(value) {
  const hit = H3_GUIDE_MODES.findIndex((mode) => mode === String(value ?? ""));
  return hit > 0 ? hit : 0; // 未识别值一律回落「不使用」＝默认路线不变
}

// 完整同步器由 h3_workflow_ux.js 注册（含 none 门控 / 永久旁路 / 画布重绘）；
// 本文件保留一个无依赖兜底实现，保证 ux 缺席时中文开关仍能安全工作。
let fullReconciler = null;
export function registerGuideReconciler(fn) {
  if (typeof fn === "function") fullReconciler = fn;
}

export function reconcileGuideAxis(selector) {
  if (fullReconciler) return fullReconciler(selector);
  return reconcileGuideAxisBasic(selector);
}

function guideCropImage(cropNode) {
  const widget = cropNode?.widgets?.find((candidate) => candidate.name === "image");
  return String(widget?.value ?? "").trim();
}

function reconcileGuideAxisBasic(selector) {
  const graph = selector?.graph || app.graph;
  const widget = selector?.widgets?.find((candidate) => candidate.name === "关键帧控制")
    || selector?.widgets?.[0];
  const count = h3GuideCountOf(widget?.value);
  if (widget && widget.value !== H3_GUIDE_MODES[count]) widget.value = H3_GUIDE_MODES[count];
  const nodes = graph?._nodes || [];
  const crops = new Map();
  const guards = new Map();
  let timeline = null;
  for (const node of nodes) {
    const slot = Number(node.properties?.h3_guide_branch);
    if (!slot) continue;
    node.mode = count >= slot ? 0 : 4;
    if (node.type === "LoadImageCrop") crops.set(slot, node);
    else if (node.type === "H3GuideImageGuard") guards.set(slot, node);
    else if (node.type === "H3GuideTimeline") timeline = node;
  }
  if (timeline) {
    const timelineWidget = timeline.widgets?.find((candidate) => candidate.name === "guides_json");
    if (timelineWidget) {
      try {
        const data = JSON.parse(timelineWidget.value);
        if (Array.isArray(data?.guides)) {
          for (let index = 0; index < data.guides.length; index += 1) {
            const slot = index + 1;
            data.guides[index].enabled = slot <= count && Boolean(guideCropImage(crops.get(slot)));
          }
          timelineWidget.value = JSON.stringify(data);
        }
      } catch (error) {
        console.warn("[H3 guide authority] guides_json 解析失败，保持原值", error);
      }
    }
    // N965 自带 h3_guide_branch（=1），上面的循环已按 count>=slot 设过 mode；
    // 这里只兜底「属性缺失」的历史图，避免 965 永远旁路/常亮。
    if (!Number(timeline.properties?.h3_guide_branch)) {
      timeline.mode = count > 0 ? 0 : 4;
    }
  }
  // guard.image_name 兜底（与 mirrorGuideSource 同语义：空→哨兵）。
  for (const [slot, guard] of guards) {
    const guardWidget = guard.widgets?.find((candidate) => candidate.name === "image_name");
    const image = guideCropImage(crops.get(slot));
    const mirrored = slot <= count && image ? image : H3_SENTINEL_GUIDE_IMAGE;
    if (guardWidget && guardWidget.value !== mirrored) {
      guardWidget.value = mirrored;
      if (Array.isArray(guardWidget.options?.values) && !guardWidget.options.values.includes(mirrored)) {
        guardWidget.options.values.push(mirrored);
      }
    }
  }
  graph?.setDirtyCanvas?.(true, true);
  return count;
}
