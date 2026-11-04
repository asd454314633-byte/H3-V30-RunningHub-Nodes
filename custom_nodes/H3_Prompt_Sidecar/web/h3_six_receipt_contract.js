// Additive resume checks for the existing six-segment loop; no submission here.
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export async function segmentFingerprint(output,text,settings={},seedPolicy='fixed'){
 const classes=new Set(['UNETLoader','CLIPLoader','VAELoader','BasicScheduler','KSamplerSelect','BlockSparseAttention','MiniMaxH3SparkAttentionSM120','ModelAttentionBackend','MiniMaxH3SigmaShift','ResolutionSelector','SeedNode','LoadImage','LoadImageCrop','LoadAudio','H3AudioFile','H3Audio8ReferencePreflight','MiniMaxH3ReferenceToVideo','MiniMaxH3ImageToVideo']);
 const nodes=Object.entries(output).filter(([,n])=>classes.has(n.class_type)||n.class_type==='PrimitiveFloat').map(([id,n])=>{
  const inputs=structuredClone(n.inputs);delete inputs.prompt;
  if(n.class_type==='SeedNode'&&seedPolicy!=='fixed')delete inputs.seed;
  return {id,type:n.class_type,inputs};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const data=JSON.stringify(stable({nodes,text,settings,seedPolicy}));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function assertNativeProjectUnbound(project,read){
 for(const name of ['_prebake_stories.json','_prebake_executions.json']){
  const data=await read('/view?'+new URLSearchParams({filename:name,type:'output',subfolder:'h3_continuation'}),true);
  if(data&&Object.values(data).some(b=>b?.project_id===project))throw Error('当前为Native直接采样，但项目已绑定PreBake；请使用独立Native恢复副本，禁止覆盖原绑定');
 }
}
export async function fingerprintWithPredecessor(output,text,settings,seedPolicy,index,options,read){
 let boundSettings=settings;
 if(index>0&&options.continuous===true&&options.independent!==true){
  const receipts=await read('/view?'+new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+options.project_id}));
  const parent=receipts[String(index-1)];
  if(parent?.status!=='SUCCESS'||!parent.prompt_id||!parent.latent_sha256)throw Error('前段没有完整SUCCESS/latent回执，禁止续接或复用旧段');
  boundSettings={...settings,predecessor:{prompt_id:parent.prompt_id,latent_sha256:parent.latent_sha256,group_id:parent.group_id,execution_version:parent.execution_version}};
 }
 return segmentFingerprint(output,text,boundSettings,seedPolicy);
}
// Durable-ledger verification: the on-disk acceptance receipt records the
// latent SHA256, the video output reference and the video SHA256, and
// /h3/six/store re-inspects the latent from disk (never from live history).
// A missing live history therefore no longer means "unverifiable": the server
// may simply have been restarted with an in-memory database.
async function verifyLedgerVideo(receipt){
  const ref=receipt.video_output_ref;
  if(!ref||typeof ref.filename!=='string'||!ref.filename||typeof ref.subfolder!=='string'||!['output','temp','input'].includes(ref.type))
    throw Error('耐久SUCCESS回执缺少可核验的视频输出引用');
  const query=new URLSearchParams({filename:ref.filename,subfolder:ref.subfolder,type:ref.type}).toString();
  const response=await fetch('/view?'+query);
  if(!response.ok)throw Error('耐久SUCCESS回执对应的视频文件缺失或不可读');
  if(!receipt.video_sha256)return;
  const length=Number(response.headers.get('content-length')||0);
  if(length>64*1024*1024)return; // Existence verified; oversized artifacts skip the digest.
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==receipt.video_sha256)throw Error('耐久SUCCESS回执视频SHA256不匹配，拒绝恢复');
}
export async function verifyNativeReceipt(record,index,project,read){
  const history=(await read('/history/'+encodeURIComponent(record.prompt_id)))[record.prompt_id];
  if(!history){
    // Live history is gone (restart with in-memory database) or the submission
    // never ran. Consult the durable acceptance ledger before declaring the
    // segment unverifiable; never mint success without artifact proof.
    const receipts=await read('/view?'+new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+project}));
    const receipt=receipts?.[String(index)];
    if(receipt?.status==='SUCCESS'&&receipt.prompt_id){
      await verifyLedgerVideo(receipt);
      const inspected=await read('/h3/six/store?'+new URLSearchParams({project_id:project,segment_index:String(index)}));
      if(inspected.accepted!==true||inspected.segment_index!==index)throw Error('耐久回执存在，但本段latent未通过Native39核验，拒绝恢复');
      if(receipt.prompt_id===record.prompt_id)
        return {state:'ACCEPTED',result:{prompt_id:record.prompt_id,accepted:true,recovered:true,video_ref:receipt.video_output_ref}};
      // The durable SUCCESS belongs to a different, later attempt of the same
      // verified input (identical fingerprint, already checked by the caller).
      // Only a stale never-completed local attempt may be reconciled onto it.
      if(['SUBMITTED','PREPARING','PENDING'].includes(record.status))
        return {state:'ACCEPTED',result:{prompt_id:receipt.prompt_id,accepted:true,recovered:true,reconciled_from_ledger:true,video_ref:receipt.video_output_ref}};
      throw Error('耐久回执与本地提交身份不一致，拒绝复用');
    }
    // No durable success for this segment: the submission is dead unless the
    // server still holds it in the execution queue.
    let queue=null;
    try{queue=await read('/queue')}catch(error){throw Error('无法读取服务端队列，暂不判定本段旧任务状态：'+error.message)}
    const entries=[...(queue?.queue_running||[]),...(queue?.queue_pending||[])];
    if(entries.some(entry=>entry===record.prompt_id||entry?.[1]===record.prompt_id||entry?.prompt_id===record.prompt_id))
      return {state:'PENDING'};
    return {state:'FAILED'};
  }
  if(history.status?.status_str==='error'||history.status?.messages?.some(([e])=>['execution_error','execution_interrupted'].includes(e)))return {state:'FAILED'};
  if(history.status?.status_str!=='success'||history.status?.completed!==true)return {state:'PENDING'};
 const graph=history.prompt[2];
 const saves=Object.values(graph).filter(n=>n.class_type==='H3ContinuationSave'&&n.inputs.enabled===true);
 const sourceProject=record.recovered_from_project||project;
 if(saves.length!==1||saves[0].inputs.project_id!==sourceProject||saves[0].inputs.segment_index!==index)throw Error('旧回执的项目/段号与本段不一致，拒绝复用');
 let receipts=await read('/view?'+new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+project}));
 let receipt=receipts[String(index)];
 // A page refresh or dropped websocket during the run skips the SUCCESS report and leaves the
 // receipt PENDING. History already proves success here; the server re-verifies history, the
 // Native save identity, the video file and the latent before it writes SUCCESS.
 if(receipt?.status==='PENDING'&&(!receipt.prompt_id||receipt.prompt_id===record.prompt_id)){
  const response=await fetch('/h3/six/acceptance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:project,segment_index:index,status:'SUCCESS',prompt_id:record.prompt_id,group_id:receipt.group_id??null})});
  if(!response.ok)throw Error('History成功，补登accepted回执被服务端拒绝：'+((await response.json().catch(()=>({}))).error||response.status));
  receipts=await read('/view?'+new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+project}));
  receipt=receipts[String(index)];
 }
 if(receipt?.status!=='SUCCESS'||receipt.prompt_id!==record.prompt_id)throw Error('History成功但正式accepted回执尚未匹配；保留视频，禁止重复提交成功段');
 for(const field of ['group_id','execution_version'])if(record[field]!==undefined&&record[field]!==receipt[field])throw Error('旧回执'+field+'不匹配，拒绝恢复');
 const inspected=await read('/h3/six/store?'+new URLSearchParams({project_id:project,segment_index:String(index)}));
 if(inspected.accepted!==true||inspected.segment_index!==index)throw Error('本段latent尚未通过Native39核验');
 return {state:'ACCEPTED',result:{prompt_id:record.prompt_id,accepted:true,recovered:true}};
}
