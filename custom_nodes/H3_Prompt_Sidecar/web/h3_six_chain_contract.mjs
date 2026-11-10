export function sixOptions(options){return {...options,continuous:true,independent:false,start_mode:'resume',start_index:0}}
export function inheritSegment(index,cross){return index>0||cross?.enabled===true}
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

export function correctSixSubmission(graph,project,index,cross){
 const one=type=>{const hits=Object.values(graph||{}).filter(n=>n.class_type===type);if(hits.length!==1)throw Error('六段提交校验失败：'+type+' 缺少或重复');return hits[0].inputs};
 const prepare=one('H3ContinuationPrepare'),save=one('H3ContinuationSave'),trim=one('H3ContinuationTrimOnce');
 for(const inputs of [prepare,save,trim]){inputs.project_id=project;inputs.segment_index=index;}
 prepare.enabled=inheritSegment(index,cross);trim.enabled=inheritSegment(index,cross);save.enabled=true;
 prepare.clean_rebase_enabled=false;trim.clean_rebase_enabled=false;
 if('rebase_output_discard_frames' in trim)trim.rebase_output_discard_frames=0;
 if(index===0&&cross?.enabled!==true)delete prepare.prev_latent;
 if(index>0&&Array.isArray(prepare.prev_latent)){
  const source=graph[String(prepare.prev_latent[0])];
  if(source?.class_type==='H3PreBakePreviousState'){source.inputs.project_id=project;source.inputs.segment_index=index;}
 }
 const videos=Object.entries(graph).filter(([id,n])=>n.class_type==='SaveVideo'&&id!=='h3_tail12_save');
 if(videos.length!==1)throw Error('六段提交校验失败：视频输出缺少或重复');
 videos[0][1].inputs.filename_prefix=`${project}/S${index+1}`;
}

export function assertSixSubmission(graph,project,index,cross){
 const find=type=>Object.values(graph||{}).filter(n=>n.class_type===type);
 const one=type=>{const nodes=find(type);if(nodes.length!==1)throw Error('六段提交校验失败：'+type+' 缺少或重复');return nodes[0].inputs};
 const prepare=one('H3ContinuationPrepare'),save=one('H3ContinuationSave'),trim=one('H3ContinuationTrimOnce');
 for(const inputs of [prepare,save,trim])if(inputs.project_id!==project||inputs.segment_index!==index)throw Error('六段提交校验失败：项目或段号不一致');
 if(prepare.enabled!==inheritSegment(index,cross)||trim.enabled!==inheritSegment(index,cross)||save.enabled!==true||prepare.clean_rebase_enabled!==false||trim.clean_rebase_enabled!==false)throw Error('六段提交校验失败：起始或续接状态不正确');
 if(index===0){
  if(cross?.enabled===true){
   const proof=cross.contract,ref=prepare.prev_latent,source=Array.isArray(ref)?graph[String(ref[0])]:null;
   if(!proof||proof.source_project===project||!Array.isArray(ref)||ref[1]!==0)throw Error('跨组前驱身份不正确');
   if(proof.schema==='H3_NATIVE_CROSS_GROUP_V1'){
    if(ref[0]!=='h3_cross_group_previous'||source?.class_type!=='H3Tail12LoadAccepted'||source.inputs.s3_safetensors!==proof.snapshot_path||!proof.snapshot_path)throw Error('跨组 S1 未读取已核验的 S6 快照');
   }else if(source?.class_type!=='H3CrossGroupPrevious'||JSON.stringify(proof)!==source.inputs.cross_group_json||source.inputs.target_project!==project)throw Error('跨组 S1 缺少原长歌前驱绑定');
  }else if(prepare.prev_latent!==undefined||find('H3CrossGroupPrevious').length)throw Error('S1 必须重新起画，不能读取旧前驱');
 }
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

