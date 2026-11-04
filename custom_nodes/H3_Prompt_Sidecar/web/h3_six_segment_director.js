import {prepareIdentity} from './h3_identity_refs.js?v=20261028t009a';
import {installCompilerPreview} from './h3_six_compiler_preview_ui.js?v=20261026a048mainstatus1';
import {app} from '../../../scripts/app.js';
import {restoredExecutionPolicy} from './h3_execution_policy.js?v=20261024savedpolicy1';
import {api} from '../../../scripts/api.js';
import {sixIdentity,scopedSixStorage} from '/extensions/H3_Prompt_Sidecar/six_identity.js?v=20261025identity1';
import {uploadGuide,previewGuide,guideImageURL,watchGuideFrames} from './h3_six_guides.js?v=20261017guide3';
import {executeVisiblePrompt} from './h3_six_execute.js?v=20261029t015rerun1';
import {fingerprintWithPredecessor,verifyNativeReceipt} from './h3_six_receipt_contract.js?v=20261025chain3';
import {applySegmentSettingsToPrompt} from './h3_task_workflow.js?v=20261024segmentsettings2';
import {installNativeMerge,beforeSixExecution} from './h3_native_merge.js?v=20261029t015rerun2';
import {readJsonResponse} from './h3_json_response.js?v=p0fix1';

import {SIX_MIN_WIDTH,installSixWidthContract} from './h3_six_width_contract.js?v=20261006d';
import {enabled as prebakeEnabled,status as prebakeStatus,omniRefRouteActive,storyId,restoreProductionIdentity,restoreProductionExecution,syncProductionTexts} from '/extensions/h3_conditioning_prebake/production.js?v=20261024p0cache3';
import {findMatchingHistoryVideo} from './preview_history.js?v=20261024historypreview1';
import {writeCurrentCardPrompt,reflectCardPrompt} from './h3_six_prompt_sync.mjs?v=20261026sharedprompt1';

function saveVideoNodeId(){
  const nodes=app.graph._nodes.filter(n=>(n.comfyClass||n.type)==='SaveVideo'&&n.properties?.h3_operation==='pass1');
  if(nodes.length!==1)throw Error('正式pass1 SaveVideo节点缺少或不唯一');
  return String(nodes[0].id);
}

function locateDirectorType(type) {
  const seen = new Set();
  function find(graph) {
    if (!graph || seen.has(graph)) return null;
    seen.add(graph);
    for (const node of graph._nodes || []) {
      if ((node.comfyClass || node.type) === type) return node;
      const nested = find(node.subgraph);
      if (nested) return nested;
    }
    return null;
  }
  const node = find(app.graph);
  if (!node) return false;
  if (node.graph !== app.canvas.graph) app.canvas.openSubgraph?.(node.graph);
  app.canvas.centerOnNode(node);
  const height=app.canvas.canvas?.getBoundingClientRect?.().height,scale=app.canvas.ds?.scale;
  if(height&&scale&&node.size?.[1]*scale>height-120)app.canvas.ds.offset[1]=60/scale-node.pos[1];
  // Keep the destination below the fixed promotion bar after centering.
  const canvasRect=app.canvas.canvas?.getBoundingClientRect?.(),bar=document.getElementById('h3-promotion-topbar');
  if(scale&&canvasRect&&bar&&!bar.hidden){
    const barRect=bar.getBoundingClientRect();
    if(barRect.height>0){
      const nodeTop=canvasRect.top+(node.pos[1]+app.canvas.ds.offset[1])*scale;
      const safeTop=Math.max(canvasRect.top+60,barRect.bottom+32);
      if(nodeTop<safeTop)app.canvas.ds.offset[1]+=(safeTop-nodeTop)/scale;
    }
  }
  node.graph?.setDirtyCanvas?.(true, true);
  return true;
}

