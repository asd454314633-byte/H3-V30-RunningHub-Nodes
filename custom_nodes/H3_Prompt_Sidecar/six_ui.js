const A047_CSS="\n .h3-six.h3-six-t003,.h3-six-t003 *{font-size:14px!important}.h3-six-t003 h2{font-size:18px!important}.h3-six-t003 .six-header{height:28px;min-height:28px}.h3-six-t003 .six-header label{font-size:14px!important}.h3-six-t003 .six-model-label{max-width:140px;font-size:13.5px!important}.h3-six-t003 .six-config-one,.h3-six-t003 .six-config-two{min-height:35px;height:35px;gap:4px}.h3-six-t003 .six-config-one>label,.h3-six-t003 .six-config-two>label{white-space:nowrap}.h3-six-t003 .six-config-two label{font-size:14px!important}.h3-six-t003 .six-config-two select{padding:3px}.h3-six-t003 .six-story{display:grid;grid-template-columns:55% minmax(0,1fr) 110px;gap:5px;height:66px;min-height:66px}.h3-six-t003 .six-story>label{display:flex;flex-direction:column;align-items:stretch;gap:0;line-height:18px}.h3-six-t003 textarea.six-input{height:48px;min-height:48px;padding:4px;font-size:14px!important;line-height:18px}.h3-six-t003 .six-story button{align-self:end;height:48px;font-size:14px!important;white-space:normal}.h3-six-t003 .six-prompts{grid-template-rows:repeat(2,288px);gap:5px}.h3-six-t003 .six-card{padding:2px;gap:0}.h3-six-t003 .six-card-head{height:20px;min-height:20px;gap:4px}.h3-six-t003 .six-card-head h3{font-size:16px!important}.h3-six-t003 .six-card-status{font-size:14px!important;line-height:18px!important;padding:0 4px!important;max-width:132px}.h3-six-t003 .six-time{font-size:13.5px!important;line-height:18px}.h3-six-t003 .six-video-wrap{height:150px;min-height:150px;aspect-ratio:auto;width:100%;flex:none}.h3-six-t003 .six-video{height:150px;object-fit:contain}.h3-six-t003 textarea.six-prompt{height:80px;min-height:80px;font-size:14px!important;line-height:18px;padding:5px}.h3-six-t003 .six-card-foot{height:32px;min-height:32px;gap:3px}.h3-six-t003 .six-card-foot button{min-height:32px;height:32px;font-size:14px!important;padding:3px 5px}.h3-six-t003 .six-card-foot .six-prebake-state{font-size:13.5px!important;max-width:48px;line-height:14px}.h3-six-t003 .six-inherit-hint{font-size:13.5px!important;line-height:14px;flex:1}.h3-six-t003 .six-header .six-merge-badge{font-size:13.5px!important}.h3-six-t003 .six-footer-actions>span{font-size:13.5px!important;line-height:16px}.h3-six-t003 .six-footer-tools button{min-height:35px;height:35px}.h3-six-t003 .six-footer-tools{flex-wrap:wrap}.h3-six-t003 .six-run-all{min-height:46px;height:46px;font-size:18px!important}.h3-six-t003 .six-footer{min-height:160px;height:160px;max-height:160px}.h3-six-t003 .six-task-details button,.h3-six-t003 .six-card-options button{min-height:35px}.h3-six-t003 .six-model-start{min-height:35px;height:35px}.h3-six-t003 .six-execute:disabled{background:#33383f;color:#a6adb7;opacity:.6}.h3-six-t003 .six-task-details .song-status,.h3-six-t003 .six-task-details .cross-status,.h3-six-t003 .six-task-details .song-effective-start{display:block!important}\n ";
import {materialCell} from '/extensions/h3_workflow_helpers/h3_material_cell.js';
const SIX_T003_CSS=".h3-six.h3-six-t003{box-sizing:border-box;width:100%;height:100%;max-height:930px;padding:8px;background:#222428;color:#e6e8eb;border:1px solid #353840;border-radius:10px;font:12px/1.3 'Microsoft YaHei',system-ui;display:flex;flex-direction:column;gap:5px;overflow:visible}\n.h3-six-t003 *{box-sizing:border-box;min-width:0}.h3-six-t003 h2,.h3-six-t003 h3{margin:0}.h3-six-t003 .six-header{height:38px;display:flex;align-items:center;gap:8px;background:#2a3a52;border-radius:6px;padding:5px}.h3-six-t003 .six-header h2{font-size:17px;white-space:nowrap}.h3-six-t003 .six-header label{display:flex;align-items:center;gap:5px;flex:1}.h3-six-t003 .six-project{width:100%;height:30px}.h3-six-t003 .six-merge-badge{border-radius:14px;background:#283f34;color:#7fe0ae;padding:4px;font-size:11px;white-space:nowrap}.h3-six-t003 .six-config-one,.h3-six-t003 .six-config-two{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:0;flex:none}.h3-six-t003 .six-config-one>label,.h3-six-t003 .six-config-two>label{display:flex;align-items:center;gap:4px;white-space:nowrap}.h3-six-t003 .six-config-one .six-model{width:230px}.h3-six-t003 .six-model-label{max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}.h3-six-t003 .six-story{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,.7fr);gap:6px;height:65px;flex:none}.h3-six-t003 .six-story>label{display:flex;flex-direction:column;font-size:11px;gap:2px}.h3-six-t003 textarea.six-input{height:44px;min-height:44px;padding:4px;font:12px/1.3 inherit}.h3-six-t003 .six-story button{align-self:end;height:44px}.h3-six-t003 button,.h3-six-t003 select{font:inherit;min-height:32px;margin:0;padding:4px 6px;color:#edf2f7;background:#293341;border:1px solid #465569;border-radius:5px}.h3-six-t003 input{color:#edf2f7;background:#14171c;border:1px solid #465569;border-radius:4px}.h3-six-t003 button{cursor:pointer}.h3-six-t003 button:disabled{opacity:.4;cursor:default}.h3-six-t003 .six-status{font-size:10px;line-height:1.2;margin:0;max-height:26px;overflow:visible;white-space:normal;flex:none}.h3-six-t003 .six-prompts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,300px);gap:7px;margin:0;flex:none;min-height:0}.h3-six-t003 .six-card{display:flex;flex-direction:column;gap:4px;padding:5px;border:1px solid #3c4655;border-radius:7px;background:#1b2028;min-width:0;min-height:0;overflow:visible}.h3-six-t003 .six-card-head{display:flex;align-items:center;gap:5px;min-height:22px}.h3-six-t003 .six-card-head h3{font-size:15px}.h3-six-t003 .six-time{font-size:10px;color:#a6b4c5;white-space:nowrap}.h3-six-t003 .six-card-status{margin-left:auto;border-radius:10px;padding:2px 5px;background:#283746;color:#add4fa;font-size:10px;max-width:115px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.h3-six-t003 .six-video-wrap{position:relative;display:flex;flex:none;width:100%;aspect-ratio:16/9;height:auto;min-height:0;margin:0;background:#080c12;border-radius:5px;overflow:hidden;align-items:center;justify-content:center}.h3-six-t003 .six-video{display:block;width:100%;height:100%;min-height:0;object-fit:contain;flex:none}.h3-six-t003 .six-video[hidden]{display:none}.h3-six-t003 .six-video-label{position:absolute;text-align:center;max-width:100%;padding:8px;white-space:normal;font-size:11px;overflow-wrap:anywhere}.h3-six-t003 .six-video-label[hidden]{display:none}.h3-six-t003 textarea.six-prompt{height:65px;min-height:55px;flex:1;resize:none;padding:5px;border-radius:5px;font:12px/1.35 system-ui;background:#14171c;color:#fff}.h3-six-t003 .six-card-foot{display:flex;align-items:center;gap:3px;min-height:32px}.h3-six-t003 .six-inherit-hint{flex:1;font-size:10px}.h3-six-t003 .six-use{font-size:10px}.h3-six-t003 .six-execute{display:inline-block!important;white-space:nowrap}.h3-six-t003 .six-prebake-state{font-size:9px;max-width:55px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.h3-six-t003 .six-card-options{background:#1d2632;color:#edf2f7;border:1px solid #52657a;padding:12px;border-radius:8px;max-width:420px}.h3-six-t003 .six-card-options .six-actions{display:none}.h3-six-t003 .six-card-options .six-segment-parameters{display:grid}.h3-six-t003 .six-guide{margin:5px 0}.h3-six-t003 .six-task-progress{font-size:10px;max-height:26px;overflow:visible}.h3-six-t003 .six-task-progress details:not([open]){display:inline-block}.h3-six-t003 .six-task-segment{display:none}.h3-six-t003 .six-progress{position:absolute;width:100px;height:3px;top:22px;right:6px}.h3-six-t003 .six-card-head{position:relative}.h3-six-t003 .six-progress[hidden]{display:none}.h3-six-t003 .six-footer{display:flex;gap:8px;flex:1;min-height:150px;max-height:180px;border-top:1px solid #353840;padding-top:5px}.h3-six-t003 .six-footer-actions{display:flex;flex-direction:column;gap:5px;flex:1}.h3-six-t003 .six-run-all{height:46px;font-size:16px;background:#33835f;color:#fff;font-weight:700}.h3-six-t003 .six-latest-output{color:#7fb4ff;overflow-wrap:anywhere}.h3-six-t003 .six-merge-host{width:320px;min-width:320px;flex:none}.h3-six-t003 .h3-native-merge-controls{border:0!important;padding:0!important;margin:0!important;font-size:10px}.h3-six-t003 .h3-native-merge-controls video{width:320px!important;height:145px!important;min-width:320px;object-fit:contain;margin:0!important}.h3-six-t003 .h3-native-merge-controls details{display:block}.h3-six-t003 .h3-cross-group,.h3-six-t003 .h3-long-song{padding:0!important;margin:0!important;border:0!important;display:flex!important;gap:4px!important;align-items:center;font-size:11px}.h3-six-t003 .h3-cross-group input.cross-source{width:110px!important}.h3-six-t003 .song-source{width:120px!important}.h3-six-t003 .song-status,.h3-six-t003 .cross-status,.h3-six-t003 .song-effective-start{display:none}.h3-six-t003 .six-cloud-warning[hidden]{display:none}.h3-six-t003 .six-config-one .h3-cn-switch{margin:0!important;font-size:11px;gap:4px!important}.h3-six-t003 .six-config-one .h3-cn-switch select{padding:3px!important}\n";
import {scopedSixStorage} from '/extensions/H3_Prompt_Sidecar/six_identity.js?v=20261025identity1';
import {readJsonResponse} from '/extensions/H3_Prompt_Sidecar/h3_json_response.js?v=p0fix1';
function anchorPopoverAtButton(popover,button){const place=()=>{if(!popover.isConnected||!popover.matches(':popover-open'))return;const a=button.getBoundingClientRect();popover.style.position='fixed';popover.style.inset='auto';popover.style.margin='0';popover.style.maxHeight=`${Math.max(120,Math.min(innerHeight*.42,480))}px`;popover.style.overflow='auto';popover.style.right='auto';popover.style.bottom='auto';const r=popover.getBoundingClientRect();const left=Math.max(8,Math.min(a.left,innerWidth-r.width-8));let top=a.bottom+6;if(top+r.height>innerHeight-8)top=a.top-r.height-6;top=Math.max(8,Math.min(top,innerHeight-r.height-8));popover.style.left=`${left}px`;popover.style.top=`${top}px`};const schedule=()=>requestAnimationFrame(place);button.addEventListener('click',schedule);popover.addEventListener('toggle',e=>{if(e.newState==='open')schedule()});addEventListener('resize',schedule)}
export function ensureSixExecutionState(value) {
  const state=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return {continuous:state.continuous===true,start_index:Number.isInteger(state.start_index)&&state.start_index>=0&&state.start_index<6?state.start_index:0,start_mode:state.start_mode==='independent'?'independent':'resume',project_id:typeof state.project_id==='string'&&/^[\p{L}\p{N}_-]{1,64}$/u.test(state.project_id.trim())?state.project_id.trim():'H3_SIX_V288',runtime_project_id:typeof state.runtime_project_id==='string'&&/^[\p{L}\p{N}_-]{1,64}$/u.test(state.runtime_project_id.trim())?state.runtime_project_id.trim():null,prompt_preload:state.prompt_preload===true,seam_lead:state.seam_lead===true};
}
export async function mountSixDirector(root, {execute=null, base='', executionState={},videoRefs=[],resolveVideo=null,mediaURL=null,storyId=null,guideConfigs=null,guideTools={},collectReferences=null,savedState=null,workflowIdentity=null,workflowSnapshot=null,fingerprintSegment=null,recoverSegment=null,canForkSegment=()=>false}={}) {
  // A graph can mount before the workflow store switches tabs. Refuse an
  // identity until the owning workflow and graph agree; never use the stale tab.
  const currentIdentity=()=>{try{return typeof workflowIdentity==='function'?workflowIdentity():workflowIdentity}catch{return null}};
  const draftStorage={
    read(kind){const id=currentIdentity();return id?scopedSixStorage(localStorage,id).read(kind):null},
    write(kind,data){const id=currentIdentity();if(!id)return false;scopedSixStorage(localStorage,id).write(kind,data);return true},
    remove(kind){const id=currentIdentity();if(id)scopedSixStorage(localStorage,id).remove(kind)},
  };
  let recoveryEditedHere=false,pendingRecovery=null,checkedRecoveryIdentity=null,loadedIntentIdentity=null,recoveryChecking=false;
  const acceptedRecovery=globalThis.__h3SixAcceptedDrafts||(globalThis.__h3SixAcceptedDrafts=new Map());

  const receipts=draftStorage.read('chain-receipts')||structuredClone(savedState?.chain_receipts)||{};
  function persistReceipts(){updateTarget();draftStorage.write('chain-receipts',receipts);root.dispatchEvent(new Event('sixchange'))}
  executionState=ensureSixExecutionState(executionState);videoRefs=Array.isArray(videoRefs)?videoRefs:[];
  root.innerHTML='<section class="h3-six h3-six-t003"><header class="six-header"><h2>H3 六段导演台</h2><label>项目 <input class="six-project" aria-label="存档项目" maxlength="64"></label><span class="six-merge-badge">合并：等待 0/6 段</span></header><div class="six-config-one"><label>提示词助手模型 <select class="six-model" aria-label="六段导演模型"></select></label><button class="six-model-start" title="由现有模型管理器预热">预热模型</button><small class="six-model-label"></small></div><div class="six-common six-config-two"><label>连续 <select class="six-continuous" aria-label="连续生成"><option value="off">关</option><option value="on">开</option></select></label><label>起始段 <select class="six-start" aria-label="起始段"><option value="0">S1</option><option value="1">S2</option><option value="2">S3</option><option value="3">S4</option><option value="4">S5</option><option value="5">S6</option></select></label><label>起始方式 <select class="six-inheritance" aria-label="起始方式"><option value="resume">接上一段</option><option value="independent">独立开始</option></select></label><label class="six-preload-label" title="连续生成时，先一次编好后面各段的提示词，每段不用再重新装载文本编码器，整条约快一成。画面不变。开着长歌时不生效（每段音频要等上一段生成完才能确定）。"><input type="checkbox" class="six-preload" aria-label="预载六段提示词"> 预载六段提示词</label><label class="six-seam-lead-label" title="续接的段落开头先保持上一段的机位、人物和光线，再慢慢变化，防止段与段之间突然跳镜头。不改卡片里的原文。"><input type="checkbox" class="six-seam-lead" aria-label="接缝连续引导"> 接缝连续引导</label></div><div class="six-story"><label>剧情要求<textarea class="six-input six-goal" aria-label="六段剧情要求" placeholder="设计六段连续剧情"></textarea></label><button class="six-generate">生成六段剧情</button><label>全局设定 / Picture 与 Audio 职责<textarea class="six-input six-settings" aria-label="六段全局设定"></textarea></label></div><small class="six-cloud-warning" role="status" hidden>将把提示词与参考发送到外部服务</small><div class="six-status" role="status"></div><div class="six-prompts"></div><footer class="six-footer"><div class="six-footer-actions"><button class="six-run-all">▶ 连续生成六段</button><span>从所选段开始，接续上一段；成功后提交下一段，失败即停。需要时手动合并当前视频。</span><a class="six-latest-output" target="_blank" rel="noopener">最新输出：暂无</a><button class="six-stop" disabled hidden>停止连续生成</button><button class="six-memory-confirm" disabled>确认剧情记忆</button></div><div class="six-merge-host"></div></footer></section>';
  const style=document.createElement('style');style.textContent='.h3-six .six-video-wrap{display:flex;flex-direction:column;flex:1;min-height:54px;min-width:0;margin-top:4px;overflow:hidden}.h3-six .six-video{width:100%;height:100%;min-height:44px;flex:1;object-fit:contain;background:#080c12;border-radius:6px}.h3-six .six-video-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.h3-six .six-prompt{flex:1;min-height:44px}.h3-six .six-prompts{min-height:0}';root.append(style);
  const parameterStyle=document.createElement('style');parameterStyle.textContent='.h3-six .six-segment-parameters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:6px 0}.h3-six .six-segment-parameters label{font-size:11px;line-height:1.35}.h3-six .six-segment-parameters input{box-sizing:border-box;width:100%;min-width:0;background:#10151d;color:#fff;border:1px solid #527281;border-radius:4px;padding:3px}.h3-six .six-segment-parameters input::-webkit-inner-spin-button{margin:0}';root.append(parameterStyle);
  const find=s=>root.querySelector(s),settings=find('.six-settings'),goal=find('.six-goal'),model=find('.six-model'),message=find('.six-status'),cloudWarning=find('.six-cloud-warning');
  const storyRow=find('.six-story');if(storyRow&&goal&&settings)storyRow.append(goal.closest('label'),settings.closest('label'),find('.six-generate'));
  let group=null,busy=false,selected=-1,stopping=false,inBatch=false,activeOperations=0,directorBusy=true,backendBusy=false,taskReady=false;
  const activeSegments=new Set();let queuedPromptIds=new Set(),queuedSegments=new Set(),beforeRunHook=null;
  const chain={state:'IDLE',currentSegment:null,pendingPromptId:null,trace:[]};
  function chainEvent(type,detail={}){const event={type,at:Date.now(),...detail};if(['FAILED','STOPPED','COMPLETE','STOP_REQUESTED','RECOVERY_REQUIRED'].includes(type))chain.state=type;chain.trace.push(event);root.dispatchEvent(new CustomEvent('sixchain',{detail:event}));globalThis.dispatchEvent?.(new CustomEvent('h3-sixchain-state',{detail:event}))}
  const localSegmentSettings=savedState?[]:(draftStorage.read('segment-settings')||[]);
  const continuous=find('.six-continuous'),start=find('.six-start'),inheritance=find('.six-inheritance'),project=find('.six-project'),preload=find('.six-preload'),seamLeadBox=find('.six-seam-lead');
  continuous.value='on';start.value=String(executionState.start_index||0);inheritance.value='resume';project.value=executionState.project_id||'H3_SIX_V288';preload.checked=executionState.prompt_preload===true;preload.addEventListener('change',()=>executionChanged());seamLeadBox.checked=executionState.seam_lead===true;seamLeadBox.addEventListener('change',()=>executionChanged());
  let runtimeBinding=executionState.runtime_project_id?{logical:project.value.trim(),physical:executionState.runtime_project_id}:null;
  const runtimeProject=()=>runtimeBinding?.logical===project.value.trim()?runtimeBinding.physical:project.value.trim();
  function setRuntimeProject(value){if(!/^[\p{L}\p{N}_-]{1,64}$/u.test(value))throw Error('无效的内部链版本');runtimeBinding={logical:project.value.trim(),physical:value};confirmedTarget=value;executionChanged()}
  const segmentSettingsAt=index=>{
    const card=cards[index]?.card;if(!card)return savedState?.segment_settings?.[index]||{};
    const read=selector=>{const value=card.querySelector(selector)?.value?.trim();return value===''||value===undefined?null:Number(value)};
    return {width:read('.six-segment-width'),height:read('.six-segment-height'),length:read('.six-segment-length')};
  };
  // A074: a dedicated target label survives progress/status updates.
  const targetLabel=document.createElement('span');targetLabel.className='six-target';targetLabel.setAttribute('role','status');targetLabel.style.cssText='font-size:12px;overflow-wrap:anywhere;min-width:0;flex:1 1 0';project.closest('label').after(targetLabel);
  function updateTarget(){
    const projectId=project.value.trim(),accepted=[...new Set(Object.values(receipts).filter(r=>r?.status==='ACCEPTED'&&r.project_id).map(r=>r.project_id))];
    const mismatch=accepted.length>0&&!accepted.includes(runtimeProject());
    const text=`写入：${projectId||'未指定'}`+(mismatch?'（与已有成片的链版本不同）':'');
    if(targetLabel.textContent!==text)targetLabel.textContent=text;
    targetLabel.title=text;targetLabel.style.color=mismatch?'#f3c979':'';targetLabel.dataset.state=mismatch?'warning':'normal';
  }
  for(const element of [project,continuous,inheritance])for(const event of ['change','input'])element.addEventListener(event,updateTarget);
  for(const el of [continuous,inheritance])el.closest('label').style.display='none';
  const liveSegment=document.createElement('span');liveSegment.className='six-current-segment';liveSegment.setAttribute('role','status');liveSegment.textContent='当前执行：无';start.closest('label').after(liveSegment);
  updateTarget();
  const executionOptions=(index,first=index)=>({seam_lead:seamLeadBox.checked,continuous:true,project_id:runtimeProject(),independent:false,start_index:0,start_mode:'resume',segment_settings:segmentSettingsAt(index),segment_settings_all:cards.map((_,i)=>segmentSettingsAt(i))});
  const executionSnapshot=()=>({continuous:continuous.value==='on',start_index:Number(start.value),start_mode:inheritance.value,project_id:project.value,runtime_project_id:runtimeProject(),prompt_preload:preload.checked,seam_lead:seamLeadBox.checked});
  function executionChanged(){updateTarget();root.dispatchEvent(new Event('sixchange'));find('.six-run-all').textContent='▶ 连续生成六段';};
  for(const element of [continuous,start,inheritance,project])element.addEventListener('change',executionChanged);
  project.addEventListener('input',()=>root.dispatchEvent(new Event('sixchange')));executionChanged();
  async function request(path,data){const url=base+path.replace('/director/', '/api/h3-director/');let r;try{r=await fetch(url,{signal:AbortSignal.timeout(10000),method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)})}catch(error){throw Error(`六段请求连接失败：${url}｜${(error&&error.message)||error}`)}const value=await readJsonResponse(r,url,{empty404AsObject:true,label:'六段请求 '});if(!r.ok)throw Error((value&&value.error)||`请求失败 ${url}｜HTTP ${r.status} ${r.statusText}`);return value}
  function runBlockReason(i){
    const running=k=>activeSegments.has(k)||queuedSegments.has(k)||(inBatch&&chain.currentSegment===k+1)||queuedPromptIds.has(receipts[k]?.prompt_id);
    if(running(i))return `S${i+1} 生成或排队中，完成后可重跑`;
    if(i>0&&running(i-1))return `S${i} 生成或排队中，完成后才能承接`;
    return '';
  }
  function controls(){
    if(!inBatch){const active=[...new Set([...activeSegments,...queuedSegments])].sort((a,b)=>a-b);liveSegment.textContent=active.length?'当前任务：'+active.map(i=>'S'+(i+1)).join('、'):'当前任务：无';}
    root.querySelectorAll('textarea,input,select,.six-use').forEach(e=>e.disabled=false);
    // The execute button stays clickable on purpose: a disabled button fires no
    // event at all in Chrome, so a stale selection after refresh looked like a
    // dead button. runSegment's "请先使用本段" guard is the authoritative gate;
    // the dimmed style plus tooltip only hint at it.
    cards.forEach((c,i)=>{const reason=runBlockReason(i);c.run.disabled=!!reason;c.run.title=reason||'保留旧视频并重新生成本段';});
    find('.six-model-start').disabled=backendBusy||model.dataset.cloud==='true';
    find('.six-generate').disabled=directorBusy||!taskReady;find('.six-run-all').disabled=inBatch||busy;
    find('.six-stop').disabled=!inBatch;find('.six-memory-confirm').disabled=directorBusy||!group;
  }
  function select(index,opts){const auto=opts?.auto===true;selected=index;cards.forEach((c,i)=>{c.card.classList.toggle('six-selected',i===index);c.use.setAttribute('aria-pressed',String(i===index))});controls();root.dispatchEvent(new CustomEvent('sixsegmentselect',{detail:{index,auto}}));if(!inBatch){message.textContent=`已使用第${index+1}段；其他段与本次执行隔离`;delete message.dataset.state}}
  function persist(){root.dispatchEvent(new Event('sixchange'));draftStorage.write('texts',cards.map(c=>c.area.value));draftStorage.write('segment-settings',cards.map((_,i)=>segmentSettingsAt(i)))}
  const cards=Array.from({length:6},(_,i)=>{
    const card=document.createElement('section');card.className='six-card';card.innerHTML=`<h3>第${i+1}段</h3><small class="six-card-status">未生成</small><textarea class="six-prompt" aria-label="第${i+1}段提示词" placeholder="写出本段画面、主体动作与镜头变化…" spellcheck="false"></textarea><div class="six-segment-parameters"><label>宽（留空沿用画布）<input class="six-segment-width" type="number" min="32" max="16384" step="32" aria-label="第${i+1}段宽"></label><label>高（留空沿用画布）<input class="six-segment-height" type="number" min="32" max="16384" step="32" aria-label="第${i+1}段高"></label><label>帧数/时长（17k+5；依画布FPS）<input class="six-segment-length" type="number" min="5" max="3600" step="17" placeholder="留空沿用画布" aria-label="第${i+1}段帧数/时长"></label></div><div class="six-actions"><button class="six-use" aria-pressed="false">使用</button><button class="six-execute">执行</button></div><small class="six-count">本次会话执行：0次</small>`;find('.six-prompts').append(card);
    const frameHint=document.createElement('small');frameHint.style.gridColumn='1 / -1';frameHint.textContent='普通续接段实际新增 = 设定帧数 − 39；新起点和重置画面段不裁减。';card.querySelector('.six-segment-parameters').append(frameHint);
    const savedParameters=savedState?.segment_settings?.[i]??localSegmentSettings[i]??{};
    for(const [key,selector] of [['width','.six-segment-width'],['height','.six-segment-height'],['length','.six-segment-length']])card.querySelector(selector).value=savedParameters[key]??'';
    const wrap=document.createElement('div');wrap.className='six-video-wrap';wrap.innerHTML=`<video class="six-video" preload="metadata" controls playsinline aria-label="第${i+1}段视频" hidden></video><small class="six-video-label">暂无本段视频</small>`;card.querySelector('.six-prompt').before(wrap);
    const video=wrap.querySelector('video'),videoLabel=wrap.querySelector('small');
    video.addEventListener('play',()=>cards.forEach(c=>{if(c.video!==video)c.video.pause()}));
    video.addEventListener('loadedmetadata',()=>{videoLabel.textContent=video.dataset.filename||''});
    video.addEventListener('error',()=>{videoLabel.textContent='本段视频文件丢失';status.textContent='视频文件丢失'});
    const area=card.querySelector('textarea'),status=card.querySelector('.six-card-status'),use=card.querySelector('.six-use'),run=card.querySelector('.six-execute');
    card.addEventListener('click',event=>{if(!event.target.closest('.six-execute,button,input,select,video,summary'))select(i)});
    card.querySelectorAll('.six-segment-parameters input').forEach(input=>{input.addEventListener('input',()=>{status.textContent='本段参数已修改';persist()});input.addEventListener('change',persist)});
    let timer=null,save=Promise.resolve(),count=0;
    function saveEdit(){if(!group)return save;const payload={group_id:group.id,segment_index:i,english_prompt:area.value};save=save.catch(()=>{}).then(()=>request('/director/groups/save',payload)).then(result=>{root.dispatchEvent(new CustomEvent('sixpromptserversave',{detail:{segment_index:i,english_prompt:payload.english_prompt,ok:true}}));return result}).catch(error=>{message.textContent='服务保存失败，修改仍保留在本页：'+error.message;root.dispatchEvent(new CustomEvent('sixpromptserversave',{detail:{segment_index:i,english_prompt:payload.english_prompt,ok:false,error:error.message}}))});return save}
    area.oninput=()=>{status.textContent='已修改';persist();rememberRecoveryDraft();clearTimeout(timer);timer=setTimeout(saveEdit,600)};
    use.onclick=()=>select(i);
    run.onclick=()=>{void runActive(i).catch(()=>{});};
    /* A071：accepted 时 .six-count 可能随 extra 被总控台检视栏搬走（ park 未归还），
       每次现场 querySelector 会拿到 null 并炸出「提示执行失败」弹窗。改为创建时缓存引用：
       DOM 搬移不销毁元素，引用始终有效，检视抽屉内计数也持续更新。 */
    const countEl=card.querySelector('.six-count');
    return {card,area,status,use,run,video,videoLabel,videoRef:null,accepted:()=>{count++;if(countEl)countEl.textContent=`本次会话执行：${count}次`}};
  });
  // Each controller owns only its card. Workflow state and immutable attempt state
  // are separate: a recovery never replaces an explicitly saved/edited draft.
  const guideStyle=document.createElement('style');guideStyle.textContent='.h3-six .six-card{overflow:auto}.h3-six .six-guide{flex:none}.h3-six .six-guide input[type=number]{width:85px;background:#10151d;color:#fff;border:1px solid #527281}.h3-six .six-guide select{max-width:100%;padding:4px}.h3-six .six-guide button{padding:4px 8px}';root.append(guideStyle);
  const executeHintStyle=document.createElement('style');executeHintStyle.textContent='.h3-six .six-execute{display:none!important}.h3-six .six-execute.six-needs-select{opacity:.55}.h3-six .six-execute.six-needs-select:hover{opacity:.85}';root.append(executeHintStyle);
  const guideControls=cards.map((card,index)=>{
    let pristine=!Array.isArray(guideConfigs)||guideConfigs[index]==null;
    let config={enabled:false,source:'',source_sha256:'',mode:'from_end',value:88,...structuredClone(guideConfigs?.[index]||{})};
    let sequence=0,uploadSequence=0,timer;
    const box=document.createElement('section');box.className='six-guide';box.dataset.segment=String(index);
    box.style.cssText='border:1px solid #527281;border-radius:6px;padding:6px;margin:6px 0';
    box.innerHTML=`<label><input class="six-guide-enabled" type="checkbox" aria-label="第${index+1}段本段关键帧"> 本段关键帧</label><details class="six-guide-details"><summary>图片与插入位置</summary><button class="six-guide-upload" type="button">上传图片</button><input class="six-guide-file" type="file" accept="image/*" hidden><img class="six-guide-thumb" alt="第${index+1}段关键帧缩略图" hidden style="width:72px;height:54px;object-fit:contain"><small class="six-guide-source"></small><label>插入位置 <select class="six-guide-mode" aria-label="第${index+1}段关键帧位置类型"><option value="frame">第N帧（可见索引从0计）</option><option value="from_end">倒数第N帧（从1计）</option><option value="seconds">第N秒（本段可见时间）</option></select></label><input class="six-guide-value" type="number" min="0" step="1" aria-label="第${index+1}段关键帧位置"><button class="six-guide-clear" type="button">清除本段关键帧</button></details><small class="six-guide-compiled"></small>`;
    card.card.querySelector('.six-actions').before(box);
    const find=s=>box.querySelector(s),enabled=find('.six-guide-enabled'),mode=find('.six-guide-mode'),value=find('.six-guide-value'),thumb=find('.six-guide-thumb'),label=find('.six-guide-compiled');
    function draw(){enabled.checked=config.enabled===true;mode.value=config.mode;value.value=config.value;value.step=config.mode==='seconds'?'0.001':'1';value.min=config.mode==='from_end'?'1':'0';find('.six-guide-source').textContent=config.source||'未上传图片';thumb.hidden=!config.source;if(config.source&&guideTools.mediaURL)thumb.src=guideTools.mediaURL(config.source);if(!config.enabled)label.textContent='关键帧：关闭；本段不新增用户Guide';}
    async function preview(){const own=++sequence,current=structuredClone(config);if(!current.enabled){draw();return}if(!current.source){label.textContent='请上传本段图片；不会提交生成';return}label.textContent='CPU计算实际帧号…';try{const result=await guideTools.preview?.(index,current);if(own!==sequence||!result)return;config.source_sha256=result.source_sha256;label.textContent=`实际编译：可见索引${result.visible_frame} → 模型索引${result.model_frame}｜生成${result.frames}帧，保护区${result.protected_frames}帧`;root.dispatchEvent(new Event('sixchange'));}catch(error){if(own===sequence)label.textContent='关键帧校验：'+error.message}}
    function edited(){if(card.videoRef)card.status.textContent='关键帧已修改（旧视频保留，需重新生成）'}
    function changed(){pristine=false;config={...config,enabled:enabled.checked,mode:mode.value,value:value.value};sequence++;draw();edited();root.dispatchEvent(new Event('sixchange'));clearTimeout(timer);timer=setTimeout(preview,200)}
    enabled.onchange=()=>{find('details').open=enabled.checked;changed()};mode.onchange=changed;value.oninput=changed;
    find('.six-guide-upload').onclick=()=>find('.six-guide-file').click();
    find('.six-guide-file').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;const own=++uploadSequence;label.textContent='上传本段关键帧…';try{if(!guideTools.upload)throw Error('当前入口没有ComfyUI图片上传接口');const uploaded=await guideTools.upload(file);if(own!==uploadSequence)return;sequence++;config={...config,...uploaded,source_sha256:'',enabled:enabled.checked};pristine=false;draw();edited();root.dispatchEvent(new Event('sixchange'));await preview()}catch(error){if(own===uploadSequence)label.textContent=error.message}finally{event.target.value=''}};
    find('.six-guide-clear').onclick=()=>{sequence++;uploadSequence++;clearTimeout(timer);pristine=false;config={enabled:false,source:'',source_sha256:'',mode:'from_end',value:88};thumb.removeAttribute('src');draw();edited();root.dispatchEvent(new Event('sixchange'))};
    enabled.closest('label').hidden=true;find('.six-guide-upload').hidden=true;find('.six-guide-file').hidden=true;find('.six-guide-clear').hidden=true;thumb.hidden=true;
    const adapter={id:'segment-guide-'+index,widgets:[{name:'image',get value(){return config.source||'';},set value(v){config.source=v;},callback(){pristine=false;config.source_sha256='';}}]};
    const cell=materialCell({label:'本段关键画面',node:adapter,field:'image',kind:'image',getEnabled:()=>config.enabled===true,onState(ready,state,userAction){if(state==='loading'||ready&&!userAction)return;config.enabled=ready;enabled.checked=ready;edited();root.dispatchEvent(new Event('sixchange'));if(ready)preview();}});box.prepend(cell.row);const refreshCell=setInterval(()=>{if(!root.isConnected){clearInterval(refreshCell);return;}cell.refresh();},700);
    draw();if(config.enabled)queueMicrotask(preview);
    return {snapshot:()=>structuredClone(config),preview,restore:(saved,onlyPristine)=>{if(onlyPristine&&!pristine)return;sequence++;uploadSequence++;config={enabled:false,source:'',source_sha256:'',mode:'from_end',value:88,...structuredClone(saved)};pristine=false;draw();if(config.enabled)preview();root.dispatchEvent(new Event('sixchange'))}};
  });
  root.addEventListener('change',event=>{if(event.target.matches('.six-continuous,.six-start,.six-inheritance'))guideControls.forEach(c=>c.preview())});
  guideTools.watch?.(root,()=>guideControls.forEach(c=>c.preview()));
  function setSegmentVideo(index,ref){
    if(!Number.isInteger(index)||index<0||index>=6)throw Error('无效视频段号');
    if(!ref||typeof ref.filename!=='string'||!ref.filename||typeof ref.subfolder!=='string'||!['output','temp','input'].includes(ref.type)||typeof ref.prompt_id!=='string'||!ref.prompt_id)throw Error('视频引用缺少filename/subfolder/type/prompt_id');
    if(!mediaURL)throw Error('当前入口不支持ComfyUI媒体预览');
    const clean={filename:ref.filename,subfolder:ref.subfolder,type:ref.type,prompt_id:ref.prompt_id};
    const card=cards[index];card.video.pause();card.videoRef=clean;card.video.hidden=false;card.video.dataset.filename=clean.filename;card.videoLabel.textContent='加载视频：'+clean.filename;card.video.src=mediaURL(clean);card.video.load();root.dispatchEvent(new Event('sixchange'));
  }
  async function bindSegmentVideo(index,result,sequence){if(!resolveVideo)throw Error('没有视频结果解析器');const ref=await resolveVideo(index,result);if(sequence!==undefined&&cards[index].requestSequence!==sequence)return ref;setSegmentVideo(index,ref);return ref}
  let operationToast=null,operationToastTimer=null;
  function showOperationToast(error){
    const text=String(error||'操作失败');
    if(!operationToast){operationToast=document.createElement('div');operationToast.id='h3-six-operation-toast';operationToast.setAttribute('role','alert');operationToast.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483647;display:none;max-width:min(620px,calc(100vw - 36px));padding:12px 14px;border:1px solid #dc6472;border-radius:8px;background:#401e25;color:#ffe5e8;box-shadow:0 8px 28px #0009;font:14px/1.45 system-ui,"Microsoft YaHei",sans-serif';document.body.append(operationToast)}
    clearTimeout(operationToastTimer);operationToast.replaceChildren();
    const detail=document.createElement('div');detail.textContent=text;operationToast.append(detail);
    if(/前段没有完整.*SUCCESS.*回执/i.test(text)){
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;margin-top:10px';
      const addAction=(label,apply,notice)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='padding:5px 10px;border:1px solid #e89aa4;border-radius:5px;background:#5b2b34;color:#fff;cursor:pointer';button.onclick=()=>{apply();executionChanged();message.textContent=notice;delete message.dataset.state;operationToast.style.display='none'};actions.append(button)};
      addAction('改为从 S1 开始',()=>{start.value='0'},'起始段已改为 S1；请再次点击连续生成');
      operationToast.append(actions);
    }
    operationToast.style.display='block';operationToastTimer=setTimeout(()=>{if(operationToast)operationToast.style.display='none'},6000);
  }
  for(let i=0;i<6;i++)if(videoRefs[i]){try{setSegmentVideo(i,videoRefs[i])}catch(error){cards[i].videoLabel.textContent=error.message}}
  async function operation(fn,rethrow=false){
    delete message.dataset.state;activeOperations++;busy=true;controls();
    try{return await fn()}catch(e){message.textContent=e.message;message.dataset.state='error';showOperationToast(e.message);if(rethrow)throw e}
    finally{activeOperations--;busy=activeOperations>0;if(!busy){if(!['FAILED','STOPPED','COMPLETE','RECOVERY_REQUIRED'].includes(chain.state)){chain.state='IDLE';chainEvent('IDLE')}chain.currentSegment=null;chain.pendingPromptId=null;}controls()}
  }
  async function archiveSegment(project_id,index){
    const r=await fetch(base+'/h3/six/archive-segment',{signal:AbortSignal.timeout(30000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id,segment_index:index})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(`第${index+1}段旧成功段归档失败，为保护已成功内容暂停：${d.error||r.status}`);return d;
  }
  async function saveForRun(index){
    const text=cards[index].area.value;
    if(!text.trim())throw Error(`第${index+1}段提示词为空`);
    if(group?.id){
      await request('/director/groups/save',{group_id:group.id,segment_index:index,english_prompt:text});
      root.dispatchEvent(new CustomEvent('sixpromptserversave',{detail:{segment_index:index,english_prompt:text,ok:true}}));
    }else{
      const texts=cards.map(c=>c.area.value);
      if(!draftStorage.write('texts',texts)||JSON.stringify(draftStorage.read('texts'))!==JSON.stringify(texts))throw Error('无法保存本机草稿，请先保存工作流再重跑');
      root.dispatchEvent(new CustomEvent('sixpromptdraftsave',{detail:{segment_index:index,english_prompt:text}}));
    }
    if(beforeRunHook)await beforeRunHook(index);
  }
  // A072：提交前显示写入目标；与已接受回执的项目不同时须用户确认，防止刷新后静默写入别的项目。
  let confirmedTarget=null;
  function confirmWriteTarget(projectId){
    updateTarget();
    const accepted=[...new Set(Object.values(receipts).filter(r=>r?.status==='ACCEPTED'&&r.project_id).map(r=>r.project_id))];
    message.textContent=`将写入：${project.value.trim()}`;message.dataset.state='';
    if(!accepted.length||accepted.includes(projectId)||confirmedTarget===projectId)return;
    if(!globalThis.confirm(`当前项目与已有成片的链版本不同。
确认写入当前项目「${project.value.trim()}」？`))throw Error('已取消切换链版本，未提交');
    confirmedTarget=projectId;
  }
  async function runSegment(index,text=cards[index].area.value,options=executionOptions(index)){
    if(!execute)throw Error('请从当前实例控制台的“六段提示词”入口打开本页');
    if(!text.trim())throw Error(`第${index+1}段Prompt为空`);
    if(text!==cards[index].area.value)throw Error(`第${index+1}段提示词与所选卡片不一致，未提交`);
    if(selected!==index&&!options.direct)throw Error('请先使用本段');
    confirmWriteTarget(options.project_id);
    const card=cards[index],sequence=card.requestSequence=(card.requestSequence||0)+1;let counted=false;
    try{
      let fingerprint=fingerprintSegment?await fingerprintSegment(index,text,options):null;
      const previous=receipts[index];let result=null;
      if(previous?.project_id===options.project_id&&['PREPARING','SUBMITTED','PENDING'].includes(previous.status)&&!previous.prompt_id)throw Error('本段已有身份未确认的尝试，请先核实任务状态');
      // 2026-11-01 user rule: 重新起画(独立开始/新链版本)只在“起始方式=独立开始”时生效；
      // 接上一段(默认)时第1段重跑一律原地取代(归档旧段)，不再自动 fork 新组。
      if(previous?.status!=='STALE'&&previous?.prompt_id&&previous.project_id===options.project_id&&previous.fingerprint!==fingerprint&&options.independent===true&&!canForkSegment()){
        // An explicit independent run owns new storage. Preserve every old
        // accepted segment rather than blocking normal editing or overwriting it.
        const isolated=options.project_id.slice(0,39)+'_EDIT_'+crypto.randomUUID().replaceAll('-','').slice(0,16);
        options={...options,project_id:isolated};setRuntimeProject(isolated);
        fingerprint=fingerprintSegment?await fingerprintSegment(index,text,options):null;
        message.textContent='独立开始：已创建新的链版本；项目名称和旧视频保留';
      }
      if(previous?.status!=='STALE'&&previous?.prompt_id&&previous.project_id===options.project_id&&previous.fingerprint!==fingerprint&&!canForkSegment()){
        // 2026-10-25 user-level fix: an edited segment that continues from accepted
        // predecessors must not be blocked. Predecessor latents live in this project,
        // so archive the old accepted latent/receipt (copy, never delete), then
        // regenerate this segment in place. SaveVideo always writes new files.
        const archived=await archiveSegment(options.project_id,index);
        chainEvent('SUPERSEDE_EDITED',{segment:index+1,old_prompt_id:previous.prompt_id,archive:archived.path||null});
        message.textContent=`第${index+1}段输入已修改：旧成功段已归档保留${archived.archived?'（'+archived.path+'）':''}，视频不覆盖；本段按新输入继续生成`;
      }
      if(previous?.status==='STALE'&&previous.project_id===options.project_id&&!canForkSegment()){
        await archiveSegment(options.project_id,index);
      }
      if(previous?.status!=='STALE'&&previous?.prompt_id&&previous.project_id===options.project_id&&previous.fingerprint===fingerprint&&recoverSegment){
        const recovered=await recoverSegment(previous,index,options);
        if(recovered.state==='ACCEPTED'){
          // 2026-10-25: the user already saw this take finish and asked again -> reroll
          // (视频抽卡). Archive the previous take (copy only); videos are never overwritten.
          const archived=await archiveSegment(options.project_id,index);
          const seedFixed=globalThis.app?.graph?.getNodeById?.(142)?.widgets?.[1]?.value==='fixed';
          chainEvent('REROLL',{segment:index+1,old_prompt_id:recovered.result?.prompt_id||previous.prompt_id,archive:archived.path||null});
          message.textContent=`第${index+1}段重新生成（抽卡）：上一版已归档保留${archived.archived?'（'+archived.path+'）':''}，旧视频不覆盖${seedFixed?'；固定种子跨进程也可能产生差异':''}`;
        }
        else if(recovered.state==='SUPERSEDED'){
          const archived=await archiveSegment(options.project_id,index);
          chainEvent('REROLL',{segment:index+1,old_prompt_id:recovered.result.prompt_id,archive:archived.path||null});
          message.textContent=`第${index+1}段旧本地回执已更新；当前成功段已归档，准备重新生成`;
        }
        else if(recovered.state==='FAILED')message.textContent=`第${index+1}段旧任务已确认失败（不在队列、无成功历史），按原输入安全重试`;
        else if(recovered.state!=='FAILED')throw Error('本段已有提交但结果尚未核实，保留断点；禁止重复提交');
      }
      if(!result){
        if(stopping&&inBatch)throw Error('用户已取消，未提交本段');
        receipts[index]={fingerprint,project_id:options.project_id,status:'PREPARING'};persistReceipts();
        result=await execute(text,index,(state,detail)=>{
          if(card.requestSequence===sequence){card.status.textContent=state;message.textContent=state;message.title=state;message.dataset.state=/失败|不可达|HTTP|未完成/.test(state)?'error':/原稿直通|降级|暂不可用|保留/.test(state)?'warning':'running';const promptState=document.querySelector('.h3-prompt-compile-status');if(promptState&&/编译|8210|原稿直通/.test(state)){promptState.textContent=state;promptState.dataset.state=message.dataset.state;const retry=document.querySelector('.h3-prompt-compile-button');if(retry)retry.textContent='重试编译检查';}}
          if(detail?.video_ready&&resolveVideo&&card.requestSequence===sequence)bindSegmentVideo(index,{prompt_id:detail.prompt_id},sequence).catch(error=>{if(card.requestSequence===sequence)card.videoLabel.textContent='视频已生成，播放器绑定失败：'+error.message});
          if((state==='执行中'||state==='已加入队列')&&!counted){counted=true;card.accepted();receipts[index]={...receipts[index],prompt_id:detail?.prompt_id,status:'SUBMITTED'};persistReceipts();if(inBatch&&chain.currentSegment===index+1&&card.requestSequence===sequence)chain.pendingPromptId=detail?.prompt_id||null;chainEvent('SUBMITTED',{segment:index+1,prompt_id:detail?.prompt_id})}
        },{...options,isCancelled:()=>stopping&&inBatch});
      }
      if(result.superseded||card.requestSequence!==sequence){chainEvent('HISTORICAL_SUCCESS',{segment:index+1,prompt_id:result.prompt_id});throw Error('执行版本已变化，旧任务成功不能推进当前六段')}
      if(result.binding?.project_id)setRuntimeProject(result.binding.project_id);
      receipts[index]={...receipts[index],project_id:result.binding?.project_id||options.project_id,status:'ACCEPTED',prompt_id:result.prompt_id,...(result.execution_version?{execution_version:result.execution_version,story_id:result.story_id,group_id:result.binding?.group_id}:{})};persistReceipts();
      for(let j=index+1;j<cards.length;j++)if(receipts[j]?.prompt_id){receipts[j]={...receipts[j],status:'STALE'};cards[j].status.textContent='前段已更新，需重跑';}persistReceipts();
      chainEvent('SUCCESS',{segment:index+1,prompt_id:result.prompt_id});if(inBatch&&chain.currentSegment===index+1)chain.pendingPromptId=null;card.status.textContent='本段SUCCESS且回执已接受';if(resolveVideo){try{if(result.video_ref)setSegmentVideo(index,result.video_ref);else await bindSegmentVideo(index,result)}catch(error){card.videoLabel.textContent='执行成功，视频绑定失败：'+error.message}}
      return result;
    }catch(error){if(receipts[index]?.status==='PREPARING'&&!receipts[index]?.prompt_id){receipts[index]={...receipts[index],status:'FAILED'};persistReceipts()}if(card.requestSequence===sequence)card.status.textContent=card.videoRef?'视频已保留；续接未通过':'本段执行失败';throw Error(`第${index+1}段阻断：${error.message}`)}
  }
  async function runActive(index){
    if(!Number.isInteger(index)||index<0||index>=cards.length)throw Error('无效的当前段号');
    const blocked=runBlockReason(index);if(blocked)throw Error(blocked);
    activeSegments.add(index);controls();
    select(index,{auto:true});
    try{return await operation(async()=>{
      await saveForRun(index);
      const cross=globalThis.app?.graph?._nodes?.find(n=>n.type==='H3SixDirectorState')?.properties?.h3_cross_group?.enabled===true;
      let options={...executionOptions(index,index),continuous:true,independent:false,start_mode:'resume',direct:true};
      if(!/^[\p{L}\p{N}_-]{1,64}$/u.test(options.project_id))throw Error('存档项目只能使用1～64位字母、数字、下划线或短横线');
      const local=receipts[index];
      if(index===0&&!cross&&!canForkSegment()){
        const url='/view?'+new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+options.project_id});
        let response;try{response=await fetch(base+url,{signal:AbortSignal.timeout(10000)})}catch(error){throw Error(`旧链回执请求连接失败：${url}｜${(error&&error.message)||error}；已阻止重跑`)}
        if(!response.ok&&response.status!==404)throw Error(`无法核对旧链，已阻止重跑：${url}｜HTTP ${response.status}`);
        const all=response.ok?await readJsonResponse(response,url,{empty404AsObject:true,label:'旧链回执读取 '}):{};
        if(all['0']?.status==='PENDING'||local&&['PREPARING','SUBMITTED'].includes(local.status)){
          if(!local?.prompt_id||!recoverSegment)throw Error('S1 旧任务状态尚未确认，不能重复提交');
          const recovered=await recoverSegment(local,0,options);
          if(recovered.state==='PENDING')throw Error('S1 旧任务仍在运行或排队');
        }
        if(options.independent&&(Object.keys(all).some(k=>/^\d+$/.test(k))||local?.prompt_id)){
          const isolated=options.project_id.slice(0,39)+'_EDIT_'+crypto.randomUUID().replaceAll('-','').slice(0,16);
          options={...options,project_id:isolated};setRuntimeProject(isolated);
        }
      }
      if(!canForkSegment()&&(!local?.prompt_id||local.project_id!==options.project_id)){
        const query=new URLSearchParams({filename:'six_acceptance.json',type:'output',subfolder:'h3_continuation/'+options.project_id});
        const receiptUrl=base+'/view?'+query;
        let response;try{response=await fetch(receiptUrl,{signal:AbortSignal.timeout(10000)})}catch(error){throw Error(`本段回执请求连接失败：${receiptUrl}｜${(error&&error.message)||error}；已阻止提交`)}
        if(!response.ok&&response.status!==404)throw Error(`无法核对本段已有回执，已阻止提交：${receiptUrl}｜HTTP ${response.status}`);
        const durable=response.ok?(await readJsonResponse(response,receiptUrl,{empty404AsObject:true,label:'本段回执读取 '}))[String(index)]:null;
        if(durable?.status==='PENDING')throw Error('本段已有未确认的提交，禁止重复提交');
        if(durable?.status==='SUCCESS'){
          if(!durable.prompt_id)throw Error('本段成功回执缺少任务身份，已阻止提交');
          if(options.independent){
            const isolated=options.project_id.slice(0,39)+'_EDIT_'+crypto.randomUUID().replaceAll('-','').slice(0,16);
            options={...options,project_id:isolated};setRuntimeProject(isolated);
          }else{
            const checkUrl=base+'/h3/six/store?'+new URLSearchParams({project_id:options.project_id,segment_index:String(index)});
            let check;try{check=await fetch(checkUrl,{signal:AbortSignal.timeout(10000)})}catch(error){throw Error(`存档核验请求连接失败：${checkUrl}｜${(error&&error.message)||error}；已阻止提交`)}
            const verified=await readJsonResponse(check,checkUrl,{empty404AsObject:true,label:'存档核验 '});
            if(!check.ok||verified.accepted!==true||verified.segment_index!==index)throw Error(`本段旧回执未通过存档核验，已阻止提交：${checkUrl}｜HTTP ${check.status}`);
            const archived=await archiveSegment(options.project_id,index);
            if(!archived.archived)throw Error('已有成功段未归档，已阻止提交');
            chainEvent('REROLL',{segment:index+1,old_prompt_id:durable.prompt_id,archive:archived.path||null});
          }
        }
      }
      return runSegment(index,cards[index].area.value,options);
    },true)}finally{activeSegments.delete(index);controls()}
  }
  function render(value){group=value;const edits=null;if(group){settings.value=group.global_settings;goal.value=group.goal}cards.forEach((c,i)=>{c.area.value=edits?.[i]??group?.segments[i].english_prompt??'';c.status.textContent=edits?.[i]!==undefined?'已修改':group?.segments[i].status??'未生成';c.card.classList.remove('six-selected');c.use.setAttribute('aria-pressed','false')});selected=-1;controls();root.dispatchEvent(new Event('sixchange'));message.textContent=group?'六段连续剧情草稿已就绪；可选一段执行，或连续执行六段':'可生成六段剧情，也可直接粘贴六段完整Prompt'}
  // Read-only observation; elapsed clocks never advance completion counters.
  const progressBox=document.createElement('section');progressBox.className='six-task-progress';
  progressBox.setAttribute('aria-live','polite');progressBox.style.cssText='border:1px solid #527281;border-radius:8px;padding:10px 14px;background:#101b27;white-space:pre-line';
  message.before(progressBox);
  let task=null,stream=null,polling=false,connection='连接中',clockOffset=0,appliedTask=null,submitting=false;
  let intent=draftStorage.read('task');
  const terminal=t=>t&&['COMPLETED','FAILED','INTERRUPTED'].includes(t.status);
  const elapsed=n=>{n=Math.max(0,Math.floor(n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
  function drawTask(){
    if(!task){progressBox.textContent=connection==='连接异常'||connection.includes('待核实')?connection+'；旧内容已保留，禁止重复提交':taskReady?'暂无本次任务；已有草稿不代表新任务成功':connection;return}
    const now=Date.now()/1000+clockOffset,end=task.ended_at||now;
    const labels={COMPLETED:'完成',FAILED:'失败',INTERRUPTED:'服务中断',RUNNING:now-task.last_event_at>20?'等待响应':'处理中'};
    const stage=task.stage_index==null?'任务已接收':task.stage_name;
    progressBox.textContent=`任务 ${task.task_id} · ${connection==='连接异常'?'连接异常，任务结果待核实':labels[task.status]}\n${stage} · 阶段 ${task.completed_stages}/8 · 剧情 ${task.completed_segments}/6 · 参考图 ${task.reference_count} 张\n总耗时 ${elapsed(end-task.started_at)} · 当前阶段耗时 ${elapsed(end-task.stage_started_at)}\n最近真实事件 ${new Date(task.last_event_at*1000).toLocaleTimeString()} · ${connection}\n`+
      (task.status==='RUNNING'?'旧内容已保留，本次正在生成。等待期间不能据此判断模型卡死。':task.error?`失败阶段：${stage}；${task.error}`:'本次服务端任务已完成；保留的手工编辑与保存画布内容优先。')+
      (task.error_diagnosis?'\n排查结论：'+task.error_diagnosis:'')+
      '\n'+task.stages.map((s,i)=>`${s.status==='COMPLETED'?'✓':s.status==='RUNNING'?'●':s.status==='FAILED'?'×':'○'} ${i+1}.${s.name}${s.skipped?'（无须视觉调用）':''}`).join('  ')+
      '\n连接心跳仅证明服务可达，不代表上游模型持续输出。';
    cards.forEach((c,i)=>{let label=c.card.querySelector('.six-task-segment');if(!label){label=document.createElement('small');label.className='six-task-segment';c.status.after(label)}label.textContent=`本次任务：${task.stages[i+2].status==='COMPLETED'?'导演稿已完成':task.stage_index===i+2?labels[task.status]:'尚未完成'}`});
  }
  async function backfillTask(){
    if(task?.status!=='COMPLETED'||appliedTask===task.task_id)return;
    if(!intent||intent.task_id!==task.task_id)return;
    const own=task.task_id,generated=await request('/director/groups/result/'+task.group_id);
    if(task?.task_id!==own)return;
    const before=intent?.task_id===own?intent.before:null;
    const protectedText=cards.map((c,i)=>{const value=c.area.value;const saved=savedState?.texts?.[i];return saved?.trim()&&(!before||saved!==before[i])?saved:value.trim()&&(!before||value!==before[i])?value:null});
    const previousSettings=settings.value,previousGoal=goal.value;
    const protectSettings=!!previousSettings.trim()&&(!intent||previousSettings!==intent.settings);
    const protectGoal=!!previousGoal.trim()&&(!intent||previousGoal!==intent.goal);
    render(generated);
    cards.forEach((c,i)=>{if(protectedText[i]!==null){c.area.value=protectedText[i];c.status.textContent='已保留手工修改/保存内容'} });
    if(protectSettings)settings.value=previousSettings;if(protectGoal)goal.value=previousGoal;
    appliedTask=own;persist();drawTask();
  }
  async function acceptTask(value){
    if(task&&value.task&&value.task.started_at<task.started_at)return;
    if(stream&&task?.task_id!==value.task?.task_id){stream.close();stream=null}
    if(value.server_time)clockOffset=value.server_time-Date.now()/1000;
    task=value.task;connection='服务连接正常';taskReady=true;
    directorBusy=submitting||!!task&&!terminal(task);controls();drawTask();
    await backfillTask();
    if(terminal(task)&&stream){stream.close();stream=null}
  }
  function subscribe(){
    if(stream||!task||terminal(task))return;
    stream=new EventSource(base+'/api/h3-director/groups/tasks/events?task_id='+task.task_id);
    stream.addEventListener('task',event=>{acceptTask(JSON.parse(event.data)).catch(()=>{connection='连接异常';drawTask()})});
    stream.addEventListener('heartbeat',()=>{connection='服务连接正常';drawTask()});
    stream.onerror=()=>{connection='连接异常';drawTask()};
  }
  async function syncTask(){
    if(polling||submitting)return;polling=true;
    try{
      const own=task?.task_id||intent?.task_id;
      if(!currentIdentity()||!own){taskReady=true;directorBusy=false;controls();drawTask();return}
      const value=await request('/director/groups/tasks'+(own?'/'+own:''));
      if(value.task&&value.task.task_id!==own)throw Error('工作流任务身份不匹配，拒绝自动恢复');
      if(!value.task&&intent?.task_id){connection='服务端未登记该任务，提交未成功；旧内容保留，可手动重新生成';intent=null;draftStorage.remove('task');task=null;taskReady=true;directorBusy=false;controls();progressBox.textContent=connection;return}
      await acceptTask(value);subscribe();
    }catch(error){connection='连接异常';directorBusy=true;controls();drawTask()}
    finally{polling=false}
  }
  function rememberRecoveryDraft(){
    recoveryEditedHere=true;
    const data={texts:cards.map(c=>c.area.value),editedAt:Date.now()},id=currentIdentity();
    if(id&&acceptedRecovery.has(id))acceptedRecovery.set(id,JSON.stringify(data.texts));
    if(draftStorage.write('recovery-draft',data))pendingRecovery=null;else pendingRecovery=data;
  }
  function showRecoveryPrompt(data,saved=null){
    const consoleNode=root.querySelector('.s2-console');
    if(!consoleNode||consoleNode.querySelector('.six-recovery-prompt'))return false;
    const banner=document.createElement('div');banner.className='six-recovery-prompt';banner.setAttribute('role','status');
    banner.style.cssText='position:absolute;z-index:80;top:4px;left:8px;right:8px;display:flex;align-items:center;gap:10px;padding:8px 10px;background:#3d3118;color:#fff;border:1px solid #e5b85d;border-radius:6px';
    const label=document.createElement('span');label.textContent=saved?'已自动保持上次编辑（尚未保存到工作流文件）':'检测到未保存的本机草稿：';
    const restore=document.createElement('button');restore.type='button';restore.textContent=saved?'知道了':'恢复';
    const discard=document.createElement('button');discard.type='button';discard.textContent=saved?'改回文件版本':'丢弃';
    if(saved){restore.onclick=()=>banner.remove();discard.onclick=()=>{const id=currentIdentity();if(id)acceptedRecovery.delete(id);draftStorage.remove('recovery-draft');banner.remove();saved.forEach((text,i)=>{cards[i].area.value=text;cards[i].area.dispatchEvent(new Event('input',{bubbles:true}))});root.dispatchEvent(new Event('sixrecoverydisplay'))};banner.append(label,restore,discard);consoleNode.append(banner);return true}
    restore.onclick=()=>{const id=currentIdentity();if(!id)return;acceptedRecovery.set(id,JSON.stringify(data.texts));banner.remove();data.texts.forEach((text,i)=>{cards[i].area.value=text;cards[i].area.dispatchEvent(new Event('input',{bubbles:true}))});root.dispatchEvent(new Event('sixrecoverydisplay'))};
    discard.onclick=()=>{const id=currentIdentity();if(id)acceptedRecovery.delete(id);draftStorage.remove('recovery-draft');banner.remove()};
    banner.append(label,restore,discard);consoleNode.append(banner);return true;
  }
  function pollScopedRecovery(){
    const id=currentIdentity();if(!id)return;
    if(id!==loadedIntentIdentity){loadedIntentIdentity=id;if(!task&&!intent){intent=draftStorage.read('task');if(intent)void syncTask()}}
    if(pendingRecovery){
      // Preserve an older recovery candidate rather than silently overwrite it.
      const existing=draftStorage.read('recovery-draft');
      if(!existing||JSON.stringify(existing.texts)===JSON.stringify(pendingRecovery.texts)){draftStorage.write('recovery-draft',pendingRecovery);pendingRecovery=null}
    }
    if(recoveryEditedHere||checkedRecoveryIdentity===id)return;
    if(recoveryChecking||typeof workflowSnapshot!=='function'||!root.querySelector('.s2-console'))return;
    const data=draftStorage.read('recovery-draft');
    if(!data||!Array.isArray(data.texts)||data.texts.length!==6||!data.texts.every(x=>typeof x==='string')){checkedRecoveryIdentity=id;return}
    recoveryChecking=true;
    Promise.resolve(workflowSnapshot()).then(context=>{
      if(!context||currentIdentity()!==id||recoveryEditedHere||!root.isConnected)return;
      const saved=Array.isArray(context.savedTexts)&&context.savedTexts.length===6?context.savedTexts:Array(6).fill('');
      if(JSON.stringify(data.texts)===JSON.stringify(saved)){checkedRecoveryIdentity=id;return}
      const mtime=Number(context.savedAt)||0;
      if(mtime&&Number(data.editedAt)<=mtime){checkedRecoveryIdentity=id;return}
      if(acceptedRecovery.get(id)===JSON.stringify(data.texts)){
        cards.forEach((c,i)=>{c.area.value=data.texts[i]});root.dispatchEvent(new Event('sixchange'));checkedRecoveryIdentity=id;return;
      }
      // A081（用户要求）：刷新/重开后自动保持最近一次编辑，不再先退回文件版本；
      // 提示条只提供「改回文件版本」，不阻塞、不需要先选择。
      acceptedRecovery.set(id,JSON.stringify(data.texts));
      data.texts.forEach((text,i)=>{cards[i].area.value=text;cards[i].area.dispatchEvent(new Event('input',{bubbles:true}))});
      root.dispatchEvent(new Event('sixchange'));root.dispatchEvent(new Event('sixrecoverydisplay'));
      if(showRecoveryPrompt(data,saved))checkedRecoveryIdentity=id;
    }).catch(()=>{}).finally(()=>{recoveryChecking=false});
  }
  const recoveryTimer=setInterval(()=>{if(!root.isConnected){clearInterval(recoveryTimer);return}pollScopedRecovery()},250);
  const observationTimer=setInterval(()=>{if(!root.isConnected){clearInterval(observationTimer);stream?.close();return}drawTask();syncTask()},3000);
  let runningLabel='状态未查询';
  function modelDisplay(){find('.six-model-label').textContent='当前选择：'+(model.selectedOptions[0]?.textContent||model.value)+'；当前后台：'+runningLabel}
  async function updateBackend(){const catalog=await request('/director/models');const selected=catalog.models.find(m=>m.model_key===model.value);model.dataset.cloud=String(selected?.provider==='openai_compat');cloudWarning.hidden=selected?.provider!=='openai_compat';controls();if(selected?.provider==='openai_compat'){runningLabel='云端 API（执行状态见任务进度）';modelDisplay();return}const status=await request('/director/status');runningLabel=status.running_model||status.error||'本地模型未启动';modelDisplay()}
  model.addEventListener('h3-model-display',()=>{updateBackend().catch(()=>{})});
  let preferenceSave=Promise.resolve();
  model.onchange=()=>{cloudWarning.hidden=model.dataset.cloud!=='true';updateBackend().catch(()=>{});const selected=model.value;preferenceSave=preferenceSave.catch(()=>{}).then(()=>request('/director/preferences',{selected_model:selected})).catch(e=>{message.textContent=e.message})};
  find('.six-generate').onclick=()=>{if(directorBusy||!taskReady)return;let submissionAttempted=false;directorBusy=true;submitting=true;controls();return operation(async()=>{try{
    const before=cards.map(c=>c.area.value),settingsBefore=settings.value,goalBefore=goal.value;
    message.textContent='旧内容已保留，本次正在生成。';
    const referenceImages=model.value==='grok43'&&collectReferences?await collectReferences(settingsBefore):[];
    intent={task_id:crypto.randomUUID().replaceAll('-',''),before,settings:settingsBefore,goal:goalBefore};
    task=null;
    draftStorage.write('task',intent);stream?.close();stream=null;appliedTask=null;savedState=null;
    submissionAttempted=true;
    await acceptTask(await request('/director/groups/tasks/start',{task_id:intent.task_id,global_settings:settingsBefore,delta:goalBefore,model_key:model.value,...(referenceImages.length?{reference_images:referenceImages}:{})}));
    if(task.task_id!==intent.task_id)throw Error('导演任务身份不匹配，拒绝绑定');
    subscribe();
  }catch(error){if(submissionAttempted){connection='连接异常';message.textContent='提交结果待核实，正在只读查询；不会自动重复生成：'+error.message}else{message.textContent='提交前校验失败，未发起生成：'+error.message}drawTask()}
  finally{submitting=false;directorBusy=!!intent&&!terminal(task);controls();syncTask()}})};
  find('.six-model-start').onclick=async()=>{
    if(backendBusy)return;backendBusy=true;controls();message.textContent='正在检查本地模型后台…';
    try{const result=await request('/director/model/warm',{model_key:model.value});message.textContent=result.message;await updateBackend()}
    catch(error){message.textContent='本地后台检查/唤醒失败：'+(error.message==='NOT_FOUND'?'导演接口尚未加载，请检查当前实例控制台':error.message)}
    finally{backendBusy=false;controls()}
  };
  async function startChain(){
    const first=Number(start.value);
    if(!Number.isInteger(first)||first<0||first>=cards.length)throw Error('请选择有效起始段');
    if(!cards[first].area.value.trim())throw Error(`第${first+1}段Prompt为空`);
    // This explicit batch action enables continuous mode; single-segment execution keeps its selected mode.
    if(!project.value.trim())project.value='H3_SIX_V288';
    if(!/^[\p{L}\p{N}_-]{1,64}$/u.test(project.value.trim()))throw Error('存档项目只能使用1～64位字母、数字、下划线或短横线');
    if(inBatch)return;stopping=false;inBatch=true;chain.state='RUNNING';chain.trace=[];chainEvent('START',{first:first+1});controls();
    const preloadChain=preload.checked?crypto.randomUUID():null;
    const retainResumePoint=index=>{start.value=String(index);inheritance.value='resume';executionChanged();};
    try{
      for(let i=first;i<6;i++){
        if(!cards[i].area.value.trim()){retainResumePoint(i);message.textContent=`第${i+1}段尚未填写，已保留前段结果`;return}
        if(stopping){retainResumePoint(i);chainEvent('STOPPED',{nextSegment:i+1});message.textContent='连续生成已停止；可从所选段继续';return}
        chain.currentSegment=i+1;chain.state='RUNNING';
        liveSegment.textContent=i===0?'当前执行：S1（重新起画）':`当前执行：S${i+1}（接 S${i} 尾部）`;
        message.textContent=`连续生成：正在执行第${i+1}/6段；上一段成功后自动推进`;select(i,{auto:true});
        find('.six-run-all').textContent=`连续生成中：第${i+1}/6段`;
        // Freeze only the segment about to submit; later edits remain live.
        // 预载六段提示词：每段提交前核对预载，只补编当前段起有改动的条件（见 h3_six_execute.preloadChainPrompts）。
        const preloadOptions=preloadChain?{chain_preload:{id:preloadChain,texts:cards.slice(i).map(c=>c.area.value)}}:{};
        try{await runSegment(i,cards[i].area.value,{...executionOptions(i,first),continuous:true,independent:false,start_mode:'resume',...preloadOptions})}
        catch(error){retainResumePoint(i);chainEvent(stopping?'STOPPED':'FAILED',{segment:i+1,error:error.message});throw error}
      }
      chainEvent('COMPLETE');message.textContent=`第${first+1}～6段已自动连续完成；剧情记忆未自动确认`;
    }finally{inBatch=false;chain.currentSegment=null;chain.pendingPromptId=null;liveSegment.textContent='当前执行：无';find('.six-run-all').textContent='▶ 连续生成六段';chainEvent('SETTLED')}
  }
  find('.six-run-all').onclick=()=>operation(startChain);
  find('.six-memory-confirm').onclick=()=>operation(async()=>{if(!group)throw Error('请先生成一组六段草稿');await request('/director/groups/confirm',{group_id:group.id,prompts:cards.map(c=>c.area.value)});group.status='ACCEPTED';message.textContent='本组六段已手工确认；可输入“继续六段”生成下一组，不会提交视频'});
  function requestStop(){if(!inBatch)return false;stopping=true;chain.state='STOP_REQUESTED';chainEvent('STOP_REQUESTED');message.textContent='当前段完成后停止；不会提交下一段';controls();return true}
  find('.six-stop').onclick=requestStop;find('.six-stop').hidden=true;
  try{const catalog=await request('/director/models');const models=[...catalog.models].sort((a,b)=>Number(a.provider==='openai_compat')-Number(b.provider==='openai_compat'));for(const item of models){const option=document.createElement('option');option.value=item.model_key;option.textContent=item.provider==='openai_compat'?'云端·会上传｜'+item.model_label:item.model_label;model.append(option)}const prefs=await request('/director/preferences');model.value=savedState?.model||prefs.selected_model||catalog.default_model;cloudWarning.hidden=model.dataset.cloud!=='true';modelDisplay();await updateBackend();cloudWarning.hidden=model.dataset.cloud!=='true';render(null);controls()}catch(e){message.textContent=e.message}
  if(savedState){settings.value=savedState.settings||'';goal.value=savedState.goal||'';if(savedState.model)model.value=savedState.model;cards.forEach((c,i)=>{c.area.value=savedState.texts?.[i]??''});await updateBackend()}
  await syncTask();
  if(storyId){const layout=document.createElement('style');layout.textContent='.h3-prebake-six .six-prompts{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))}';root.classList.add('h3-prebake-six');root.append(layout)}

  const taskDetails=document.createElement('div');taskDetails.className='six-task-details';taskDetails.id='six-task-details';taskDetails.setAttribute('popover','auto');taskDetails.append(progressBox);find('.six-run-all').after(message);find('.six-header').append(taskDetails);const taskButton=document.createElement('button');taskButton.type='button';taskButton.textContent='任务详情';taskButton.setAttribute('popovertarget',taskDetails.id);taskButton.style.anchorName='--h3-six-task-details-trigger';taskDetails.style.positionAnchor='--h3-six-task-details-trigger';anchorPopoverAtButton(taskDetails,taskButton);const footerTools=document.createElement('div');footerTools.className='six-footer-tools';footerTools.style.cssText='display:flex;gap:5px';footerTools.append(find('.six-memory-confirm'),taskButton);find('.six-footer-actions').append(footerTools);
  const sheet=document.createElement('style');sheet.textContent=SIX_T003_CSS+'\n.h3-six.h3-six-t003{padding:4px;gap:2px;height:930px;max-height:930px}.h3-six-t003 .six-header{height:30px;min-height:30px;padding:1px 4px}.h3-six-t003 .six-header h2{font-size:16px}.h3-six-t003 .six-header button{font-size:10px;padding:2px}.h3-six-t003 .six-config-one,.h3-six-t003 .six-config-two{min-height:32px}.h3-six-t003 .six-story{height:32px;grid-template-columns:minmax(0,1fr) auto minmax(0,.7fr)}.h3-six-t003 .six-story>label{flex-direction:row;align-items:center;font-size:10px}.h3-six-t003 textarea.six-input{height:32px;min-height:32px}.h3-six-t003 .six-story button{height:32px}.h3-six-t003 .six-prompts{grid-template-rows:repeat(2,310px);gap:5px}.h3-six-t003 .six-card{padding:2px;gap:0}.h3-six-t003 .six-card-head{min-height:16px;height:16px}.h3-six-t003 .six-card-head h3{font-size:13px}.h3-six-t003 .six-video-wrap{width:100%;aspect-ratio:16/9;flex:none}.h3-six-t003 textarea.six-prompt{min-height:80px;height:80px;flex:1;font:13px/1.45 system-ui;padding:6px}.h3-six-t003 .six-card-foot{height:32px;min-height:32px}.h3-six-t003 .six-card-foot button{font-size:10px;padding:2px}.h3-six-t003 .six-footer{min-height:160px;height:160px;max-height:160px;flex:1}.h3-six-t003 .six-task-details{background:#202936;color:#edf2f7;border:1px solid #52657a;border-radius:7px;padding:12px;max-width:800px}.h3-six-t003 [popover]:not(:popover-open){display:none!important}.h3-six-t003 .six-merged-preview video[hidden]{display:none!important}.h3-six-t003 .h3-native-merge-controls strong,.h3-six-t003 .h3-native-merge-controls>label{display:none}.h3-six-t003 .six-merged-preview>span{display:block}.h3-six-t003 .six-merged-preview>a{font-size:10px}.h3-six-t003 .six-card-head .six-card-status{line-height:13px;padding:0 3px}.h3-six-t003 .six-model-label{max-width:130px}.h3-six-t003 .six-model-start{white-space:nowrap}\n';sheet.textContent+='.h3-six-t003 .six-merged-preview{position:relative;height:145px}.h3-six-t003 .six-merged-preview>span{position:absolute;inset:35% 0 auto;text-align:center;font-size:11px;pointer-events:none}.h3-six-t003 .six-merged-preview:has(video[src])>span{display:none}.h3-six-t003 .six-merged-preview>a{position:absolute;right:0;top:0;background:#111b;color:#9dc8ff;z-index:1}.h3-six-t003 .h3-native-merge-controls>span{margin-left:0!important;display:block;height:14px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.h3-six-t003 .six-footer{padding-top:2px}.h3-six-t003 .six-card-head .six-card-status{font-size:10px}';sheet.textContent+='[data-h3-rebase]{display:none!important}.h3-six-t003 .six-header>label{white-space:nowrap}.h3-six-t003 .six-card-status[data-state=done]{background:#204332;color:#80dfac}.h3-six-t003 .six-card-status[data-state=failed]{background:#512b32;color:#ffa8b5}.h3-six-t003 .six-card-status[data-state=waiting]{background:#31343a;color:#b5bdc9}.h3-six-t003 .six-config-two label{font-size:10px}.h3-six-t003 .six-config-two .six-inheritance{max-width:90px}.h3-six-t003 .six-config-two .cross-source{max-width:90px}.h3-six-t003 .six-config-two .song-source{max-width:110px}.h3-six-t003 .six-config-two .song-start{max-width:55px}';root.append(sheet);
  const visibleStatusStyle=document.createElement('style');visibleStatusStyle.textContent='.h3-six-t003 .six-footer-actions>.six-status{display:block;width:100%;max-width:none;max-height:40px;min-height:18px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;color:#b5bdc9;background:transparent;padding:2px 0;line-height:1.35}.h3-six-t003 .six-footer-actions>.six-status[data-state=error]{color:#ffdce0;background:#682e38;border:1px solid #dc6472;border-radius:4px;padding:3px 5px}.h3-six-t003 .six-footer-actions>.six-status[data-state=warning]{color:#ffdfa2}';root.append(visibleStatusStyle);
  root.style.overflow='visible';root.style.padding='0';
  cards.forEach((c,i)=>{
   const head=document.createElement('div');head.className='six-card-head';c.card.prepend(head);const time=document.createElement('span');time.className='six-time';head.append(c.card.querySelector('h3'),time,c.status);c.card.querySelector('h3').textContent='S'+(i+1);
   const progress=document.createElement('progress');progress.className='six-progress';progress.max=100;progress.value=0;progress.hidden=true;c.status.after(progress);c.progress=progress;
   const foot=document.createElement('div');foot.className='six-card-foot';const hint=document.createElement('small');hint.className='six-inherit-hint';foot.append(hint,c.use,c.run);c.card.append(foot);c.run.textContent='重抽这段';c.use.textContent='编辑';
   const extra=document.createElement('div');extra.className='six-card-options';extra.id='six-card-options-'+i;extra.setAttribute('popover','auto');
   const options=document.createElement('button');options.textContent='本段设置';options.type='button';options.setAttribute('popovertarget',extra.id);options.style.anchorName=`--h3-six-card-settings-${i}`;extra.style.positionAnchor=`--h3-six-card-settings-${i}`;anchorPopoverAtButton(extra,options);foot.insertBefore(options,c.run);
   for(const el of [...c.card.querySelectorAll('.six-segment-parameters,.six-guide,.six-actions,.six-count')])extra.append(el);extra.append(c.use);c.card.append(extra);
   const stateObserver=new MutationObserver(()=>{c.status.title=c.status.textContent;c.status.dataset.state=/失败|丢失/.test(c.status.textContent)?'failed':/SUCCESS|已完成|已恢复/.test(c.status.textContent)?'done':/执行中|生成中|队列/.test(c.status.textContent)?'running':'waiting';controls();progress.hidden=!/执行中|生成中|队列/.test(c.status.textContent);});stateObserver.observe(c.status,{childList:true,characterData:true,subtree:true});
  });
  const arrange=()=>{
   const settingsRow=find('.six-config-two'),footer=find('.six-merge-host');
   for(const selector of ['.h3-cross-group','.h3-long-song']){const el=find(selector);if(el&&el.parentElement!==settingsRow)settingsRow.append(el);if(el?.classList.contains('h3-long-song')){for(const selector of ['.song-mode','.song-upload','.song-lyric-start']){const field=el.querySelector(selector);if(field){const target=field.parentElement?.tagName==='LABEL'?field.parentElement:field;settingsRow.append(target);target.hidden=false;field.hidden=false;}}}}
   const merge=find('.h3-native-merge-controls');if(merge&&merge.parentElement!==footer)footer.append(merge);
   cards.forEach((c,i)=>{const prebake=c.card.querySelector('.six-prebake-state');if(prebake&&prebake.textContent!=='预烘焙'){prebake.title=prebake.textContent;prebake.textContent='预烘焙';}if(prebake&&prebake.parentElement!==c.card.querySelector('.six-card-foot'))c.card.querySelector('.six-card-foot').prepend(prebake);const preview=c.card.querySelector('.h3-compiler-preview');if(preview&&preview.parentElement!==c.card.querySelector('.six-card-options'))c.card.querySelector('.six-card-options').append(preview);});
  };
  for(const popup of root.querySelectorAll('[popover]')){const close=document.createElement('button');close.type='button';close.className='h3-popover-close';close.textContent='关闭设置';close.onclick=event=>{event.preventDefault();event.stopPropagation();popup.hidePopover();};popup.prepend(close);}
  const promptUX=document.createElement('style');promptUX.textContent='.h3-six-t003 textarea.six-prompt{font-size:14px!important;line-height:1.55!important;padding:8px!important;background:#171d25!important;border:1px solid #536276!important;border-radius:6px!important;letter-spacing:.01em}.h3-six-t003 textarea.six-prompt:focus{border-color:#75baff!important;box-shadow:0 0 0 2px #75baff55;outline:none}.h3-six-t003 textarea.six-prompt::placeholder{color:#9aa8b8;opacity:1}.h3-six-t003 .six-header>.six-status{max-width:180px;max-height:24px;margin:0;padding:3px 6px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px!important;line-height:17px;color:#cbd6e2;background:#1b2632}.h3-six-t003 .six-header>.six-status[data-state=error]{color:#ffdce0;background:#682e38;border:1px solid #dc6472}.h3-six-t003 .six-header>.six-status[data-state=warning]{color:#ffdfa2;background:#574523;border:1px solid #d39e39}.h3-six-t003 .six-header>.six-status[data-state=success]{color:#a5f0c4;background:#214433;border:1px solid #5cb77f}.h3-six-t003 .six-task-details:popover-open,.h3-six-t003 .six-card-options:popover-open{position:fixed;inset:auto;margin:0;max-height:42vh;overflow:auto}.h3-six-t003 .six-story{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) 110px!important;height:66px!important;min-height:66px!important;gap:6px}.h3-six-t003 .six-story>label{font-size:12px!important;line-height:16px!important}.h3-six-t003 .six-story textarea{height:48px!important;min-height:48px!important;font-size:14px!important;line-height:18px!important;padding:5px!important}.h3-six-t003 .six-story button,.h3-six-t003 .six-card-foot button,.h3-six-t003 .six-header button{min-height:32px!important;height:32px!important;font-size:12px!important;padding:4px 7px!important}.h3-six-t003 .six-task-details button,.h3-six-t003 .six-card-options button{min-height:32px!important;font-size:12px!important}';root.append(promptUX);
  const story=find('.six-story');story.append(find('.six-goal').closest('label'),find('.six-settings').closest('label'),find('.six-generate'));
  const a047Style=document.createElement('style');a047Style.textContent=A047_CSS;root.append(a047Style);
  const observer=new MutationObserver(arrange);observer.observe(root,{childList:true,subtree:true});arrange();
  const updatePresentation=()=>{if(!root.isConnected){clearInterval(presentationTimer);clearInterval(queueTimer);observer.disconnect();return;}const duration=Number(globalThis.app?.graph?.getNodeById?.(132)?.widgets?.[0]?.value)||10;cards.forEach((c,i)=>{c.card.querySelector('.six-time').textContent=`${(i*duration).toFixed(1)}–${((i+1)*duration).toFixed(1)} 秒`;c.card.querySelector('.six-inherit-hint').textContent=i===0?'新起点':i===3?'接上一段 · 重置画面':'接上一段';const ready=!!c.video.currentSrc&&!c.video.error;c.videoLabel.hidden=ready;c.video.hidden=!ready&&!!c.video.error;});controls();};
  let queueReading=false;
  const refreshQueue=async()=>{if(queueReading||!root.isConnected)return;queueReading=true;try{const response=await fetch(base+'/queue',{signal:AbortSignal.timeout(5000)});if(!response.ok)return;const data=await response.json(),items=[...(data.queue_running||[]),...(data.queue_pending||[])],ids=new Set(),segments=new Set();for(const item of items){if(item?.[1])ids.add(item[1]);for(const node of Object.values(item?.[2]||{})){const x=node?.inputs;if(node?.class_type==='H3ContinuationSave'&&x?.project_id===runtimeProject()&&Number.isInteger(x.segment_index)&&x.segment_index>=0&&x.segment_index<6)segments.add(x.segment_index)}}const changed=[...ids].sort().join()!==[...queuedPromptIds].sort().join()||[...segments].sort().join()!==[...queuedSegments].sort().join();queuedPromptIds=ids;queuedSegments=segments;if(changed){controls();root.dispatchEvent(new Event('sixchange'))}}catch{}finally{queueReading=false}};
  const queueTimer=setInterval(refreshQueue,2000);void refreshQueue();
  const presentationTimer=setInterval(updatePresentation,700);updatePresentation();
  import('/scripts/api.js').then(({api})=>{const progress=event=>{if(!root.isConnected){api.removeEventListener('progress',progress);return;}const detail=event.detail||{},i=chain.currentSegment!=null?chain.currentSegment-1:selected;if(i<0||!cards[i]||!detail.max)return;const value=Math.round(100*detail.value/detail.max);cards[i].progress.hidden=false;cards[i].progress.value=value;cards[i].status.textContent='生成中 '+value+'%';};api.addEventListener('progress',progress);});
  updateTarget();
  return {cards,get group(){return group},select,runSegment,runActive,runBlockReason,setRuntimeProject,setBeforeRunHook:fn=>{beforeRunHook=fn},requestStop,restoreGroup:(value)=>render(value),receiptSnapshot:()=>structuredClone(receipts),executionSnapshot,segmentSettingsSnapshot:()=>cards.map((_,i)=>segmentSettingsAt(i)),bindSegmentVideo,setSegmentVideo,guideSnapshot:()=>guideControls.map(c=>c.snapshot()),restoreGuide:(index,config,onlyPristine=true)=>guideControls[index]?.restore(config,onlyPristine),refreshGuideFrames:()=>Promise.all(guideControls.map(c=>c.preview())),videoSnapshot:()=>cards.map(c=>c.videoRef?{...c.videoRef}:null),chainSnapshot:()=>({...chain,busy,inBatch,abortRequested:stopping,trace:chain.trace.map(e=>({...e}))})};
}

