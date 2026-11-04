import {app} from "../../scripts/app.js";

// Spark-H3's own spark_mode_widgets.js can reapply its "fidelity" preset when a workflow loads,
// which the OmniRef8 guard (h3_partial_diffusion_evict) then rejects. Node 1103 in the OmniRef8
// workflow must always carry the validated T017 C4 contract, so pin it after every graph load.
const CONTRACT = {mode: "speed", steps: 8, warmup_mode: "warmup_ratio", warmup_ratio: 0, warmup_steps: 0,
  topk_mode: "topk_ratio", topk_ratio: 0.1, topk_blocks: 228, dense_layers: 0, min_tokens: 12288, strict: true,
  dense_backend: "inherit", tail_granularity: "query", reblock_layout: "q_reuse_k", sparse_scope: "target-video",
  producer_chunk: 16384};

function pin(node) {
  if (String(node?.id) !== "1103" || node.type !== "MiniMaxH3SparkAttentionSM120") return;
  for (const widget of node.widgets ?? []) {
    if (Object.hasOwn(CONTRACT, widget.name) && widget.value !== CONTRACT[widget.name]) widget.value = CONTRACT[widget.name];
  }
}

// User 10-29: video decode is user-switchable between the original VAE (872, quality) and
// LightVAE (speed). The choice lives in graph.extra.h3_decoder; default is the original VAE.
// Reference-image encoding always stays on 872.
const LIGHT_VAE = "lightvae-lite-h3-decoder-int8-convrot.safetensors";

function linkOf(graph, id) {
  return graph.links instanceof Map ? graph.links.get(id) : graph.links?.[id];
}

function applyDecoder(graph) {
  const decode = graph?.getNodeById?.(122), original = graph?.getNodeById?.(872);
  if (decode?.type !== "VAEDecode" || !original) return;
  const slot = decode.inputs?.findIndex(input => input.name === "vae");
  if (slot < 0) return;
  const source = graph.getNodeById(linkOf(graph, decode.inputs[slot].link)?.origin_id);
  const light = graph._nodes.find(node => node.type === "VAELoader" && node.widgets?.[0]?.value === LIGHT_VAE);
  if ((graph.extra?.h3_decoder ?? "original") === "light") {
    if (source && source === light) return;
    const loader = light ?? LiteGraph.createNode("VAELoader");
    if (!light) {
      loader.title = "视频解码 LightVAE（只用于解码）";
      loader.pos = [decode.pos[0] - 380, decode.pos[1] + 140];
      graph.add(loader);
      loader.widgets[0].value = LIGHT_VAE;
    }
    decode.disconnectInput(slot);
    loader.connect(0, decode, slot);
  } else {
    if (source === original) return;
    decode.disconnectInput(slot);
    original.connect(0, decode, slot);
    if (light) graph.remove(light);
  }
  graph.setDirtyCanvas(true, true);
}

// User 10-29: chained segments collapsed under Spark/--fast while they never did before the
// upgrade, so the attention node 1103 is switchable too: original VSA (pre-upgrade, default) or
// Spark-H3. The node keeps id 1103 and its route properties; the guard accepts either contract.
const VSA_VALUES = {"selection": "vsa", "selection.keep_percent": 10, start_percent: 0, end_percent: 1,
  dense_blocks: "", min_tokens: 12288, extra_tokens: 256, sink_conditioning: "exact_kv_and_rows", verbose: false};
const ATTENTION_TYPES = {vsa: "BlockSparseAttention", spark: "MiniMaxH3SparkAttentionSM120"};

function setWidgets(node, values) {
  for (const [name, value] of Object.entries(values)) {
    const widget = node.widgets?.find(w => w.name === name);
    if (!widget) continue;
    widget.value = value;
    widget.callback?.(value);
  }
}

