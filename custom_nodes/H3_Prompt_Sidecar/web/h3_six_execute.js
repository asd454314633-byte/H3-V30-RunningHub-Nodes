import {NATIVE_CROSS_SCHEMA,nativeCrossProof,snapshotNativeCross,wireNativeCross} from './h3_native_cross_group.mjs?v=20261108crossOff2';
import {planPromptPreload} from './h3_prompt_preload_plan.mjs?v=20261107remaining1';
import {sixOptions,inheritSegment,disableSixRebase,wireSixContinuation,assertSixSubmission,correctSixSubmission} from './h3_six_chain_contract.mjs?v=20261108cross1';
import {app} from '../../../scripts/app.js';
import {api} from '../../../scripts/api.js';
import {flightProgressText,normalizeFlightEvent} from './h3_flight_progress.js?v=20261024progress2';
import {prepareUserGuide,compileUnmanagedGuide,assertGuideSafe} from './h3_six_guides.js?v=20261101sixfix2';
import {prepareLongSong,finishLongSong} from './h3_long_song.js?v=20261020closeout1';
import {resolveSongStart} from '/extensions/H3_LongSong/start_contract.js?v=20261016origin1';
import {prepareProduction,cachedGraph,acceptProduction,submitProduction,productionStatus,enabled as productionEnabled} from '/extensions/h3_conditioning_prebake/production.js?v=20261024p0cache3';
import {assertNativeProjectUnbound} from './h3_six_receipt_contract.js?v=20261101resume3';
import {compileForSubmission,submissionDuration} from './h3_six_compiler.js?v=20261029t015time1';
import {applyShotTimes} from './six_console_v2_core.js?v=20261029fulltext1';
import {applySegmentSettingsSafe,bindTaskWorkflow} from './h3_task_workflow.js?v=20261101unblock1';

import {prepareIdentity,identityConfig,effectiveIdentity} from './h3_identity_refs.js?v=20261028t009a';
import {readJsonResponse} from './h3_json_response.js?v=p0fix1';
import {applyTail12Consume,applyTail12Produce,tail12ConsumeBlockReason,tail12ProduceBlockReason,findTail12Sampler,tail12Enabled,driftAnchorParams} from './h3_quality_switches.js?v=20261108strength1';
const flights=new Map();
let activeExecutions=0,submissionTail=Promise.resolve();
const continuityFlights=new Map();
// Websocket events wake the exact flight. History is the terminal source of truth:
// it also catches a missed event, reconnect, or an event preceding HTTP response.
const terminalEvents=new Map();
let socketPromptId=null;
api.addEventListener('execution_start',event=>{socketPromptId=event.detail?.prompt_id||null;});
for(const name of ['progress','executing'])api.addEventListener(name,event=>{
  const detail=normalizeFlightEvent(name,event.detail,socketPromptId);
  const id=detail?.prompt_id;if(id)flights.get(id)?.progress?.(detail);
});
for(const name of ['execution_success','execution_error','execution_interrupted'])api.addEventListener(name,event=>{
  const id=event.detail?.prompt_id;if(!id)return;
  terminalEvents.set(id,{name,message:event.detail.exception_message});
  if(terminalEvents.size>128)terminalEvents.delete(terminalEvents.keys().next().value);
  flights.get(id)?.check();
  if(socketPromptId===id)socketPromptId=null;
});

function waitForCompletion(id,timeout,update,graph){
  let checking=false,settled=false,interval,timer,resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no});promise.catch(()=>{});
  function cleanup(){clearInterval(interval);clearTimeout(timer);flights.delete(id);terminalEvents.delete(id)}
  function finish(error){if(settled)return;settled=true;cleanup();error?reject(error):resolve()}
  async function check(){
    if(checking||settled)return;checking=true;
    try{
      const response=await api.fetchApi(`/history/${encodeURIComponent(id)}`,{signal:AbortSignal.timeout(10000)});
      if(response.ok){const history=(await response.json())[id];
        const errors=history?.status?.messages?.filter(([name])=>['execution_error','execution_interrupted'].includes(name));
        if(errors?.length){finish(Error(errors[0][1]?.exception_message||'视频执行失败或被取消'));return}
        if(history?.status?.status_str==='error'){finish(Error('视频执行失败或被取消'));return}
        if(history?.status?.completed===true&&history.status.status_str==='success'){finish();return}
      }
      const terminal=terminalEvents.get(id);
      if(terminal&&terminal.name!=='execution_success')finish(Error(terminal.message||'视频执行失败或被中断'));
      // Generation has no wall-clock deadline. Exact history/events remain authoritative.
    }catch(error){
      // A transient HTTP disconnect is not SUCCESS; the bounded monitor retries.
    }finally{checking=false}
  }
  interval=setInterval(check,1500);
  const progress=detail=>{const text=flightProgressText(id,detail,graph);if(text&&update)update(text)};
  flights.set(id,{check,cleanup,progress});check();return {promise,cleanup};
}