const PROMO_TOPBAR_ID='h3-promotion-topbar';
function installPromotionTopbar(){
  if(document.getElementById(PROMO_TOPBAR_ID))return;
  const bar=document.createElement('nav');bar.id=PROMO_TOPBAR_ID;bar.setAttribute('aria-label','H3 导演台快捷栏');
  bar.style.cssText='position:absolute;left:0;right:0;top:0;z-index:998;display:flex;align-items:center;gap:8px;min-height:42px;padding:5px 12px;box-sizing:border-box;background:transparent;border-bottom:0;pointer-events:none;color:#edf2f7;font:600 13px/1.2 system-ui,"Microsoft YaHei",sans-serif';
  const status=document.createElement('span');status.setAttribute('role','status');status.style.cssText='pointer-events:auto;background:#171b22cc;padding:4px 8px;border-radius:6px;margin-left:auto;color:#a8c5db;white-space:nowrap';
  const makeButton=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='pointer-events:auto;min-height:32px;padding:5px 12px;border:1px solid #566477;border-radius:6px;background:#263241;color:#f4f7fb;font:inherit;cursor:pointer';b.addEventListener('click',fn);return b};
  bar.append(makeButton('总控台',()=>locateDirectorType('H3OperationSelector')),makeButton('六段台',()=>locateDirectorType('H3SixDirectorState')),makeButton('剧情导演',()=>window.dispatchEvent(new Event('h3-promotion-locate-story-director'))),makeButton('最新输出',()=>{const ok=locateDirectorType('H3SixDirectorState');if(ok)setTimeout(()=>document.querySelector('.six-card video[src]')?.scrollIntoView({block:'center',behavior:'smooth'}),150)}),status);
  const sixChainActive=()=>[...(app.graph?._nodes||[])].some(node=>node.type==='H3SixDirectorState'&&['RUNNING','STOP_REQUESTED'].includes(node.__sixUI?.chainSnapshot?.().state));
  let stopSending=false;
  const stop=makeButton('■ 停止',async()=>{
    if(stopSending)return;stopSending=true;stop.disabled=true;status.textContent='正在请求停止…';
    try{
      for(const node of app.graph?._nodes||[])if(node.type==='H3SixDirectorState')node.__sixUI?.requestStop?.();
      const response=await api.fetchApi('/interrupt',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!response.ok)throw Error('HTTP '+response.status);
      status.textContent='已发送停止请求';
    }catch(error){status.textContent='停止失败：'+error.message}
    finally{stopSending=false;void refreshQueue()}
  });stop.style.cssText+=';background:#492831;border-color:#a14b5a';bar.append(stop);
  const refreshQueue=async()=>{const active=candidateActive();bar.hidden=!active;for(const button of document.querySelectorAll('button[aria-label="取消当前任务"]')){if(active){if(!button.hasAttribute('data-h3-promo-old-display'))button.setAttribute('data-h3-promo-old-display',button.style.display);button.style.display='none'}else if(button.hasAttribute('data-h3-promo-old-display')){button.style.display=button.getAttribute('data-h3-promo-old-display');button.removeAttribute('data-h3-promo-old-display')}}if(!active)return;try{const response=await api.fetchApi('/queue');if(!response.ok)throw Error('HTTP '+response.status);const q=await response.json();const running=q.queue_running?.length||0,pending=q.queue_pending?.length||0;status.textContent=`队列：运行 ${running} · 等待 ${pending}`;stop.disabled=stopSending||!(running||pending||sixChainActive())}catch(error){status.textContent='队列状态不可读：'+error.message;stop.disabled=stopSending||!sixChainActive()}};
  window.addEventListener('h3-sixchain-state',()=>{if(sixChainActive()&&!stopSending)stop.disabled=false;else void refreshQueue()});
  const attach=()=>{const canvas=document.querySelector('#graph-canvas');const host=document.querySelector('#comfyui-body')||canvas?.parentElement||document.body;if(!host)return false;if(canvas&&canvas.parentElement===host)host.insertBefore(bar,canvas);else host.prepend(bar);return true};
  if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),15000)}
  // 2026-10-26 A052：紧贴 ComfyUI 原生工作流标签栏下方，不覆盖原生顶栏（层级低于原生 z-999 浮层）。
  const place=()=>{const host=bar.parentElement;if(!host)return;const hostTop=host.getBoundingClientRect().top;const tabs=document.querySelector('.workflow-tabs-container');let bottom=tabs&&tabs.offsetParent?tabs.getBoundingClientRect().bottom:hostTop;
    // 原生浮动控件（画布左上工具条、右上运行按钮组等）都在标签栏下方一带；跳转条放在它们全部的下方，避免互相遮挡。提示框除外。
    for(const el of document.querySelectorAll('.pointer-events-auto')){if(bar.contains(el)||el.closest('.p-toast')||!el.offsetParent)continue;const r=el.getBoundingClientRect();if(r.height>0&&r.height<90&&r.width<1000&&r.top>=hostTop&&r.top<bottom+70)bottom=Math.max(bottom,r.bottom)}
    const off=Math.max(0,Math.round(bottom-hostTop+4));if(bar.style.top!==off+'px')bar.style.top=off+'px';
    const sb=document.querySelector('.side-tool-bar-container');let padL=12;if(sb&&sb.offsetParent){const x=sb.getBoundingClientRect(),y=bar.getBoundingClientRect();if(x.right>y.left&&x.top<y.bottom&&x.bottom>y.top)padL=Math.max(12,Math.round(x.right-y.left)+8)}if(bar.style.paddingLeft!==padL+'px')bar.style.paddingLeft=padL+'px';const y=bar.getBoundingClientRect();let padR=12;for(const el of document.querySelectorAll('.pointer-events-auto')){if(bar.contains(el)||!el.offsetParent)continue;const r=el.getBoundingClientRect();if(r.top<y.bottom&&r.bottom>y.top&&r.left>y.left+y.width/2&&r.width<700)padR=Math.max(padR,Math.round(y.right-r.left)+8)}if(bar.style.paddingRight!==padR+'px')bar.style.paddingRight=padR+'px';
    // Probe each button at its unshifted position, then move past any element
    // which actually covers it. Reset first so closing a sidebar removes offset.
    bar.style.paddingLeft=padL+'px';
    let avoid=padL;const bounds=bar.getBoundingClientRect();
    for(const button of bar.querySelectorAll('button')){
      const r=button.getBoundingClientRect(),x=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
      if(x<0||x>=innerWidth||cy<0||cy>=innerHeight)continue;
      const hit=document.elementFromPoint(x,cy);
      // A069：只避让左侧栏；弹窗遮罩、六段面板等其他浮层不算遮挡，否则按钮会被推出屏幕。
      const side=hit&&!bar.contains(hit)&&!hit.closest('.p-dialog-mask,.p-dialog,[role=dialog],.comfy-modal')&&hit.closest('.side-bar-panel,.sidebar-content-container,.side-tool-bar-container,[class*="side-bar"],[class*="sidebar"]');
      if(side){const blocker=side.getBoundingClientRect();if(blocker.width>innerWidth*0.6)continue;if(blocker.right>bounds.left&&blocker.left<r.right)avoid=Math.max(avoid,Math.ceil(blocker.right-bounds.left)+8)}
    }
    bar.style.paddingLeft=avoid+'px';
  };
  place();setInterval(place,1000);window.addEventListener('resize',place);
  refreshQueue();setInterval(refreshQueue,2000);
}