function applyAttention(graph) {
  const old = graph?.getNodeById?.(1103);
  const want = ATTENTION_TYPES[graph?.extra?.h3_attention ?? "vsa"];
  if (!old || !want || !Object.values(ATTENTION_TYPES).includes(old.type)) return;
  if (old.type === want) {
    if (want === ATTENTION_TYPES.vsa) {
      setWidgets(old, {selection: VSA_VALUES.selection});
      setWidgets(old, VSA_VALUES);
    } else pin(old);
    return;
  }
  const node = LiteGraph.createNode(want);
  if (!node) throw new Error(`无法创建注意力节点：${want}`);
  const source = linkOf(graph, old.inputs?.find(input => input.name === "model")?.link);
  const targets = (old.outputs?.[0]?.links ?? []).map(id => linkOf(graph, id)).filter(Boolean)
    .map(link => [link.target_id, link.target_slot]);
  const properties = {...old.properties}, pos = [...old.pos];
  const mode = old.mode, flags = {...old.flags};
  graph.remove(old);
  node.id = 1103;
  node.pos = pos;
  node.mode = mode;
  node.flags = flags;
  graph.add(node);
  Object.assign(node.properties, properties, {"Node name for S&R": want});
  if (want === ATTENTION_TYPES.vsa) {
    setWidgets(node, {selection: VSA_VALUES.selection});  // the dynamic combo adds selection.keep_percent
    setWidgets(node, VSA_VALUES);
  } else {
    pin(node);
  }
  if (source) graph.getNodeById(source.origin_id)?.connect(source.origin_slot, node, 0);
  for (const [target, slot] of targets) node.connect(0, graph.getNodeById(target), slot);
  graph.setDirtyCanvas(true, true);
}

const SWITCHES = [
  {key: "h3_attention", fallback: "vsa", apply: applyAttention, title: "注意力计算（影响采样速度和画质稳定性）",
    options: [["vsa", "原版 VSA（默认）"], ["spark", "Spark 加速（对照测试）"]],
    notes: {vsa: "当前：原版 VSA 注意力。--fast 由启动配置单独控制。下次生成起生效。", spark: "当前：Spark 加速，续接画质待对照验证。下次生成起生效。"}},
  {key: "h3_decoder", fallback: "original", apply: applyDecoder, title: "视频解码器（只影响出片解码，参考图编码不变）",
    options: [["original", "原版解码（画质优先）"], ["light", "轻量解码（速度优先）"]],
    notes: {original: "当前：原版解码。画质与升级前一致。下次生成起生效。", light: "当前：轻量解码。5 秒段约省 2 秒，细节和皮肤纹理可能变柔。下次生成起生效。"}},
];

function switchGroup(spec) {
  const group = document.createElement("div");
  group.style.cssText = "display:flex;flex-direction:column;gap:6px";
  const title = document.createElement("div");
  title.textContent = spec.title;
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:6px";
  const note = document.createElement("div");
  note.style.cssText = "color:#94a3b8";
  const buttons = spec.options.map(([value, label]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = "flex:1;padding:6px 8px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;cursor:pointer";
    button.onclick = () => {
      app.graph.extra ||= {};
      app.graph.extra[spec.key] = value;
      spec.apply(app.graph);
      draw();
    };
    row.append(button);
    return [value, button];
  });
  function draw() {
    const current = app.graph?.extra?.[spec.key] ?? spec.fallback;
    for (const [value, button] of buttons) {
      const on = value === current;
      button.style.background = on ? "#14532d" : "#1e293b";
      button.style.borderColor = on ? "#4ade80" : "#475569";
    }
    note.textContent = spec.notes[current];
  }
  group.append(title, row, note);
  return [group, draw];
}

function mountSwitch() {
  const anchor = [...document.querySelectorAll("button")].find(button => button.textContent.trim() === "整理当前段提示词");
  if (!anchor || anchor.parentElement.querySelector(".h3-decoder-switch")) return;
  const box = document.createElement("div");
  box.className = "h3-decoder-switch";
  box.style.cssText = "margin-top:10px;display:flex;flex-direction:column;gap:12px;font:12px/1.4 system-ui,'Microsoft YaHei',sans-serif;color:#cbd5e1";
  const draws = SWITCHES.map(spec => {
    const [group, draw] = switchGroup(spec);
    box.append(group);
    return draw;
  });
  box.__draw = () => draws.forEach(draw => draw());
  anchor.insertAdjacentElement("afterend", box);
  box.__draw();
}

app.registerExtension({
  name: "H3.SparkContract",
  setup() {
    setInterval(() => {
      mountSwitch();
      document.querySelectorAll(".h3-decoder-switch").forEach(box => box.__draw?.());
    }, 1000);
  },
  loadedGraphNode(node) { queueMicrotask(() => pin(node)); },
  afterConfigureGraph() { applyAttention(app.graph); for (const node of app.graph?._nodes ?? []) pin(node); applyDecoder(app.graph); },
});