export function sixExecutionState(){return {executing:activeExecutions>0,pendingPromptIds:[...flights.keys()]}}

// 接缝连续引导（开关在六段框）：下一段文本要求的画面与上一段结尾差得远时，模型会在前缀交界处直接切镜头
// （潜码第 11→12 token 突变）。续接段文本最前加一句连续性引导，让开头沿用上一镜头、再逐渐变化。
export const SEAM_LEAD='Seamless continuation of the previous shot with no cut: the first moments keep exactly the same camera position, framing, subject, lighting and colors as the end of the previous shot, then the action evolves gradually.';
export function seamLead(text){return text.startsWith(SEAM_LEAD)?text:SEAM_LEAD+' '+text}

// 预载六段提示词（开关在六段框）：文本编码器（≈15 GB）与主模型（≈21 GB）进不了同一份显存/锁页内存，
// 原本连续生成时每段都要从磁盘重读一次编码器。首段提交前，把条件节点及其上游按本段起各段文本复制进一个
// 只编码的任务一次跑完，结果由插件暂存（H3PromptPreloadStore）；各段把条件节点的输出改接到
// H3PromptPreloadPick，键相同即取用、条件节点不执行。条件节点为图中唯一的 MiniMaxH3ReferenceToVideo
// （A0 为 136；V30 为 1106，文本经 1042 音频预检）。随段变化的只有文本节点 138，依赖它的节点每段各复制
// 一份，其余上游共用。长歌开启时各段参考音频要按上一段真实成片切取（长歌节点禁止猜测音频位置），无法预载。
// 键由后端按图结构计算、不含节点号；不一致（文本被编译改写、分段设置不同、参考图被替换等）就照常编码，结果不变。
export function preloadGraph(output,texts,chainId){
  const source=preloadSource(output);
  if(!source||source.longSong)return null;
  const memo=new Map();
  const varies=id=>{
    if(!memo.has(id)){
      memo.set(id,false);
      const node=output[id];
      memo.set(id,id==='138'||Object.values(node.inputs||{}).some(v=>isPreloadLink(v)&&source.up.has(v[0])&&varies(v[0])));
    }
    return memo.get(id);
  };
  const cloneId=(id,j)=>id==='138'?`h3_preload_text_${j}`:id===source.id?`h3_preload_cond_${j}`:`h3_preload_${j}_${id}`;
  const graph={};
  for(const id of source.up)if(!varies(id))graph[id]=structuredClone(output[id]);
  texts.forEach((text,j)=>{
    for(const id of source.up){
      if(!varies(id))continue;
      const node=structuredClone(output[id]);
      for(const [name,v] of Object.entries(node.inputs||{}))
        if(isPreloadLink(v)&&source.up.has(v[0])&&varies(v[0]))node.inputs[name]=[cloneId(v[0],j),v[1]];
      if(id==='138')node.inputs.value=text;
      graph[cloneId(id,j)]=node;
    }
    graph[`h3_preload_store_${j}`]={class_type:'H3PromptPreloadStore',inputs:{conditioning:[`h3_preload_cond_${j}`,0],latent:[`h3_preload_cond_${j}`,1],chain_id:chainId}};
  });
  return graph;
}

// 条件节点的所有下游（含尾12克隆的条件链）统一改读取用节点；必须在全部图变换之后调用。
export function insertPreloadPick(output){
  const source=preloadSource(output);
  if(!source||source.longSong||output.h3_preload_pick)return false;
  for(const node of Object.values(output))for(const [name,value] of Object.entries(node.inputs||{})){
    if(isPreloadLink(value)&&value[0]===source.id)node.inputs[name]=['h3_preload_pick',value[1]];
  }
  output.h3_preload_pick={class_type:'H3PromptPreloadPick',inputs:{conditioning:[source.id,0],latent:[source.id,1]}};
  return true;
}

function isPreloadLink(v){return Array.isArray(v)&&v.length===2&&typeof v[0]==='string'}

