// Compare conditioning graphs without node IDs or display metadata. Only graph
// inputs matter; sampler/project/continuation changes do not invalidate text.
export function planPromptPreload(graph, known) {
  const memo=new Map();
  const signature=id=>{
    if(!memo.has(id)){
      const node=graph[id];
      const inputs=Object.keys(node.inputs||{}).sort().map(name=>{
        const v=node.inputs[name];
        return [name,Array.isArray(v)&&v.length===2&&graph[v[0]]?[signature(v[0]),v[1]]:v];
      });
      memo.set(id,JSON.stringify([node.class_type,inputs]));
    }
    return memo.get(id);
  };
  const stores=Object.keys(graph).filter(id=>graph[id].class_type==='H3PromptPreloadStore');
  const keys=stores.map(id=>signature(graph[id].inputs.conditioning[0]));
  const missing=stores.filter((id,i)=>!known.has(keys[i]));
  const selected={};
  const visit=id=>{
    if(selected[id])return;
    selected[id]=graph[id];
    for(const v of Object.values(graph[id].inputs||{}))
      if(Array.isArray(v)&&v.length===2&&graph[v[0]])visit(v[0]);
  };
  missing.forEach(visit);
  return {graph:selected,keys,missing:missing.length};
}
