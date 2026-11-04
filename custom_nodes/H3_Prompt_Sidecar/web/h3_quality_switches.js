// T022 quality switches — pure graph transforms, opt-in via graph.extra.
//
//   h3_tail12        : refine the last 12 video tokens (39 frames) of a segment and
//                      persist the result for the NEXT segment to use as its prefix.
//   h3_anchor_mean   : strength_mean used by H3LatentDriftAnchor on S2..S6.
//
// T022 阶段2（方案A）为什么是"本段产出、下段消费"：
//   E1 档案里尾12 采样用的是**被修那一段自己的** guider/noise/model
//   （run_segment.py: guider=prev_126, noise=prev_129, model=prev_930，
//    并把 Guides.protected_frames 写成常数 0/39）。若把这个采样放到目标段
//   Prepare 的上游并复用本段 guider，就会得到
//   Prepare → Guides → TEUnload → guider → 尾12采样 → commit → Prepare 的依赖环，
//   ComfyUI 直接以 dependency_cycle 拒绝提交。
//   因此修复挂在该段存档之后（下游），下一段只做零采样的加载复用。
//
// Both functions are pure: they never touch the live canvas, and when the switch is
// absent they return the caller's graph untouched. That is what makes
// "switch off == byte-identical submitted graph" testable offline.

export const TAIL12_PREFIX_TOKENS = 12;
export const TAIL12_AUDIO_STEPS = 65;
// E1：修第一段时 protected_frames=0，其后为 39（见 run_segment.py）。
export const TAIL12_PROTECT_FIRST = 0;
export const TAIL12_PROTECT_DEFAULT = 39;

// Refinement parameters are frozen to the accepted T018/E1 experiment:
// 8 steps with simple scheduling, the last 2 sigmas (SplitSigmas step=6), Euler.
export const TAIL12_PARAMS = {steps: 8, scheduler: 'simple', split_step: 6, sampler: 'euler',
  denoise: 1.0, prefix_tokens: TAIL12_PREFIX_TOKENS, audio_steps: TAIL12_AUDIO_STEPS};

export const TAIL12_NODES = ['h3_tail12_load', 'h3_tail12_guides', 'h3_tail12_te', 'h3_tail12_guider',
  'h3_tail12_extract', 'h3_tail12_schedule', 'h3_tail12_split', 'h3_tail12_sampler_select',
  'h3_tail12_sample', 'h3_tail12_splice', 'h3_tail12_commit', 'h3_tail12_decode',
  'h3_tail12_audio_decode', 'h3_tail12_trim', 'h3_tail12_video', 'h3_tail12_save'];

function linkOf(value) {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && Number.isInteger(value[1]);
}

export function anchorMean(extra, index) {
  if (Number(index) < 1) return 1.0;
  const raw = extra?.h3_anchor_mean;
  if (raw === undefined || raw === null || raw === '') return 1.0;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1.0;
}

export function tail12Enabled(extra) {
  return extra?.h3_tail12 === true || extra?.h3_tail12 === 'on';
}

// 为什么"本段不能消费修复版前缀"。空串表示可以使用。
export function tail12ConsumeBlockReason(graph, ctx) {
  const {index, inherit, prepare} = ctx;
  if (Number(index) < 1) return 'first segment has no predecessor';
  if (!inherit) return 'segment is not continuing';
  if (!prepare) return 'graph has no H3ContinuationPrepare';
  if (prepare.inputs?.enabled === false) return 'continuation disabled for this segment';
  if (prepare.inputs?.clean_rebase_enabled === true &&
      Number(prepare.inputs?.clean_rebase_segment) === Number(index)) return 'clean rebase segment must not receive a native prefix';
  return '';
}

// 为什么"本段不必产出修复版"。空串表示应当产出。
export function tail12ProduceBlockReason(graph, ctx) {
  const index = Number(ctx.index);
  if (!Number.isInteger(index) || index < 0 || index > 4) return 'last segment has no successor';
  if (!ctx.save) return 'graph has no H3ContinuationSave';
  if (ctx.saveEnabled !== true) return 'segment latent is not being saved';
  if (!ctx.sampler) return 'graph has no single AV sampler for this segment';
  return '';
}

function findPrepare(graph) {
  const hits = Object.entries(graph).filter(([, node]) => node?.class_type === 'H3ContinuationPrepare');
  return hits.length === 1 ? {id: hits[0][0], node: hits[0][1]} : null;
}