function repairOmniRefLivePreviewRoute(){
  console.warn('[H3 OmniRef route repair] entered');
  const graph=app.graph;
  const omni=graph?.getNodeById?.(1106);
  const fl=graph?.getNodeById?.(644);
  if(fl?.type==='MiniMaxH3ImageToVideo'&&fl.mode===0){
    const preview=graph.getNodeById(691),model=graph.getNodeById(645),route=graph.getNodeById(930);
    if(preview?.type!=='ModelPreviewOverrideKJ'||model?.type!=='Any Switch (rgthree)'||route?.type!=='Any Switch (rgthree)')return false;
    const link=input=>graph.links instanceof Map?graph.links.get(input?.link):graph.links?.[input?.link];
    let changed=false;
    if(link(preview.inputs?.[0])?.origin_id!==model.id){preview.disconnectInput(0);model.connect(0,preview,0);changed=true;}
    if(link(route.inputs?.[4])?.origin_id===preview.id){route.disconnectInput(4);changed=true;}
    if(changed)graph.setDirtyCanvas(true,true);
    return changed;
  }
  if(!graph||omni?.mode!==0||omni.properties?.h3_ref2va_backend_branch!=='omniref8')return false;
  const preview=graph.getNodeById?.(691),model=graph.getNodeById?.(1103),route=graph.getNodeById?.(930);
  if(preview?.type!=='ModelPreviewOverrideKJ'||!['BlockSparseAttention','MiniMaxH3SparkAttentionSM120'].includes(model?.type)||route?.type!=='Any Switch (rgthree)')return false;
  let changed=false;
  const getLink=id=>graph.links instanceof Map?graph.links.get(id):graph.links?.[id];
  const sourceId=input=>getLink(input?.link)?.origin_id;
  if(sourceId(preview.inputs?.[0])!==model.id){
    if(preview.inputs?.[0]?.link!=null)preview.disconnectInput(0);
    model.connect(0,preview,0);
    changed=true;
  }
  if(sourceId(route.inputs?.[4])!==preview.id){
    if(route.inputs?.[4]?.link!=null)route.disconnectInput(4);
    preview.connect(0,route,4);
    changed=true;
  }
  const audio=graph.getNodeById?.(143);
  const audioSlot=(omni.inputs||[]).findIndex(input=>/^(ref_audios\.)?ref_audio_0$/.test(input?.name||'')||input?.localized_name==='ref_audio_0');
  const audioWidget=audio?.widgets?.find(widget=>widget?.name==='audio');
  let audioRoute='audio-node-or-slot-missing';
  if(audio?.type==='LoadAudio'&&audioSlot>=0&&typeof audioWidget?.value==='string'&&audioWidget.value.trim()){
    if(sourceId(omni.inputs[audioSlot])!==audio.id){
      if(omni.inputs[audioSlot]?.link!=null)omni.disconnectInput(audioSlot);
      audio.connect(0,omni,audioSlot);
      changed=true;
    }
    audioRoute=sourceId(omni.inputs[audioSlot])===audio.id?'connected':'connect-failed';
  }else if(audio?.type==='LoadAudio'&&audioSlot>=0){
    audioRoute='audio-file-not-selected';
  }
  console.info('[H3 OmniRef route repair]',{preview:sourceId(route.inputs?.[4])===preview.id,audioRoute,audioSlot,audioFile:audioWidget?.value||null});
  if(changed)graph.setDirtyCanvas(true,true);
  return changed;
}

async function restoreMatchingCanvasPreview(node,ui){
  const saved=node.properties?.six_prompt_state?.video_refs||[];
  if(saved[0]?.filename||ui.cards[0]?.videoRef)return false;
  const snapshot=await app.graphToPrompt();
  const graph=snapshot?.output;
  const saveId=saveVideoNodeId();
  if(!graph?.['1106']||graph['1106'].class_type!=='MiniMaxH3ReferenceToVideo')return false;
  const response=await api.fetchApi('/history?max_items=30');
  if(!response.ok)return false;
  const history=await response.json();
  const ref=findMatchingHistoryVideo(history,graph,saveId);
  if(!ref)return false;
  ui.setSegmentVideo(0,ref);
  ui.cards[0].status.textContent='主工作流已有精确匹配视频；未计为六段执行成功';
  ui.cards[0].videoLabel.textContent='匹配当前工作流的历史视频预览｜'+ref.filename+'｜仅预览，不作为六段成功回执';
  return true;
}

async function resolveSegmentVideo(index,result){
  if(!result?.prompt_id)throw Error('缺少本段prompt_id');
  const response=await api.fetchApi(`/history/${encodeURIComponent(result.prompt_id)}`);
  if(!response.ok)throw Error('读取本段历史失败：'+response.status);
  const history=(await response.json())[result.prompt_id];
  if(history?.status?.status_str!=='success'||history.status.completed!==true)throw Error('本段历史尚未确认SUCCESS');
  const id=result.save_video_node_id||saveVideoNodeId();
  const nodeOutput=history.outputs?.[id];
  const videos=[...(nodeOutput?.images||[]),...(nodeOutput?.videos||[])].filter(v=>typeof v.filename==='string'&&/\.(mp4|webm|mov|mkv)$/i.test(v.filename));
  if(videos.length!==1)throw Error('正式SaveVideo输出不是唯一视频');
  const video=videos[0];
  if(typeof video.subfolder!=='string'||typeof video.type!=='string')throw Error('视频输出缺少subfolder/type');
  return {filename:video.filename,subfolder:video.subfolder,type:video.type,prompt_id:result.prompt_id};
}

