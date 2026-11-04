// Keep a flattened Prepare->protected_frames dependency out of the visual
// subgraph boundary: that boundary also consumes Guide conditioning.
export function syncCandidateGuideRoute(graph) {
  const timeline=graph?.getNodeById?.(965);
  if(graph?.getNodeById?.(1106)?.properties?.h3_ref2va_backend_branch!=='omniref8'
      ||timeline?.type!=='H3GuideTimeline')return false;
  const index=timeline.inputs?.findIndex(i=>i.name==='protected_frames');
  if(index>=0&&timeline.inputs[index].link!=null)timeline.disconnectInput(index);
  const protectedWidget=timeline.widgets?.find(w=>w.name==='protected_frames');
  if(protectedWidget)protectedWidget.value=0;
  timeline.properties.h3_flattened_guide_protection=true;
  const mode=graph.getNodeById(991)?.widgets?.find(w=>w.name==='关键帧控制')?.value;
  const count=/^[123]/.test(String(mode))?Number(String(mode)[0]):0;
  const widget=timeline.widgets?.find(w=>w.name==='guides_json');
  if(widget){
    const value=JSON.parse(widget.value);
    value.guides.forEach((g,i)=>{g.enabled=i<count});
    widget.value=JSON.stringify(value);
  }
  return true;
}
export function bindCandidateGuideProtection(graph,output) {
  if(!graph?.getNodeById?.(965)?.properties?.h3_flattened_guide_protection)return output;
  const timeline=output?.['965'];
  if(timeline?.class_type!=='H3GuideTimeline')return output;
  const prepares=Object.entries(output).filter(([id,n])=>n.class_type==='H3ContinuationPrepare');
  if(prepares.length!==1)throw Error('时间轴关键帧需要唯一接续准备节点');
  timeline.inputs.protected_frames=[prepares[0][0],2];
  return output;
}
