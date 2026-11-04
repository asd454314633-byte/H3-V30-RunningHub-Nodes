const SIGNATURE_NODES=['620','1103','1106','687','688','138','132','626','628','764','961'];

function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
 return value;
}

export function workflowPreviewSignature(graph){
 if(!graph||typeof graph!=='object')return null;
 const nodes=SIGNATURE_NODES.map(id=>{
  const node=graph[id];
  return node?[id,node.class_type,stable(node.inputs||{})]:null;
 });
 if(nodes.some(node=>node===null)||graph['1106']?.class_type!=='MiniMaxH3ReferenceToVideo')return null;
 return JSON.stringify(nodes);
}

export function findMatchingHistoryVideo(history,currentGraph,saveVideoNodeId='961'){
 const signature=workflowPreviewSignature(currentGraph);
 if(!signature||!history||typeof history!=='object')return null;
 for(const [promptId,entry] of Object.entries(history)){
  if(!promptId||entry?.status?.completed!==true||entry.status.status_str!=='success')continue;
  const prompt=entry.prompt;
  const graph=Array.isArray(prompt)&&prompt.length>2?prompt[2]:null;
  if(workflowPreviewSignature(graph)!==signature)continue;
  const output=entry.outputs?.[saveVideoNodeId];
  const videos=[...(output?.videos||[]),...(output?.images||[])].filter(item=>typeof item?.filename==='string'&&/\.(mp4|webm|mov|mkv)$/i.test(item.filename));
  if(videos.length!==1)continue;
  const video=videos[0];
  if(typeof video.subfolder!=='string'||!['output','temp','input'].includes(video.type))continue;
  return {filename:video.filename,subfolder:video.subfolder,type:video.type,prompt_id:promptId,preview_source:'matching-main-workflow-history'};
 }
 return null;
}
