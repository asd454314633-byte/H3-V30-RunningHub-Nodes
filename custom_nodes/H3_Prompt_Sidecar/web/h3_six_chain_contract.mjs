export function sixOptions(options){return {...options,continuous:true,independent:false,start_mode:'resume',start_index:0}}
export function inheritSegment(index){return index>0}
export function disableSixRebase(graph){
 for(const node of Object.values(graph||{})){
  if(['H3ContinuationPrepare','H3ContinuationTrimOnce'].includes(node.class_type))node.inputs.clean_rebase_enabled=false;
  if(node.class_type==='H3ContinuationTrimOnce'&&'rebase_output_discard_frames' in node.inputs)node.inputs.rebase_output_discard_frames=0;
 }
}
export function wireSixContinuation(output,project,index,inherit){
 const native=Object.values(output||{}).filter(n=>n.class_type?.startsWith('H3Continuation'));
 for(const type of ['Prepare','Guides','Save','TrimOnce','Assemble']){
  const nodes=native.filter(n=>n.class_type==='H3Continuation'+type);
  if(nodes.length!==1)throw Error('缺少或重复Native连续节点：'+type);
  const inputs=nodes[0].inputs;
  if(type!=='Guides')inputs.project_id=project;
  if(['Prepare','Save','TrimOnce'].includes(type))inputs.segment_index=index;
  if(type==='Save')inputs.enabled=true;
  if(['Prepare','Guides','TrimOnce'].includes(type))inputs.enabled=inherit;
  if(type==='Prepare')delete inputs.prev_latent;
 }
}

export function correctSixSubmission(graph,project,index){
 const one=type=>{const hits=Object.values(graph||{}).filter(n=>n.class_type===type);if(hits.length!==1)throw Error('六段提交校验失败：'+type+' 缺少或重复');return hits[0].inputs};
 const prepare=one('H3ContinuationPrepare'),save=one('H3ContinuationSave'),trim=one('H3ContinuationTrimOnce');
 for(const inputs of [prepare,save,trim]){inputs.project_id=project;inputs.segment_index=index;}
 prepare.enabled=index>0;trim.enabled=index>0;save.enabled=true;
 prepare.clean_rebase_enabled=false;trim.clean_rebase_enabled=false;
 if('rebase_output_discard_frames' in trim)trim.rebase_output_discard_frames=0;
 if(index===0)delete prepare.prev_latent;
 if(index>0&&Array.isArray(prepare.prev_latent)){
  const source=graph[String(prepare.prev_latent[0])];
  if(source?.class_type==='H3PreBakePreviousState'){source.inputs.project_id=project;source.inputs.segment_index=index;}
 }
 const videos=Object.entries(graph).filter(([id,n])=>n.class_type==='SaveVideo'&&id!=='h3_tail12_save');
 if(videos.length!==1)throw Error('六段提交校验失败：视频输出缺少或重复');
 videos[0][1].inputs.filename_prefix=`${project}/S${index+1}`;
}

export function assertSixSubmission(graph,project,index){
 const find=type=>Object.values(graph||{}).filter(n=>n.class_type===type);
 const one=type=>{const nodes=find(type);if(nodes.length!==1)throw Error('六段提交校验失败：'+type+' 缺少或重复');return nodes[0].inputs};
 const prepare=one('H3ContinuationPrepare'),save=one('H3ContinuationSave'),trim=one('H3ContinuationTrimOnce');
 for(const inputs of [prepare,save,trim])if(inputs.project_id!==project||inputs.segment_index!==index)throw Error('六段提交校验失败：项目或段号不一致');
 if(prepare.enabled!==(index>0)||trim.enabled!==(index>0)||save.enabled!==true||prepare.clean_rebase_enabled!==false||trim.clean_rebase_enabled!==false)throw Error('六段提交校验失败：起始或续接状态不正确');
 if(index===0&&(prepare.prev_latent!==undefined||find('H3CrossGroupPrevious').length))throw Error('S1 必须重新起画，不能读取旧前驱');
 const videos=Object.entries(graph).filter(([id,n])=>n.class_type==='SaveVideo'&&id!=='h3_tail12_save');
 if(videos.length!==1||videos[0][1].inputs.filename_prefix!==`${project}/S${index+1}`)throw Error('六段提交校验失败：视频输出段号不一致');
 const ref=prepare.prev_latent;
 if(index>0&&Array.isArray(ref)){
  const source=graph[String(ref[0])];
  if(source?.class_type==='H3Tail12LoadAccepted'){
   const path=String(source.inputs?.s3_safetensors||'').replaceAll('\\','/');
   if(!path.endsWith(`/${project}/seg_${String(index-1).padStart(5,'0')}_tail12.safetensors`))throw Error('六段提交校验失败：尾部不是前一段');
  }else if(source?.class_type!=='H3PreBakePreviousState')throw Error('六段提交校验失败：无法确认前驱来源');
 }
}

export function disableCrossGroup(host,update){
 if(host?.properties?.h3_cross_group?.enabled!==true)return false;
 const check=host.__sixRoot?.querySelector('.cross-enabled');
 if(check){check.checked=false;check.dispatchEvent(new Event('change',{bubbles:true}));}
 host.properties.h3_cross_group={...host.properties.h3_cross_group,enabled:false};
 host.__crossBindSequence=(host.__crossBindSequence||0)+1;
 update?.('已自动关闭接上一组：S1 重新起画，S2–S6 接本框前一段尾部');
 return true;
}