export function findTail12Sampler(graph, prepareId) {
  // Long-song audio locking wraps the original Prepare latent; trace only this
  // known identity-preserving latent input, never guess through arbitrary nodes.
  const fromPrepare = ref => {
    const seen = new Set();
    while (linkOf(ref) && ref[1] === 0 && !seen.has(ref[0])) {
      if (ref[0] === prepareId) return true;
      seen.add(ref[0]);
      const node = graph[ref[0]];
      if (node?.class_type !== 'H3LongSongLock') return false;
      ref = node.inputs?.latent;
    }
    return false;
  };
  const hits = Object.entries(graph).filter(([, node]) => node?.class_type === 'SamplerCustomAdvanced'
    && fromPrepare(node.inputs?.latent_image));
  return hits.length === 1 ? {id: hits[0][0], node: hits[0][1]} : null;
}

function findOne(graph, classType) {
  const hits = Object.entries(graph).filter(([, node]) => node?.class_type === classType);
  return hits.length === 1 ? {id: hits[0][0], node: hits[0][1]} : null;
}

// 主成片的 39 帧前缀裁剪节点。证据视频要按同一约定裁，否则合并替换本段成片时会插入重复帧。
export function findMainTrim(graph) {
  return findOne(graph, 'H3ContinuationTrimOnce');
}

/**
 * 消费侧：把前一段的修复版前缀读进来，零采样。
 * 只在前一段确实产出过修复版时成立；缺失/过期必须由调用方硬报错，不能退回原版。
 */
export function applyTail12Consume(output, ctx) {
  const graph = output;
  const prepare = findPrepare(graph ?? {});
  const blocked = tail12ConsumeBlockReason(graph ?? {}, {...ctx, prepare: prepare?.node});
  if (blocked) return {graph, injected: false, reason: blocked, mode: null};
  if (!ctx.repairedPath) return {graph, injected: false, reason: 'repaired prefix path unknown', mode: null};
  const next = structuredClone(graph);
  next.h3_tail12_load = {class_type: 'H3Tail12LoadAccepted', inputs: {s3_safetensors: ctx.repairedPath}};
  next[prepare.id].inputs.prev_latent = ['h3_tail12_load', 0];
  return {graph: next, injected: true, reason: '', mode: 'reuse'};
}

/**
 * 产出侧：在本段存档之后重绘本段最后 12 个视频 token。
 *
 * 依赖方向：sampler → (drift anchor) → Save → extract → 尾12采样 → splice → commit →
 *          证据解码/成片。全程不回指 Prepare，故不会成环。
 */