// 唯一的 MiniMaxH3ReferenceToVideo 且其上游含文本节点 138，才可预载。
function preloadSource(output){
  const conds=Object.keys(output||{}).filter(id=>output[id]?.class_type==='MiniMaxH3ReferenceToVideo');
  if(conds.length!==1||output['138']?.class_type!=='PrimitiveStringMultiline')return null;
  const up=new Set();
  const walk=id=>{if(up.has(id)||!output[id])return;up.add(id);
    for(const v of Object.values(output[id].inputs||{}))if(isPreloadLink(v))walk(v[0])};
  walk(conds[0]);
  return up.has('138')?{id:conds[0],up,longSong:[...up].some(id=>output[id].class_type==='H3LongSongSegment')}:null;
}

const chainPreloadState={id:null,keys:new Set()};
async function preloadChainPrompts(submission,texts,chainId,queue,update){
  if(preloadSource(submission.output)?.longSong){update('预载六段提示词：长歌开启时每段音频要等上一段成片后才能确定，按原流程逐段编码');return}
  const graph=preloadGraph(submission.output,texts,chainId);
  if(!graph){update('预载六段提示词：条件节点结构不符，按原流程逐段编码');return}
  if(chainPreloadState.id!==chainId){chainPreloadState.id=chainId;chainPreloadState.keys.clear()}
  const plan=planPromptPreload(graph,chainPreloadState.keys);
  if(!plan.missing){chainPreloadState.keys.delete(plan.keys[0]);return}
  update(`预载六段提示词：补载剩余段中 ${plan.missing} 段`);
  let monitor=null;
  try{
    const result=await queue.call(api,0,{output:plan.graph,workflow:submission.workflow});
    if(!result?.prompt_id)throw Error('未收到预载 prompt_id');
    monitor=waitForCompletion(result.prompt_id);await monitor.promise;
    plan.keys.forEach(key=>chainPreloadState.keys.add(key));
    update('预载六段提示词完成');
  }catch(error){update(`预载六段提示词未完成（${error.message}），按原流程逐段编码`)}
  finally{monitor?.cleanup();chainPreloadState.keys.delete(plan.keys[0])}
}

async function storeRequest(path,data) {
  let response;try{response=await api.fetchApi(path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})}catch(error){throw Error(`连续存档请求连接失败：${path}｜${(error&&error.message)||error}`)}
  const prefix=path.startsWith('/h3/cross-group/')?'跨组校验失败：':path==='/h3/long-song/validate-start'?'音频起点校验失败：':'';
  const value=await readJsonResponse(response,path,{empty404AsObject:true,label:prefix||'连续存档检查 '});
  if(!response.ok)throw Error(prefix+((value&&value.error)||`${path}｜HTTP ${response.status} ${response.statusText}`));return value;
}
async function readReceiptJSON(path,optional=false){let response;try{response=await api.fetchApi(path)}catch(error){throw Error(`回执请求连接失败：${path}｜${(error&&error.message)||error}`)}if(optional&&response.status===404)return null;const value=await readJsonResponse(response,path,{optional404:optional,empty404AsObject:true,label:'回执读取 '});if(!response.ok)throw Error((value&&value.error)||`读取回执失败：${path}｜HTTP ${response.status} ${response.statusText}`);return value;}