function videoURL(ref){return api.apiURL('/view?'+new URLSearchParams({filename:ref.filename,subfolder:ref.subfolder,type:ref.type}).toString())}

function configureConsolePromptControls() {
  const node=app.graph.getNodeById(159);
  if(!node?.properties?.h3_six_prompt_authority)return;
  const directorNode=app.graph._nodes.find(candidate=>candidate.type==='H3SixDirectorState'&&candidate.properties?.h3_six_director===true);
  if(!directorNode?.__sixUI)return;
  const panel=node.__h3DashboardV3Panel;
  if(!panel)return;
  for(const section of panel.querySelectorAll('section')){
    if(section.dataset.h3SixPromptEditor==='true')return;
    if(section.querySelector('.h3v14-section-title')?.textContent!=='④ 导演整理')continue;
    const organize=[...section.querySelectorAll('button')].find(button=>button.textContent.trim()==='导演规则自动整理');
    section.replaceChildren();
    const title=document.createElement('div');title.className='h3v14-section-title';title.textContent='④ 当前段提示词';
    const row=document.createElement('label');row.className='h3v14-setting';row.append(document.createTextNode('编辑段落 '));
    const picker=document.createElement('select');picker.className='h3v14-select';picker.setAttribute('aria-label','当前段提示词');
    for(let index=0;index<6;index++)picker.add(new Option(`S${index+1}`,String(index)));
    row.append(picker);
    const editor=document.createElement('textarea');editor.className='h3v14-textarea';editor.setAttribute('aria-label','当前段提示词');editor.spellcheck=false;editor.style.minHeight='150px';
    const hint=document.createElement('div');hint.className='h3v14-readonly';hint.textContent='与六段台同一段共用文本；编辑会立即保存到该段。N138 仅在提交任务时写入。';
    section.append(title,row,editor,hint);
    if(organize){organize.textContent='整理当前段提示词';section.append(organize)}
    section.dataset.h3SixPromptEditor='true';
    node.__h3ConsolePromptEditor=editor;
    node.__h3ConsolePromptPicker=picker;
    // A083：提示词框可单独拖动右下角改变高度；只改这个框，不联动总控台尺寸，也不被定时重置。
    editor.style.resize='vertical';section.style.maxHeight='none';section.style.overflow='visible';
    let syncing=false;
    const activeIndex=()=>Math.max(0,Math.min(5,Number(node.properties.h3_six_active_segment)||0));
    node.__h3RunSixActive=()=>directorNode.__sixUI.runActive(activeIndex());
    const showSegment=index=>{
      const safe=Math.max(0,Math.min(5,Number(index)||0));
      node.properties.h3_six_active_segment=safe;
      picker.value=String(safe);
      const area=directorNode.__sixUI.cards[safe]?.area;
      syncing=true;if(area)reflectCardPrompt({area},editor);else editor.value='';syncing=false;
      app.graph.setDirtyCanvas(true,true);
    };
    picker.addEventListener('change',()=>{
      const index=Number(picker.value);node.properties.h3_six_active_segment=index;
      directorNode.__sixUI.select(index);showSegment(index);
    });
    editor.addEventListener('input',()=>{
      if(syncing)return;
      const area=directorNode.__sixUI.cards[activeIndex()]?.area;if(!area)return;
      writeCurrentCardPrompt({area},editor.value);
    });
    directorNode.__sixRoot.addEventListener('sixsegmentselect',event=>showSegment(event.detail?.index));
    directorNode.__sixRoot.addEventListener('sixrecoverydisplay',()=>showSegment(activeIndex()));
    directorNode.__sixRoot.addEventListener('input',event=>{
      if(!event.target.matches('.six-prompt'))return;
      const index=directorNode.__sixUI.cards.findIndex(card=>card.area===event.target);
      if(index!==activeIndex())return;
      syncing=true;reflectCardPrompt({area:event.target},editor);syncing=false;
    });
    window.addEventListener('h3-six-prompt-draft',event=>{
      if(typeof event.detail?.text!=='string')return;
      writeCurrentCardPrompt(directorNode.__sixUI.cards[activeIndex()],event.detail.text);
    });
    showSegment(activeIndex());
  }
}

function candidateActive(){return app.graph?.extra?.h3_six_segment_director?.enabled===true&&app.graph._nodes.some(n=>n.type==='H3SixDirectorState'&&n.properties?.h3_six_director===true)}
function updateCandidateEntrance(){for(const button of document.querySelectorAll('.h3-six-open'))button.hidden=!candidateActive()}
function hideBackendContinuityControl(){
  if(!candidateActive())return;
  const node=app.graph._nodes.find(n=>n.properties?.h3_six_backend_only===true);
  if(!node)return;
  node.flags.collapsed=true;
  for(const widget of node.widgets||[]){widget.type='hidden';widget.computeSize=()=>[0,-4]}
}

// Reuse the exact connected H3 picture order; never infer Subject identities.
export function directorReferenceImages(snapshot,settings) {
  const output=snapshot?.output||{};
  const targets=Object.values(output).filter(n=>n.class_type==='MiniMaxH3ReferenceToVideo');
  if(targets.length>1)throw Error('存在多个H3参考目标，请明确当前参考图接线');
  if(!targets.length)return [];
  const slots=Object.entries(targets[0].inputs||{}).flatMap(([key,value])=>{
    const match=key.match(/^ref_images\.ref_image_(\d+)$/);
    return match&&Array.isArray(value)?[{slot:Number(match[1]),node:String(value[0])}]:[];
  }).sort((a,b)=>a.slot-b.slot);
  return slots.map((item,index)=>{
    const filename=output[item.node]?.inputs?.image;
    if(typeof filename!=='string'||!filename.trim())throw Error(`参考图${index+1}不是可读取的已上传图片，请检查原图像节点`);
    const picture_label=`<Picture ${index+1}>`;
    const lines=settings.split(/\r?\n/).filter(line=>line.includes(picture_label));
    const labels=[...new Set(lines.flatMap(line=>[...line.matchAll(/<Subject\s+\d+>/g)].map(m=>m[0])))];
    return {filename,source_node:item.node,picture_label,subject_labels:labels,role:lines.join('\n')};
  });
}

