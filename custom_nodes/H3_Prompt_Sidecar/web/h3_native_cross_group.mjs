export const NATIVE_CROSS_SCHEMA='H3_NATIVE_CROSS_GROUP_V1';
export const validProject=value=>typeof value==='string'&&/^[\p{L}\p{N}_-]{1,64}$/u.test(value);
const path=value=>String(value||'').replaceAll('\\','/');
const same=(a,b)=>['schema','source_project','source_segment_index','source_path'].every(k=>a[k]===b[k])
 &&Array.isArray(b.segments)&&a.segments.length===b.segments.length
 &&a.segments.every((v,i)=>v.prompt_id===b.segments[i]?.prompt_id&&v.latent_sha256===b.segments[i]?.latent_sha256);

export async function nativeCrossProof(project,request){
 if(!validProject(project))throw Error('请填写有效的上一组项目 ID');
 const query=new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+project});
 const receipts=await request('/view?'+query);
 const segments=[];let sourcePath;
 for(let i=0;i<6;i++){
  const receipt=receipts[String(i)];
  if(receipt?.status!=='SUCCESS'||!receipt.prompt_id||!receipt.latent_sha256||receipt.pending_attempt_at_epoch)throw Error(`上一组 S${i+1} 尚无可复用的成功存档`);
  const info=await request('/h3/six/store?'+new URLSearchParams({project_id:project,segment_index:String(i)}));
  if(info.accepted!==true||info.segment_index!==i||!path(info.path).endsWith(`/h3_continuation/${project}/seg_${String(i).padStart(5,'0')}.safetensors`))throw Error(`上一组 S${i+1} 存档身份不一致`);
  segments.push({prompt_id:receipt.prompt_id,latent_sha256:String(receipt.latent_sha256).toUpperCase()});
  if(i===5)sourcePath=info.path;
 }
 return {schema:NATIVE_CROSS_SCHEMA,source_project:project,source_segment_index:5,source_path:sourcePath,segments};
}

export async function verifyNativeCross(contract,request){
 if(contract?.schema!==NATIVE_CROSS_SCHEMA)throw Error('请先核验并绑定上一组');
 const actual=await nativeCrossProof(contract.source_project,request);
 if(!same(actual,contract))throw Error('上一组存档已变化，请重新绑定');
 return actual;
}

export async function snapshotNativeCross(contract,request){
 const proof=await verifyNativeCross(contract,request);
 const archived=await request('/h3/six/archive-segment',{project_id:proof.source_project,segment_index:5});
 const relative=path(archived.path);
 const prefix=`h3_continuation/${proof.source_project}/_superseded/`;
 if(archived.archived!==1||!relative.startsWith(prefix)||relative.split('/').some(x=>x==='..'||x===''))throw Error('无法保存上一组 S6 只读快照');
 const record=await request('/view?'+new URLSearchParams({filename:'receipt.json',type:'output',subfolder:relative}));
 const last=proof.segments[5];
 if(String(record.latent_sha256).toUpperCase()!==last.latent_sha256||record.receipt?.prompt_id!==last.prompt_id)throw Error('上一组 S6 在快照期间发生变化，请重新绑定');
 const normalized=path(proof.source_path),marker='/h3_continuation/';
 const root=normalized.slice(0,normalized.lastIndexOf(marker));
 if(!root||!normalized.includes(marker))throw Error('上一组存档路径无法确认');
 return {...proof,snapshot_path:root+'/'+relative+'/seg_00005.safetensors',snapshot_sha256:last.latent_sha256};
}

export function wireNativeCross(graph,project,index,cross){
 if(cross?.enabled!==true)return;
 const contract=cross.contract;
 if(index!==0||contract?.schema!==NATIVE_CROSS_SCHEMA)return;
 if(project===contract.source_project||!contract.snapshot_path)throw Error('跨组目标必须独立且绑定 S6 快照');
 const matches=Object.values(graph).filter(n=>n.class_type==='H3ContinuationPrepare');
 if(matches.length!==1)throw Error('跨组缺少唯一 Native 准备节点');
 graph.h3_cross_group_previous={class_type:'H3Tail12LoadAccepted',inputs:{s3_safetensors:contract.snapshot_path}};
 matches[0].inputs.prev_latent=['h3_cross_group_previous',0];
}