export function executeVisiblePrompt(text,index,update,options={}) {
  const host=app.graph._nodes.find(n=>n.type==='H3SixDirectorState'&&n.properties.h3_six_director);
  options={...sixOptions(options),long_song:structuredClone(host?.properties.h3_long_song||null)};
  options={...options,user_guide:structuredClone(host?.__sixUI?.guideSnapshot?.()[index]||host?.properties.six_prompt_state?.guides?.[index]||null)};
  options={...options,manual_shot_times:structuredClone(host?.properties.h3_manual_shot_times?.[index]||null)};
  options={...options,identity_refs:identityConfig()};
  assertGuideSafe(options.user_guide);
  options={...options,cross_group:host?.properties.h3_cross_group?.enabled===true?structuredClone(host.properties.h3_cross_group):null};
  options={...options,submission_id:crypto.randomUUID(),production_selection:host?structuredClone({story_id:host.properties.h3_prebake_story_id,binding:host.properties.h3_prebake_binding,generated_group_id:host.__sixUI?.group?.id||null,texts:[...host.__sixRoot.querySelectorAll('.six-prompt')].map(a=>a.value),revisions:host.properties.h3_prebake_revisions||[0,0,0,0,0,0],previous:host.properties.h3_prebake_texts||['','','','','','']}):null};
  const key=(options.project_id||'H3_SIX_V288')+':'+index;
  const dependencies=options.continuous===true&&index>0&&options.independent!==true?[continuityFlights.get((options.project_id||'H3_SIX_V288')+':'+(index-1))].filter(Boolean):[];
  const promise=runVisiblePrompt(text,index,update,options,dependencies);
  if(options.continuous===true){continuityFlights.set(key,promise);const remove=()=>{if(continuityFlights.get(key)===promise)continuityFlights.delete(key)};promise.then(remove,remove)}
  return promise;
}
async function runVisiblePrompt(text,index,update,options,dependencies) {
  activeExecutions++;
  let monitor=null,release=null;
  try{
    const snapshot=structuredClone(await app.graphToPrompt());
    disableSixRebase(snapshot.output);
    if(dependencies.length){update('已接受续接请求，等待前段真实存档');const parents=await Promise.all(dependencies);options={...options,predecessor_binding:parents.at(-1)?.binding}}
    const previous=submissionTail;submissionTail=new Promise(resolve=>release=resolve);await previous;
    let project=options.project_id||'H3_SIX_V288';
    const continuous=options.continuous===true;
    if(options.isCancelled?.())throw Error('用户已取消，未提交本段');
    if(continuous&&!productionEnabled())await assertNativeProjectUnbound(project,readReceiptJSON);
    const cross=options.cross_group?.enabled===true;
    const inherit=inheritSegment(index,options.cross_group);
    if(cross&&!options.long_song?.enabled){
      if(productionEnabled())throw Error('普通跨组续接请使用当前 Native 六段路线；PreBake 长歌路线需开启完整歌曲');
      if(options.cross_group.contract?.schema!==NATIVE_CROSS_SCHEMA)throw Error('请先核验并绑定上一组');
      if(index===0){
        const host=app.graph._nodes.find(n=>n.type==='H3SixDirectorState'&&n.properties.h3_six_director);
        const saved=host?.__sixUI?.receiptSnapshot?.()||{};
        let proof=options.cross_group.contract;
        if(project!==proof.source_project&&[0,1,2,3,4,5].every(i=>saved[i]?.status==='ACCEPTED'&&saved[i]?.project_id===project)){
          proof=await nativeCrossProof(project,storeRequest);
          host.properties.h3_cross_group={...host.properties.h3_cross_group,source_project:project,contract:proof};
          const source=host.__sixRoot.querySelector('.cross-source');if(source)source.value=project;
        }
        const frozen=await snapshotNativeCross(proof,storeRequest);
        if(project===proof.source_project){project=project.slice(0,39)+'_NEXT_'+options.submission_id.replaceAll('-','').slice(0,16);host?.__sixUI?.setRuntimeProject(project);}
        options={...options,project_id:project,cross_group:{...options.cross_group,source_project:proof.source_project,contract:frozen}};
        update('接上一组：S1 读取已完成 S6 的只读快照，写入独立项目 '+project);
      }
    }else if(cross&&app.graph.extra?.h3_prebake_production?.enabled!==true)throw Error('长歌跨组续接需要现有 PreBake 时间轴提交链');
    if(options.long_song?.enabled){
      const firstText=index===0?text:options.production_selection?.texts?.[0];
      options={...options,long_song:resolveSongStart(options.long_song,firstText)};
      let selectedProject=options.predecessor_binding?.project_id||options.production_selection?.binding?.project_id||project;
      if(cross){
        if(!options.cross_group.contract)throw Error('请先核验并绑定上一组六段；未提交GPU');
        // The current canvas can still point at the completed source group.
        // Discovery is read-only; the actual immutable target is allocated by
        // prepareProduction's fork and checked again by the submission gate.
        if(selectedProject===options.cross_group.contract.source_project)selectedProject='H3_NEXT_'+options.submission_id.replaceAll('-','');
        if(options.cross_group.source_project!==options.cross_group.contract.source_project)throw Error('跨组前驱选择与绑定身份不一致，请重新核验');
        const checked=await storeRequest('/h3/cross-group/validate',{contract:options.cross_group.contract,target_project:selectedProject,source:options.long_song.source,requested_start:options.long_song.start_seconds,requested_origin:options.long_song.start_origin,continuous,independent:options.independent===true});
        options={...options,cross_group:{enabled:true,contract:checked.contract},long_song:{...options.long_song,start_seconds:checked.contract.song_start,start_origin:'跨组原曲边界 '+checked.contract.global_boundary+'秒'}};
      }
      const prepare=Object.values(snapshot.output).find(n=>n.class_type==='H3ContinuationPrepare')?.inputs;
      const verified=await storeRequest('/h3/long-song/validate-start',{...options.long_song,project_id:selectedProject,segment_index:index,inherit,...(cross?{cross_group:options.cross_group.contract,graph:snapshot.output,clean_rebase:prepare?.clean_rebase_enabled===true&&Number(prepare.clean_rebase_segment)===index}:{})});
      update(cross?`接上一组：新增内容从${options.cross_group.contract.global_boundary}秒接续，首段保护并仅裁剪39帧`:`原曲起点 ${verified.start_seconds}秒（${options.long_song.start_origin}）；后续段按实际保存帧数自动接续`);
    }
    // 2026-11-01 用户授权：本段参数覆写由"阻断"改为"仅提示"，不再挡住执行。
    const segmentParameters=applySegmentSettingsSafe(snapshot.output,options.segment_settings||{}, {longSong:options.long_song?.enabled===true});
    if(segmentParameters.warning)update(`第${index+1}段提示：${segmentParameters.warning}；本段降级按画布现有参数继续生成，不阻断`);
    let manualDuration=null,manualText=text;
    if(options.manual_shot_times?.length){
      try{
        manualDuration=submissionDuration(snapshot,segmentParameters.settings.length);
        manualText=applyShotTimes(text,options.manual_shot_times,manualDuration);
        text=manualText;
      }catch(error){
        manualDuration=null;manualText=text;
        update(`第${index+1}段提示：镜头手填时间未生效（${error.message}）；本段降级按自动时间继续生成，不阻断`);
      }
    }
    prepareLongSong(snapshot,index,options);
    const userGuide=await prepareUserGuide(snapshot,index,options);
    if(userGuide)update(`第${index+1}段关键帧：可见索引${userGuide.visible_frame} → 模型索引${userGuide.model_frame}（保护区${userGuide.protected_frames}帧）`);
    // 独立编译仅辅助：已有原稿和新参考人物不依赖旧角色库；保留实际接线校验。
    // 使用已通过的编译稿或保留原稿进入N138、PreBake与提交，不改变用户输入框。
    if(continuous&&options.production_selection?.texts?.length===6){
      // Only this segment is submitted. Other editors remain drafts, and the
      // backend preserves accepted predecessor snapshots by requested_index.
      const compiled=[...options.production_selection.texts];
      compiled[index]=await compileForSubmission(text,index,options,update,snapshot);
      options={...options,production_selection:{...options.production_selection,texts:compiled}};
      text=compiled[index];
    }else text=await compileForSubmission(text,index,options,update,snapshot);
    if(options.manual_shot_times?.length&&manualDuration){
      try{text=applyShotTimes(text,options.manual_shot_times,manualDuration)}
      catch(error){text=manualText;update(`第${index+1}段：编译稿镜头结构不匹配，采用保留手动时间的原稿`)}
      if(options.production_selection){const texts=[...options.production_selection.texts];texts[index]=text;options={...options,production_selection:{...options.production_selection,texts}}}
    }
    update(`第${index+1}段参数：${segmentParameters.settings.width??'画布'}×${segmentParameters.settings.height??'画布'}，${segmentParameters.settings.length??'画布'}帧`);
    if(options.isCancelled?.())throw Error('用户已取消，编译完成后未提交本段');
    let identity;
    try{identity=await prepareIdentity(snapshot.output,index,options.identity_refs)}catch(error){const host=app.graph._nodes.find(n=>n.properties?.h3_six_director);host?.__sixRoot?.dispatchEvent(new CustomEvent('sixidentityerror',{detail:error.message}));throw error}
    text+=identity.suffix;
    if(continuous&&inherit&&options.seam_lead===true)text=seamLead(text);
    if(options.production_selection){const texts=[...options.production_selection.texts];texts[index]=text;options={...options,production_selection:{...options.production_selection,texts}}}
    const prebake=await prepareProduction(snapshot,text,index,options,update,waitForCompletion);
    const generationProject=prebake?.context?.project_id||project;
    if(inherit&&index>0){
      try{await storeRequest(`/h3/six/store?project_id=${encodeURIComponent(generationProject)}&segment_index=${index-1}`)}
      catch(error){throw Error(`无法从第${index+1}段连续续跑：${error.message}`)}
    }
    const node=app.graph.getNodeById(138),widget=node?.widgets?.find(w=>w.name==='value');
    if(node?.type!=='PrimitiveStringMultiline'||!widget)throw Error('缺少原H3工作流的最终Prompt文本字段');
    widget.value=text;widget.callback?.(text);app.graph.setDirtyCanvas(true,true);
    snapshot.workflow=bindTaskWorkflow(snapshot.workflow,{nodeId:node.id,widgetIndex:node.widgets.indexOf(widget),widgetName:widget.name,text,context:prebake?.context,segmentSettings:options.segment_settings_all});
    if(segmentParameters.node_id==='644'&&!options.long_song?.enabled){
      const source=app.graph.getNodeById(914),input=source?.widgets?.find(w=>w.name==='value');
      if(source?.type!=='PrimitiveStringMultiline'||!input)throw Error('缺少FL2VA实际Prompt源；未提交GPU');
      snapshot.workflow=bindTaskWorkflow(snapshot.workflow,{nodeId:source.id,widgetIndex:source.widgets.indexOf(input),widgetName:input.name,text});
    }
    const original=api.queuePrompt;let submitted=null,completion=null,captureError=null;
    // Preserve the native UI graph snapshot; managed attempts submit once via the backend.
    // The backend reserves the exact prompt_id and owns recovery/stop loss.
    const capture=async function(...args){
      try{
      if(options.isCancelled?.())throw Error('用户已取消，前置检查后未提交本段');
      args[1]={...args[1],...structuredClone(snapshot)};
      const output=args[1]?.output;
      // The legacy role node supplies console widgets only.
      if(output)delete output['915'];
      // Keep audio outputs, but use the selected literal as final H3 text.
      if(output?.['138']?.inputs)output['138'].inputs.value=text;
      if(output?.['136']?.inputs&&!options.long_song?.enabled)output['136'].inputs.prompt=['138',0];
      if(output?.['644']?.inputs&&!options.long_song?.enabled){
        output['644'].inputs.prompt=text;
        if(output['914']?.class_type==='PrimitiveStringMultiline')output['914'].inputs.value=text;
      }
      wireSixContinuation(output,generationProject,index,inherit);
      args[1].output=await cachedGraph(finishLongSong(output,options,generationProject),prebake);
      wireNativeCross(args[1].output,generationProject,index,options.cross_group);
      if(!prebake)args[1].output=await compileUnmanagedGuide(args[1].output,index,options,generationProject);
      const saveVideos=Object.values(args[1].output||{}).filter(n=>n.class_type==='SaveVideo');
      if(saveVideos.length!==1)throw Error('缺少或重复SaveVideo，未提交本段');
      // Keep every real segment output under its project-specific contract path.
      saveVideos[0].inputs.filename_prefix=`${generationProject}/S${index+1}`;
      if(app.graph?.extra?.h3_drift_anchor===true)applyDriftAnchor(args[1].output,generationProject,index,update);
      args[1].output=await applyTail12Submission(args[1].output,generationProject,index,inherit,update);
      correctSixSubmission(args[1].output,generationProject,index,options.cross_group);
      if(index>0){
        const prep=Object.values(args[1].output).find(n=>n.class_type==='H3ContinuationPrepare')?.inputs;
        const ref=prep?.prev_latent,source=Array.isArray(ref)?args[1].output[String(ref[0])]:null;
        if(source?.class_type==='H3Tail12LoadAccepted'){
          const suffix=`/${generationProject}/seg_${String(index-1).padStart(5,'0')}_tail12.safetensors`;
          if(!String(source.inputs?.s3_safetensors||'').replaceAll('\\','/').endsWith(suffix)){
            const info=await storeRequest(`/h3/tail12/status?project_id=${encodeURIComponent(generationProject)}&segment_index=${index-1}`);
            if(!info.accepted_exists||!info.reusable||Number(info.segment_index)!==index-1||!String(info.repaired||'').replaceAll('\\','/').endsWith(suffix))throw Error(`无法核实 S${index} 的尾部存档`);
            source.inputs.s3_safetensors=info.repaired;update(`已自动校正：S${index+1} 接续 S${index} 的尾部`);
          }
        }
      }
      assertSixSubmission(args[1].output,generationProject,index,options.cross_group);
      if(continuous&&options.chain_preload){
        // 首段用已定稿文本；后续段按届时提交的同一顺序加工：卡片原文 + 人物容貌句 → 接缝引导
        // （与其届时写入 N138 的文本一致才会命中）。容貌设置与本段不同的段无法预知，不预载、届时照常编码。
        const texts=options.chain_preload.texts;
        if(texts?.length){
          const identityRefs=options.identity_refs??identityConfig(),mine=JSON.stringify(effectiveIdentity(identityRefs,index));
          const later=texts.slice(1).flatMap((t,k)=>JSON.stringify(effectiveIdentity(identityRefs,index+1+k))===mine?[t+identity.suffix]:[]);
          await preloadChainPrompts(args[1],[text,...later.map(t=>options.seam_lead===true?seamLead(t):t)],options.chain_preload.id,original,update);
        }
        insertPreloadPick(args[1].output);
        if(options.isCancelled?.())throw Error('用户已取消，预载后未提交本段');
      }
      if(continuous)await storeRequest('/h3/six/acceptance',{project_id:generationProject,segment_index:index,status:'PENDING',group_id:prebake?.context?.group_id,requires_predecessor:inherit&&index>0,submission_id:options.submission_id});
      if(options.isCancelled?.())throw Error('用户已取消，未提交本段');
      const result=prebake?await submitProduction(prebake,args[1].output,args[1].workflow,api.clientId):await original.apply(this,args);
      if(!submitted&&result?.prompt_id){
        submitted=result.prompt_id;
        monitor=waitForCompletion(submitted,options.timeout_ms,update,args[1].output);completion=monitor.promise;
        // Keep an early websocket error handled while native Queue finishes.
        completion.catch(()=>{});update('已加入队列',{prompt_id:submitted});
      }
      return result;
      }catch(error){captureError=error;throw error}
    };
    api.queuePrompt=capture;
    try{const result=await app.queuePrompt(0,1);if(result===false&&!submitted)throw captureError||Error('Queue未成功，请查看ComfyUI错误')}
    finally{if(api.queuePrompt===capture)api.queuePrompt=original}
    if(!submitted)throw captureError||Error('未收到本次Queue的prompt_id；没有继续提交后续段落');
    release();release=null;
    await completion;
    // Playback is evidence of a generated video, independently of continuation
    // acceptance. A rejected receipt must not hide a successful output.
    update('视频已生成，正在核验续接回执',{prompt_id:submitted,video_ready:true});
    if(prebake){const status=await productionStatus(prebake,submitted);if(status.status!=='SUCCESS')throw Error('本次任务未通过后台验收：'+status.status);await acceptProduction(prebake,submitted);}
    else if(continuous)await storeRequest('/h3/six/acceptance',{project_id:generationProject,segment_index:index,status:'SUCCESS',prompt_id:submitted,group_id:prebake?.context?.group_id,submission_id:options.submission_id});
    return {prompt_id:submitted,execution_version:prebake?.context.execution_version,story_id:prebake?.context.story_id,binding:prebake?.context||(cross?{project_id:generationProject}:undefined)};
  }finally{release?.();monitor?.cleanup();activeExecutions--}
}