// Migrate only an explicitly saved/renamed active workflow; never search other drafts.
function installSixDraftMigration(){
  const store=app.extensionManager?.workflow;
  if(!store?.$onAction||store.__h3SixDraftMigrationInstalled)return;
  store.__h3SixDraftMigrationInstalled=true;
  let pending=null;
  const kinds=['texts','segment-settings','chain-receipts','task','recovery-draft'];
  const identityFor=(workflow)=>{
    const graph=app.graph,node=graph?._nodes?.find(n=>n.type==='H3SixDirectorState'&&n.properties?.h3_six_director);
    if(!workflow?.path||workflow!==store.activeWorkflow||!node||String(workflow.activeState?.id)!==String(graph.id))return null;
    return {identity:sixIdentity({workflowId:graph.id,workflowPath:workflow.path,nodeId:node.id,qaNamespace:graph.extra?.qa_provenance?.namespace,storyId:node.properties?.h3_prebake_story_id}),nodeId:String(node.id),domain:String(graph.extra?.qa_provenance?.namespace||'USER'),story:String(node.properties?.h3_prebake_story_id||'')};
  };
  const capture=(source,target)=>{
    const from=identityFor(source);if(!from||typeof target!=='string'||!target.startsWith('workflows/'))return null;
    const scope=scopedSixStorage(localStorage,from.identity),values={};
    for(const kind of kinds){const value=scope.read(kind);if(value!==null)values[kind]=value}
    return {...from,target,values};
  };
  const finish=(record)=>{
    if(!record||store.activeWorkflow?.path!==record.target)return false;
    const to=identityFor(store.activeWorkflow);
    if(!to||to.nodeId!==record.nodeId||to.domain!==record.domain||to.story!==record.story)return false;
    if(to.identity===record.identity)return true;
    const old=scopedSixStorage(localStorage,record.identity),dest=scopedSixStorage(localStorage,to.identity);
    for(const [kind,value] of Object.entries(record.values)){
      const existing=dest.read(kind);
      if(existing===null)dest.write(kind,value);
      if(JSON.stringify(dest.read(kind))===JSON.stringify(value))old.remove(kind);
    }
    return true;
  };
  store.$onAction(({name,args,after,onError})=>{
    // A064-1：保存/另存前强制把六段面板当前文本快照进 node.properties，避免序列化拿到旧值
    if(name==='saveAs'||name==='saveWorkflow'){for(const graphNode of app.graph?._nodes||[]){if(graphNode.type==='H3SixDirectorState'&&typeof graphNode.__sixSnapshot==='function')graphNode.__sixSnapshot()}}
    if(name==='saveAs'){
      const record=capture(args[0],args[1]);if(!record)return;
      after(result=>{if(result?.path===record.target)pending=record});
      onError(()=>{if(pending===record)pending=null});
    }else if(name==='saveWorkflow'&&pending){
      const record=pending;if(args[0]?.path!==record.target)return;
      after(()=>{if(finish(record))pending=null});onError(()=>{if(pending===record)pending=null});
    }else if(name==='renameWorkflow'){
      const record=capture(args[0],args[1]);if(!record)return;
      after(()=>{setTimeout(()=>finish(record),0)});
    }
  },true);
}

