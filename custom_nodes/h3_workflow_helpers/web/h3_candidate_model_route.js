// Reconcile physical links after mode selectors, before LiteGraph serializes.
export function syncCandidateModelRoute(graph) {
  const get = id => graph?.getNodeById?.(id);
  const omni = get(1106), preview = get(691), route = get(930), fun = get(1060);
  if (omni?.properties?.h3_ref2va_backend_branch !== 'omniref8'
      || preview?.type !== 'ModelPreviewOverrideKJ'
      || route?.type !== 'Any Switch (rgthree)') return;
  const link = input => graph.links instanceof Map ? graph.links.get(input?.link) : graph.links?.[input?.link];
  const connect = (source, target, slot) => {
    if (!source || !target?.inputs?.[slot]) return;
    if (String(link(target.inputs[slot])?.origin_id) === String(source.id)) return;
    target.disconnectInput(slot); source.connect(0, target, slot);
  };
  const generation = get(647)?.widgets?.find(w => w.name === '生成模式')?.value;
  const backend = get(931)?.widgets?.find(w => w.name === 'Ref2VA 后端')?.value;
  const active = String(generation).startsWith('多参考') && backend === 'OmniRef8（FastH3）';
  if (active) {
    connect(get(1103), preview, 0);
    const terminal = fun?.mode === 0 ? fun : preview;
    if (terminal === fun) connect(preview, fun, 0);
    connect(terminal, route, 4);
  } else {
    const source = link(route.inputs?.[4])?.origin_id;
    if ([String(preview.id), String(fun?.id)].includes(String(source))) route.disconnectInput(4);
    connect(get(645), preview, 0);
  }
  graph.setDirtyCanvas?.(true, true);
}