// T022（方案A）：尾12 分工为"本段产出、下段消费"。
//   * 消费：第n+1段只读取第n段已落盘的修复版前缀（零采样）。缺失/过期一律拒绝提交，
//     绝不静默退回未修复的原始前缀。
//   * 产出：第n段在本段存档之后重绘本段最后12个视频token，另存 seg_n_tail12。
//     依赖方向 sampler→anchor→Save→extract→尾12采样→commit，不回指 Prepare，故无环。
// 段号约定：seg_%05d_tail12 的 %05d 就是"尾巴被修的那一段"，写入与读取（six_resume、
// 合并回执）同为该段号，不存在差一位。
const TAIL12_CONSUME_SKIP=new Set(['first segment has no predecessor','segment is not continuing',
  'continuation disabled for this segment','clean rebase segment must not receive a native prefix']);
const TAIL12_PRODUCE_SKIP=new Set(['last segment has no successor','segment latent is not being saved']);
function findNode(graph,cls){const entries=Object.entries(graph||{}).filter(([,n])=>n?.class_type===cls);return entries.length===1?{id:entries[0][0],node:entries[0][1]}:null}
export async function applyTail12Submission(output,project,index,inherit,update){
  if(!tail12Enabled(app.graph?.extra))return output;
  let graph=output||{};
  const prepare0=findNode(graph,'H3ContinuationPrepare');
  const consumeBlocked=tail12ConsumeBlockReason(graph,{index,inherit,prepare:prepare0?.node});
  if(consumeBlocked&&!TAIL12_CONSUME_SKIP.has(consumeBlocked))
    throw Error(`尾12开关已打开但接线失败：${consumeBlocked}；未提交本段`);
  if(!consumeBlocked){
    let info;
    try{
      const response=await api.fetchApi(`/h3/tail12/status?project_id=${encodeURIComponent(project)}&segment_index=${index-1}`);
      info=await readJsonResponse(response,'/h3/tail12/status',{label:'尾12状态 '});
      if(!response.ok)throw Error(info?.error||`HTTP ${response.status}`);
    }catch(error){throw Error(`尾12：无法核实前一段修复版｜${error.message}；未提交本段`)}
    if(Number(info?.segment_index)!==index-1)
      throw Error(`尾12：状态段号不符（期望S${index}，返回${info?.segment_index}）；未提交本段`);
    if(!info?.accepted_exists)throw Error(`尾12：第${index}段已接受latent不存在；未提交本段`);
    if(!info?.reusable)
      throw Error(`尾12：第${index}段还没有可用的尾12修复版（${info?.reason||'未知'}）；`
        +`请开启尾12后重跑第${index}段以产出 seg_${String(index-1).padStart(5,'0')}_tail12，再生成第${index+1}段；未提交本段`);
    const consumed=applyTail12Consume(graph,{project,index,inherit,repairedPath:info.repaired});
    if(!consumed.injected)throw Error(`尾12接入失败：${consumed.reason}；未提交本段`);
    graph=consumed.graph;
    update(`第${index+1}段：复用第${index}段尾12修复版前缀`);
  }
  const prepare1=findNode(graph,'H3ContinuationPrepare');
  const sampler=prepare1?findTail12Sampler(graph,prepare1.id):null;
  const save=findNode(graph,'H3ContinuationSave');
  const saveEnabled=save?save.node.inputs?.enabled:undefined;
  const produced=applyTail12Produce(graph,{project,index,save,sampler,saveEnabled,saveVideo:true});
  if(produced.injected){
    graph=produced.graph;
    update(produced.mode==='produce_single_decode'
      ?`第${index+1}段：本段尾部39帧将重绘，成片直接用修复版（单次解码，供第${index+2}段复用）`
      :`第${index+1}段：本段尾部39帧将重绘并另存（供第${index+2}段复用）`);
  }else if(!TAIL12_PRODUCE_SKIP.has(produced.reason)){
    throw Error(`尾12产出接线失败：${produced.reason}；未提交本段`);
  }
  return graph;
}