export function applyTail12Produce(output, ctx) {
  const graph = output;
  const index = Number(ctx.index);
  const prepare = findPrepare(graph ?? {});
  const sampler = prepare ? findTail12Sampler(graph, prepare.id) : null;
  const save = findOne(graph ?? {}, 'H3ContinuationSave');
  const blocked = tail12ProduceBlockReason(graph ?? {}, {...ctx, sampler, save});
  if (blocked) return {graph, injected: false, reason: blocked, mode: null};

  const src = save.node.inputs?.latent;
  if (!linkOf(src)) return {graph, injected: false, reason: 'save latent is not a plain link', mode: null};
  const guiderId = sampler.node.inputs?.guider?.[0];
  const noise = sampler.node.inputs?.noise;
  const guider = graph[guiderId];
  if (!guider || !linkOf(noise) || !linkOf(sampler.node.inputs?.guider)) {
    return {graph, injected: false, reason: 'sampler noise/guider wiring is not a plain link', mode: null};
  }
  const model = guider.inputs?.model;
  if (!linkOf(model)) return {graph, injected: false, reason: 'guider model is not a plain link', mode: null};
  // guider → (TE unload) → Guides：尾12必须用本段自己的条件，且把 protected_frames 固定，
  // 否则会经 Prepare 形成依赖环（E1 同样把该值写成常数）。
  const teId = guider.inputs?.conditioning?.[0];
  const te = graph[teId];
  const guidesId = te?.inputs?.conditioning?.[0];
  const guides = graph[guidesId];
  if (!te || !guides || guides.class_type !== 'H3ContinuationGuides') {
    return {graph, injected: false, reason: 'guider chain is not BasicGuider -> TEUnload -> ContinuationGuides', mode: null};
  }
  if (guider.class_type !== 'BasicGuider') {
    return {graph, injected: false, reason: `unsupported guider class ${guider.class_type}`, mode: null};
  }

  const decode = Object.values(graph).filter(node => node?.class_type === 'VAEDecode');
  const audioDecode = Object.values(graph).filter(node => node?.class_type === 'VAEDecodeAudio');
  const createVideo = Object.values(graph).find(node => node?.class_type === 'CreateVideo');
  const saveVideo = Object.values(graph).find(node => node?.class_type === 'SaveVideo');
  if (decode.length < 1 || audioDecode.length < 1) {
    return {graph, injected: false, reason: 'graph has no decode pair for the evidence video', mode: null};
  }

  const next = structuredClone(graph);
  const protect = index === 0 ? TAIL12_PROTECT_FIRST : TAIL12_PROTECT_DEFAULT;
  next.h3_tail12_guides = {class_type: guides.class_type,
    inputs: {...guides.inputs, protected_frames: protect}};
  next.h3_tail12_te = {class_type: te.class_type, inputs: {...te.inputs, conditioning: ['h3_tail12_guides', 0]}};
  next.h3_tail12_guider = {class_type: 'BasicGuider', inputs: {...guider.inputs, conditioning: ['h3_tail12_te', 0]}};
  next.h3_tail12_extract = {class_type: 'H3Tail12Extract', inputs: {accepted_s3: src}};
  next.h3_tail12_schedule = {class_type: 'BasicScheduler', inputs: {model, scheduler: TAIL12_PARAMS.scheduler,
    steps: TAIL12_PARAMS.steps, denoise: TAIL12_PARAMS.denoise}};
  next.h3_tail12_split = {class_type: 'SplitSigmas', inputs: {sigmas: ['h3_tail12_schedule', 0], step: TAIL12_PARAMS.split_step}};
  next.h3_tail12_sampler_select = {class_type: 'KSamplerSelect', inputs: {sampler_name: TAIL12_PARAMS.sampler}};
  next.h3_tail12_sample = {class_type: 'SamplerCustomAdvanced', inputs: {noise,
    guider: ['h3_tail12_guider', 0], sampler: ['h3_tail12_sampler_select', 0],
    sigmas: ['h3_tail12_split', 1], latent_image: ['h3_tail12_extract', 0]}};
  next.h3_tail12_splice = {class_type: 'H3Tail12Splice', inputs: {accepted_s3: src,
    refined_tail12: ['h3_tail12_sample', 0]}};
  // store_path 直连存档节点：保证本节点在该段落盘之后执行，从而能读回存档做来源校验。
  next.h3_tail12_commit = {class_type: 'H3Tail12Commit', inputs: {s3_with_refined_tail: ['h3_tail12_splice', 0],
    project_id: ctx.project, segment_index: index, current_segment_index: index,
    store_path: [save.id, 0],
    params_json: JSON.stringify({...TAIL12_PARAMS, ...(ctx.params ?? {}), protected_frames: protect})}};

  if (ctx.saveVideo !== false && createVideo) {
    const template = (createVideo.inputs ?? {});
    next.h3_tail12_decode = {class_type: 'VAEDecode', inputs: {samples: ['h3_tail12_commit', 0],
      vae: decode[0].inputs?.vae ?? ['872', 0]}};
    next.h3_tail12_audio_decode = {class_type: 'VAEDecodeAudio', inputs: {samples: ['h3_tail12_commit', 0],
      vae: audioDecode[0].inputs?.vae ?? ['120', 0]}};
    // 证据视频必须与主成片**同一帧约定**（S1 243、S2 起 204），否则合并替换本段成片时
    // 会插入 39 帧重复前缀。镜像节点复用主成片裁剪节点的全部输入，但不记账。
    const trim = findMainTrim(graph);
    let imageSrc = ['h3_tail12_decode', 0];
    let audioSrc = ['h3_tail12_audio_decode', 0];
    if (trim) {
      const ti = trim.node.inputs ?? {};
      next.h3_tail12_trim = {class_type: 'H3Tail12TrimMirror', inputs: {
        images: ['h3_tail12_decode', 0],
        audio: ['h3_tail12_audio_decode', 0],
        project_id: ti.project_id ?? ctx.project,
        segment_index: ti.segment_index ?? index,
        fps: ti.fps ?? 24,
        trim_frames: ti.trim_frames ?? TAIL12_PROTECT_DEFAULT,
        enabled: ti.enabled ?? false,
        clean_rebase_enabled: ti.clean_rebase_enabled ?? false,
        clean_rebase_segment: ti.clean_rebase_segment ?? 3,
        rebase_output_discard_frames: ti.rebase_output_discard_frames ?? 0,
        timeline_json: ti.timeline_json ?? ''}};
      imageSrc = ['h3_tail12_trim', 0];
      audioSrc = ['h3_tail12_trim', 1];
    }
    next.h3_tail12_video = {class_type: 'CreateVideo', inputs: {...template,
      images: imageSrc, audio: audioSrc}};
    next.h3_tail12_save = {class_type: 'SaveVideo', inputs: {...(saveVideo?.inputs ?? {}),
      video: ['h3_tail12_video', 0],
      filename_prefix: `${ctx.project}/S${index + 1}_TAIL12_REPAIRED`}};
  }
  return {graph: next, injected: true, reason: '', mode: 'produce'};
}
