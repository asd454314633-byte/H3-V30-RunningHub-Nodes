// Preserve the clicked canvas, while binding its final prompt and immutable task.
// Later draft edits must not rewrite the workflow attached to a submitted task.
export function normalizeSegmentSettings(value={}) {
 const result={};
 for(const key of ['width','height','length']){
  const raw=value?.[key];
  result[key]=raw===undefined||raw===null||raw===''?null:Number(raw);
  if(result[key]!==null&&!Number.isSafeInteger(result[key]))throw Error('第N段'+key+'必须是整数');
 }
 for(const key of ['width','height'])if(result[key]!==null&&(result[key]<32||result[key]>16384||result[key]%32!==0))throw Error('分辨率必须在32..16384之间且为32的倍数');
 if(result.length!==null&&(result.length<5||result.length>3600||(result.length-5)%17!==0))throw Error('帧数必须符合 H3 的 17k+5 网格（5..3600）');
 return result;
}

export function applySegmentSettingsToPrompt(output,value={}, {longSong=false}={}) {
 const settings=normalizeSegmentSettings(value);
 const routes={MiniMaxH3ReferenceToVideo:['136','1106'],MiniMaxH3ImageToVideo:['644']};
 const active=Object.entries(output||{}).filter(([,node])=>Object.hasOwn(routes,node?.class_type));
 if(active.length!==1)throw Error('本段参数覆写要求唯一活动的 H3 条件节点');
 const [nodeId,node]=active[0];
 if(!routes[node.class_type].includes(String(nodeId)))throw Error('未登记的 H3 条件路由，拒绝应用本段参数');
 for(const key of ['width','height','length'])if(settings[key]!==null)node.inputs[key]=settings[key];
 return {node_id:String(nodeId),settings};
}

// 2026-11-01 用户授权：本段参数覆写不再阻断执行，改为仅提示后继续。
// 找不到唯一活动 H3 条件节点时返回 applied:false + warning，由调用方降级为画布参数继续；
// 真实参数非法（分辨率不是32倍数、帧数不在 17k+5 网格）仍由 normalizeSegmentSettings 抛出。
export function applySegmentSettingsSafe(output,value={},options={}){
 try{return {...applySegmentSettingsToPrompt(output,value,options),applied:true,warning:null}}
 catch(error){
  const settings=normalizeSegmentSettings(value);
  const routes={MiniMaxH3ReferenceToVideo:['136','1106'],MiniMaxH3ImageToVideo:['644']};
  const active=Object.entries(output||{}).filter(([,node])=>Object.hasOwn(routes,node?.class_type));
  const detail=active.length
   ?`画布有 ${active.length} 个活动 H3 条件节点（${active.map(([id,node])=>`${id}:${node.class_type}`).join('、')}），参数覆写要求唯一`
   :'画布没有活动的 H3 条件节点';
  return {node_id:null,settings:{width:null,height:null,length:null},applied:false,requested:settings,
          active_nodes:active.map(([id,node])=>[String(id),node.class_type]),
          warning:`${detail}（原判定：${String(error?.message||error)}）`};
 }
}

export function bindTaskWorkflow(workflow,{nodeId,widgetIndex,widgetName,text,context,segmentSettings}) {
 const result=structuredClone(workflow);
 const node=result.nodes?.find(n=>String(n.id)===String(nodeId));
 if(!node||!Array.isArray(node.widgets_values)||widgetIndex<0||widgetIndex>=node.widgets_values.length)throw Error('无法把最终Prompt绑定到提交画布；未提交GPU');
 node.widgets_values[widgetIndex]=text;
 if(node.widgets_values_named&&Object.hasOwn(node.widgets_values_named,widgetName))node.widgets_values_named[widgetName]=text;
 if(context){
  const host=result.nodes.find(n=>n.type==='H3SixDirectorState');
  if(!host)throw Error('提交画布缺少六段身份宿主；未提交GPU');
  host.properties.h3_prebake_story_id=context.story_id;
  host.properties.h3_prebake_binding=structuredClone(context);
  host.properties.h3_prebake_revisions=[...context.revisions];
 }
 if(segmentSettings){
  const host=result.nodes.find(n=>n.type==='H3SixDirectorState');
  if(!host)throw Error('提交画布缺少六段参数状态宿主；未提交GPU');
  host.properties.six_prompt_state={...(host.properties.six_prompt_state||{}),segment_settings:structuredClone(segmentSettings)};
 }
 return result;
}