// A089：续接前缀已是校正后的存档，新段从第一个新位置起全力校正（原 24 位爬坡造成每段开头发灰）。
// A080：漂移锚定（实验）。仅在开关打开时把 H3LatentDriftAnchor 接在视频解码的潜空间来源之后，
// 并把解码/音频解码/Jerk/续接存档对该来源的引用改接到锚定输出；关闭时不触碰提交图。
function applyDriftAnchor(output,project,index,update){
  const decode=Object.values(output||{}).filter(n=>n?.class_type==='VAEDecode');
  const src=decode.length===1?decode[0].inputs?.samples:null;
  if(!Array.isArray(src))throw Error('漂移锚定：找不到唯一的视频解码潜空间来源，未提交本段');
  const id='h3_drift_anchor';if(output[id])throw Error('漂移锚定节点重复，未提交本段');
  let rewired=0;
  for(const node of Object.values(output)){
    if(!['VAEDecode','VAEDecodeAudio','H3JerkOracle','H3ContinuationSave'].includes(node?.class_type))continue;
    for(const [key,value] of Object.entries(node.inputs||{}))if(Array.isArray(value)&&String(value[0])===String(src[0])&&value[1]===src[1]){node.inputs[key]=[id,0];rewired++}
  }
  output[id]={class_type:'H3LatentDriftAnchor',inputs:{latent:src,project_id:project,segment_index:index,prefix_tokens:12,ramp_tokens:1,...driftAnchorParams(app.graph?.extra,index),enabled:true,grid_h:6,grid_w:4,reanchor_segment:-1,mean_after_local:true}};
  update(`第${index+1}段：漂移锚定已接入${app.graph?.extra?.h3_anchor_legacy===true?'（旧做法）':''}${index===0?'，本段记为标准':''}`);
}