async function mount(node) {
  const mountedGraph=app.graph;
  const identity=()=>{
    const workflow=app.extensionManager?.workflow?.activeWorkflow;
    if(app.graph!==mountedGraph||!mountedGraph._nodes.includes(node)||!workflow?.path||String(workflow.activeState?.id)!==String(mountedGraph.id))return null;
    return sixIdentity({workflowId:mountedGraph.id,workflowPath:workflow.path,nodeId:node.id,qaNamespace:mountedGraph.extra?.qa_provenance?.namespace,storyId:node.properties?.h3_prebake_story_id});
  };
  node.__sixIdentity=identity; // A064-3：v2 等共用同一身份函数；取不到身份时禁止读写本机数据
  const workflowSnapshot=async()=>{
    const expected=identity();if(!expected)return null;
    const workflow=app.extensionManager.workflow.activeWorkflow,path=workflow.path;
    if(workflow.isTemporary){
      const savedNode=workflow.initialState?.nodes?.find(n=>String(n.id)===String(node.id));
      return {savedTexts:savedNode?.properties?.six_prompt_state?.texts||null,savedAt:0};
    }
    const response=await api.fetchApi('/userdata/'+encodeURIComponent(path));
    if(!response.ok)return null;
    const saved=await response.json();
    const savedNode=saved?.nodes?.find(n=>String(n.id)===String(node.id));
    const fileIdentity=sixIdentity({workflowId:saved?.id,workflowPath:path,nodeId:node.id,qaNamespace:saved?.extra?.qa_provenance?.namespace,storyId:savedNode?.properties?.h3_prebake_story_id});
    if(identity()!==expected||fileIdentity!==expected)return null;
    return {savedTexts:savedNode?.properties?.six_prompt_state?.texts||null,savedAt:workflow.lastModified||0};
  };
  if(node.type==='H3SixDirectorState')installSixWidthContract(node);
  if(!candidateActive()||!node.properties?.h3_six_director||node.__sixRoot)return;
  const root=document.createElement('div');root.style.cssText='width:100%;height:100%;overflow:visible;box-sizing:border-box;padding:0';
  node.__sixRoot=root;
  const dom=node.addDOMWidget('h3_six_prompts','H3_SIX_PROMPTS',root,{serialize:false,hideOnZoom:false,getMinHeight:()=>760,getMaxHeight:()=>Infinity});
  const computeLayout=dom.computeLayoutSize;
  dom.computeLayoutSize=function(...args){return {...computeLayout.apply(this,args),minWidth:SIX_MIN_WIDTH-20}};
  const draw=dom.options.onDraw;
  dom.options.onDraw=function(...args){draw?.apply(this,args);node.__sixSyncWidth()};
  node.__sixSyncWidth();
  node.resizable=true;node.flags.resizable=true;
  let ready=false;
  node.__h3EditSync=Promise.resolve();
  const snapshot=()=>{
    if(app.graph!==mountedGraph||!mountedGraph._nodes.includes(node))return;
    // A064-1：面板就绪前的编辑不丢弃，暂存到 __sixPendingTexts，ready 后补写；
    // 初始化期间卡片全部为空时不捕获，避免把六_ui 从 savedState 回填前的空态当作编辑
    if(!ready){const pendingAreas=[...root.querySelectorAll('.six-prompt')];if(pendingAreas.length&&pendingAreas.some(area=>area.value))node.__sixPendingTexts=pendingAreas.map(area=>area.value);return}
    const workflow=identity()?app.extensionManager?.workflow?.activeWorkflow:null,tracker=workflow?.changeTracker;
    const beforeTexts=JSON.stringify(node.properties.six_prompt_state?.texts||null);
    const beforeExecution=JSON.stringify(node.properties.six_prompt_state?.execution||null); // A072
    node.properties.six_prompt_state={...node.properties.six_prompt_state,settings:root.querySelector('.six-settings').value,goal:root.querySelector('.six-goal').value,model:root.querySelector('.six-model').value,texts:[...root.querySelectorAll('.six-prompt')].map(t=>t.value),group_id:node.__sixUI?.group?.id??node.properties.six_prompt_state?.group_id??null,segment_settings:node.__sixUI?.segmentSettingsSnapshot()||node.properties.six_prompt_state?.segment_settings||Array(6).fill(null).map(()=>({width:null,height:null,length:null})),execution:node.__sixUI?.executionSnapshot()||node.properties.six_prompt_state?.execution,video_refs:node.__sixUI?.videoSnapshot()||node.properties.six_prompt_state?.video_refs||Array(6).fill(null)};
    node.properties.six_prompt_state.guides=node.__sixUI?.guideSnapshot?.()||node.properties.six_prompt_state.guides;
    node.properties.six_prompt_state.chain_receipts=node.__sixUI?.receiptSnapshot?.()||node.properties.six_prompt_state.chain_receipts||{};
    app.graph.setDirtyCanvas(true,true);
    tracker?.captureCanvasState?.();
    // A072：存档项目/连续/起始方式变化也标记未保存，否则刷新会静默回落到旧值。
    if(workflow&&(beforeTexts!==JSON.stringify(node.properties.six_prompt_state.texts)||beforeExecution!==JSON.stringify(node.properties.six_prompt_state.execution)))workflow.isModified=true;
  };
  node.__sixSnapshot=snapshot; // A064-1：供保存/另存前的强制快照调用
  root.addEventListener('input',event=>{snapshot();if(event.target.matches('.six-prompt'))node.__h3EditSync=node.__h3EditSync.catch(()=>{}).then(()=>syncProductionTexts(node));node.__h3EditSync.catch(error=>{node.__h3EditError=String(error);root.title='提示词同步失败：'+error.message;})});
  root.addEventListener('change',snapshot);root.addEventListener('sixchange',snapshot);
  // DOM text controls sit above the canvas; forward wheel to its native handler.
  root.addEventListener('wheel',event=>{if(!event.defaultPrevented)app.canvas.processMouseWheel(event)},{capture:true,passive:false});
  root.title='原生滚轮 / Ctrl+滚轮缩放；拖动节点右下角调整尺寸';
  // Text controls own scrolling and focus, rather than dragging the canvas.
  for(const name of ['pointerdown','pointerup','mousedown','mouseup','click','wheel','keydown','keyup'])root.addEventListener(name,event=>event.stopPropagation());
  try{
    await restoreProductionIdentity(node);
    const {mountSixDirector}=await import('/h3-director/six_ui.js?v=20261029t015rerun2');
    const execute=async(...args)=>{await node.__h3EditSync?.catch(()=>{});await beforeSixExecution(root);const id=saveVideoNodeId();const result=await executeVisiblePrompt(...args);return {...result,save_video_node_id:id,superseded:result.execution_version&&result.execution_version!==node.properties.h3_prebake_binding?.execution_version}};
    const readReceiptJSON=async(path,optional=false)=>{let response;try{response=await api.fetchApi(path)}catch(error){throw Error(`回执请求连接失败：${path}｜${(error&&error.message)||error}`)}if(optional&&response.status===404)return null;const value=await readJsonResponse(response,path,{optional404:optional,empty404AsObject:true,label:'回执读取 '});if(!response.ok)throw Error((value&&value.error)||`读取回执失败：${path}｜HTTP ${response.status} ${response.statusText}`);return value;};
    const fingerprintSegment=async(index,text,options)=>{const output=structuredClone((await app.graphToPrompt()).output);applySegmentSettingsToPrompt(output,options.segment_settings||{});const identityRefs=await prepareIdentity(output,index);text+=identityRefs.suffix;const seed=app.graph.getNodeById(142)?.widgets?.[1]?.value||'fixed';return fingerprintWithPredecessor(output,text,options.segment_settings||{},seed,index,options,readReceiptJSON);};
    const recoverSegment=async(record,index,options)=>{const binding=node.properties.h3_prebake_binding;if(prebakeEnabled()&&(!binding||record.execution_version!==binding.execution_version||record.group_id!==binding.group_id||record.story_id!==binding.story_id))throw Error('PreBake执行版本/组身份已变化，拒绝旧回执');return verifyNativeReceipt(record,index,options.project_id,readReceiptJSON);};
    const ui=await mountSixDirector(root,{base:'',execute,canForkSegment:()=>prebakeEnabled(),workflowIdentity:identity,workflowSnapshot,fingerprintSegment,recoverSegment,savedState:node.properties.six_prompt_state,storyId:storyId(node),executionState:node.properties.six_prompt_state?.execution||{},videoRefs:node.properties.six_prompt_state?.video_refs||[],resolveVideo:resolveSegmentVideo,mediaURL:videoURL,guideConfigs:node.properties.six_prompt_state?.guides,collectReferences:async(settings)=>directorReferenceImages(await app.graphToPrompt(),settings),guideTools:{upload:uploadGuide,preview:previewGuide,mediaURL:guideImageURL,watch:watchGuideFrames}});
    // 保存画布恢复已移入 mountSixDirector，在任务恢复回填前应用，保留原优先级与空态守卫。
    const binding=node.properties.h3_prebake_binding;
    if(prebakeEnabled()&&binding){const policy=restoredExecutionPolicy(node.properties.six_prompt_state?.execution,binding);ui.setRuntimeProject(policy.project_id);root.querySelector('.six-start').value=String(policy.start_index);root.querySelector('.six-inheritance').value=policy.start_mode}
    node.__sixUI=ui;ready=true;
    // A064-2：先取工作流文件中的六段文本（ready 前属性不可被覆盖），最后逐字覆盖卡片（工作流优先）
    const savedTexts=Array.isArray(node.properties.six_prompt_state?.texts)?node.properties.six_prompt_state.texts.slice():null;
    // A064-1：补写就绪前暂存的编辑
    if(Array.isArray(node.__sixPendingTexts)&&node.__sixPendingTexts.length===6){const pendingTexts=node.__sixPendingTexts;delete node.__sixPendingTexts;ui.cards.forEach((card,i)=>{const value=pendingTexts[i];if(typeof value==='string'&&card.area.value!==value){card.area.value=value;card.area.dispatchEvent(new Event('input',{bubbles:true}))}})}
    // A064-2：按工作流中的 group_id 恢复导演组（界面无组时）
    try{
      const savedGroupId=node.properties.six_prompt_state?.group_id??null;
      if(savedGroupId&&!ui.group){const groupResponse=await api.fetchApi('/api/h3-director/groups/result/'+encodeURIComponent(savedGroupId));if(groupResponse.ok){const groupValue=await groupResponse.json();if(groupValue?.id){ui.restoreGroup(groupValue);const propertyState=node.properties.six_prompt_state;if(propertyState?.settings)root.querySelector('.six-settings').value=propertyState.settings;if(propertyState?.goal)root.querySelector('.six-goal').value=propertyState.goal;if(propertyState?.model)root.querySelector('.six-model').value=propertyState.model}}}
    }catch(groupError){root.querySelector('.six-status').textContent+='\n导演组按编号恢复失败：'+groupError.message}
    if(Array.isArray(savedTexts)&&savedTexts.length===6)ui.cards.forEach((card,i)=>{const value=savedTexts[i];if(typeof value==='string'&&card.area.value!==value)card.area.value=value});
    if(!prebakeEnabled())ui.cards.forEach(c=>{if(c.videoRef)c.status.textContent='已恢复已保存视频';else c.status.textContent='未生成'});
    if(!prebakeEnabled()){
      for(const card of ui.cards){
        const badge=document.createElement('small');badge.className='six-prebake-state';badge.textContent=prebakeStatus();card.card.querySelector('h3')?.after(badge);
      }
      const status=root.querySelector('.six-status');status.textContent+='\n'+prebakeStatus();
    }
    snapshot();await restoreProductionExecution(node);try{await restoreMatchingCanvasPreview(node,ui)}catch(error){root.querySelector('.six-status').textContent+='\n历史视频预览未恢复：'+error.message}
    installCompilerPreview(ui,root,app);
    try{await installNativeMerge(root,()=>{const b=prebakeEnabled()?node.properties.h3_prebake_binding:null,g=ui.group?.id;return {group_id:g||b?.group_id||node.properties.h3_prebake_last_plan?.group_id||storyId(node),project_id:g&&b&&g!==b.group_id?g:(b?.project_id||ui.executionSnapshot().runtime_project_id||ui.executionSnapshot().project_id),save_video_node_id:saveVideoNodeId()}})}
    catch(error){root.querySelector('.six-status').textContent+='\n自动拼接未就绪：'+error.message}
  }catch(error){root.textContent='六段面板加载失败：'+error.message+'；请检查当前实例 Director接口'}
}
export async function remountSixControls(node){
  if(node.__sixUI?.chainSnapshot().busy)throw Error('当前六段仍在执行，拒绝重挂面板');
  const old=node.__sixRoot;
  const index=node.widgets?.findIndex(w=>w.name==='h3_six_prompts')??-1;
  if(index>=0)node.removeWidget(node.widgets[index]);
  old?.remove();delete node.__sixRoot;delete node.__sixUI;
  await mount(node);
}
// A081：鼠标位于滚动条区域时，滚轮滚动该区域；其他位置保持原有画布行为。
function installScrollbarWheel(){
  if(window.__h3ScrollbarWheel)return;window.__h3ScrollbarWheel=true;
  const scrollable=(el,axis)=>{const cs=getComputedStyle(el);const ov=axis==='y'?cs.overflowY:cs.overflowX;const can=el.tagName==='TEXTAREA'||/(auto|scroll|overlay)/.test(ov);return can&&(axis==='y'?el.scrollHeight>el.clientHeight+1:el.scrollWidth>el.clientWidth+1)};
  document.addEventListener('wheel',event=>{
    if(!event.target?.closest?.('.h3v14-dashboard,.h3-six,#h3-six-console-v2,.s2-console,[class*="h3v14"],[class*="six-"]'))return;
    for(let el=event.target;el&&el!==document.body;el=el.parentElement){
      if(!(el instanceof Element))continue;const r=el.getBoundingClientRect();
      const vw=el.offsetWidth-el.clientWidth-(parseFloat(getComputedStyle(el).borderLeftWidth)||0)-(parseFloat(getComputedStyle(el).borderRightWidth)||0);
      const hw=el.offsetHeight-el.clientHeight-(parseFloat(getComputedStyle(el).borderTopWidth)||0)-(parseFloat(getComputedStyle(el).borderBottomWidth)||0);
      const gutterY=Math.max(vw,10),gutterX=Math.max(hw,10);
      const onY=scrollable(el,'y')&&event.clientX>=r.right-gutterY-2&&event.clientX<=r.right+1;
      const onX=scrollable(el,'x')&&event.clientY>=r.bottom-gutterX-2&&event.clientY<=r.bottom+1;
      if(!onY&&!onX)continue;
      const unit=event.deltaMode===1?16:event.deltaMode===2?el.clientHeight:1;
      if(onY)el.scrollTop+=event.deltaY*unit;else el.scrollLeft+=(event.deltaX||event.deltaY)*unit;
      event.preventDefault();event.stopImmediatePropagation();return;
    }
  },{capture:true,passive:false});
}
installScrollbarWheel();
if(!app.extensions.some(extension=>extension.name==='H3.SixSegmentDirector'))app.registerExtension({name:'H3.SixSegmentDirector',
  registerCustomNodes(){
    class H3SixDirectorState extends LGraphNode {
      constructor(){
        super('六段提示词导演台（独立状态）');
        this.isVirtualNode=true;
        this.properties={h3_six_director:true,six_prompt_state:{settings:'',goal:'',model:'dark_roast',texts:Array(6).fill('')},h3_six_prompts:''};
        this.size=[1800,1100];this.resizable=true;
        installSixWidthContract(this);
      }
      onConfigure(){this.isVirtualNode=true;this.resizable=true;this.flags.resizable=true}
      onSerialize(data){data.isVirtualNode=true}
    }
    LiteGraph.registerNodeType('H3SixDirectorState',H3SixDirectorState);
    H3SixDirectorState.category='H3';
  },
  nodeCreated(node){if(node.type==='H3SixDirectorState')setTimeout(()=>mount(node),0)},
  async afterConfigureGraph(){repairOmniRefLivePreviewRoute();updateCandidateEntrance();hideBackendContinuityControl();for(const node of app.graph._nodes)if(node.type==='H3SixDirectorState')await mount(node);configureConsolePromptControls();setTimeout(configureConsolePromptControls,300);setTimeout(configureConsolePromptControls,1200);
    const setWritableProperty=(object,key,value)=>{let owner=object,descriptor;while(owner&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(owner,key);owner=Object.getPrototypeOf(owner)}if(descriptor&&!('writable' in descriptor)&&typeof descriptor.set!=='function')return false;try{object[key]=value;return object[key]===value}catch{return false}};const fit=()=>{if(!candidateActive())return;/* A081：只在首次布局时摆放；用户调整过的尺寸、位置和画布缩放不再被重置 */const layoutKey='h3_layout_initialized:'+(app.extensionManager?.workflow?.activeWorkflow?.path||'');let seen=false;try{seen=localStorage.getItem(layoutKey)==='1'}catch{}if(app.graph.extra?.h3_layout_initialized||seen)return;app.graph.extra=app.graph.extra||{};app.graph.extra.h3_layout_initialized=true;try{localStorage.setItem(layoutKey,'1')}catch{}const main=app.graph.getNodeById(159),six=app.graph.getNodeById(992);if(!main||!six)return;main.pos=[30,130];main.size=[880,930];six.pos=[930,130];six.size=[1000,952];main.flags.skip_title_render=true;six.flags.skip_title_render=true;setWritableProperty(main.constructor,'title_mode',LiteGraph.NO_TITLE);setWritableProperty(six.constructor,'title_mode',LiteGraph.NO_TITLE);setWritableProperty(main,'title_mode',LiteGraph.NO_TITLE);setWritableProperty(six,'title_mode',LiteGraph.NO_TITLE);const group=app.graph._groups.find(g=>g.title?.startsWith('02'));if(group){group.title='02｜操作区：总控台 + 六段导演台';group.pos=[20,100];group.size=[1920,1000];group.color='#699bc4';}const scale=Math.min(.92,(innerWidth-110)/1900,(innerHeight-130)/1040);app.canvas.ds.scale=Math.max(.2,scale);app.canvas.ds.offset=[50,20];app.canvas.setDirty(true,true);};setTimeout(fit,1500);
  },
  setup(){
    installSixDraftMigration();installPromotionTopbar();updateCandidateEntrance();
  }
});

