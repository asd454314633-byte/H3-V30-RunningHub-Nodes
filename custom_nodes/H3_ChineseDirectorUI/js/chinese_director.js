import {materialCell} from '/extensions/h3_workflow_helpers/h3_material_cell.js';
import {app} from '/scripts/app.js';
import {api} from '/scripts/api.js';
import {syncDepthControl} from './depth_control.js?v=20261024depth1';
// 2026-10-24 双控制器冲突修复：关键帧轴唯一权威状态源（N991），与傻瓜面板⑧共享。
// 载入纪律：本 import 与 h3_workflow_ux.js 的同名 import 必须用同一 ?v= 版本串。
import {reconcileGuideAxis, h3GuideCountOf, H3_GUIDE_MODES} from '/extensions/h3_workflow_helpers/h3_guide_authority.js?v=20261024gauth1';
// UI adapters only. Existing serializer, executor and generation chain are unchanged.
const GUIDE=[965,983,985,988,984,986,989],POSE=[1059,1060,1061,1062,1063];
const n=id=>app.graph.getNodeById(id);
const w=(node,name)=>{const widget=node?.widgets?.find(w=>w.name===name);if(!widget)throw Error('开关状态异常，请重新加载工作流');return widget};
const sub=()=>n(1056)?.subgraph?._nodes||app.graph?._nodes||[];
const plans=()=>sub().filter(x=>['H3ContinuationPrepare','H3ContinuationTrimOnce'].includes(x.type));
const active=()=>app.graph.extra?.h3_chinese_switches?.enabled===true;
let controls={},message;
const dirty=()=>app.graph.setDirtyCanvas(true,true);
function rememberFile(widget,filename){if(Array.isArray(widget.options?.values)&&filename&&!widget.options.values.includes(filename))widget.options.values.push(filename);widget.value=filename;try{widget.callback?.(filename)}catch(error){}
 // 2026-10-24：触发 callback 让 mirrorGuideSource 同步 guard.image_name 哨兵
 //（旧 setSwitch 代写逻辑已移除，mirror 是该字段的唯一写者）。
}
function mediaParams(path){const parts=path.replaceAll('\\','/').split('/'),filename=parts.pop();return new URLSearchParams({filename,subfolder:parts.join('/'),type:'input'});}
async function refreshMediaChoices(){
 // Existing nested reference paths are accepted by the nodes' validators, but
 // their dropdowns only enumerate the input root. Confirm before restoring UI choices.
 for(const node of app.graph._nodes){if(!['LoadImage','LoadImageCrop','LoadVideo','LoadAudio'].includes(node.type))continue;
  const widget=node.widgets?.find(x=>['image','file','audio'].includes(x.name)),filename=String(widget?.value||'');if(!filename||!Array.isArray(widget.options?.values))continue;
  const q=mediaParams(filename),r=await api.fetchApi('/view?'+q,{headers:{Range:'bytes=0-31'}});if(r.ok){await r.body?.cancel();rememberFile(widget,filename);}
 }
}
function branch(ids,on){for(const id of ids){if(!n(id))throw Error('开关对应节点缺失，请重新加载工作流');n(id).mode=on?0:4}dirty()}
function modeState(ids){const modes=ids.map(id=>n(id)?.mode);if(modes.every(m=>m===0))return true;if(modes.every(m=>m===4))return false;throw Error('状态异常，请重新同步')}
function rebaseState(){const ns=plans();if(ns.length!==2||ns.some(x=>w(x,'clean_rebase_segment').value!==3))throw Error('连续增强策略异常，请重新加载工作流');const on=w(ns[0],'clean_rebase_enabled').value;if(ns.some(x=>w(x,'clean_rebase_enabled').value!==on))throw Error('状态异常，请重新同步');return on===true}
function guideSelectorNode(){const node=n(991);if(!node)throw Error('缺少关键帧轴选择器，请重新加载工作流');return node}
function guideCount(){return h3GuideCountOf(w(guideSelectorNode(),'关键帧控制').value)}
function guideState(){return guideCount()>0}
const motionKind=()=>app.graph.extra?.h3_motion_control_kind||'pose';
export function actual(){return {guide:guideState(),pose:modeState(motionKind()==='depth'?POSE.filter(id=>id!==1062):POSE),rebase:rebaseState(),pose_file:String(w(n(1061),'file').value||'')}}
function show(text=''){if(message)message.textContent=text;}
function render(){const a=actual();for(const key of ['guide','pose','rebase'])if(controls[key]){controls[key].value=a[key]?'on':'off';if(controls[key].type==='checkbox')controls[key].checked=a[key];}return a}
export function setSwitch(key,on){
 if(key==='guide'){
  // 2026-10-24 双控制器修复：中文开关不再是第二事实源。
  // 档位唯一权威 = N991；本开关只做两件事：
  //   开 → 以「从第 1 槽连续已选图」的前缀张数写回 N991（0 张则自动关闭），
  //   关 → N991 归零；随后由权威同步器一次写齐 guides_json/N965/链 mode。
  const selector=guideSelectorNode();
  let count=0;
  if(on)for(let i=0;i<3;i++){const image=String(w(n([983,985,988][i]),'image').value||'').trim();if(!image)break;count++}
  const widget=w(selector,'关键帧控制');
  widget.value=H3_GUIDE_MODES[count];widget.callback?.(widget.value);
  const applied=reconcileGuideAxis(selector);
  render();show(applied===0?'未选择关键画面，关键画面已自动关闭。':(applied<count?`关键画面须从第 1 槽连续选择，已启用前 ${applied} 张。`:''));return actual();
 }
 else if(key==='pose'){
  if(on&&!String(w(n(1061),'file').value||'').trim()){branch(POSE,false);render();show('未选择动作参考视频，动作控制已自动关闭。');return actual()}
  branch(POSE,on);
  syncDepthControl(app.graph,motionKind(),on);
 }else if(key==='rebase'){
  for(const node of plans()){const widget=w(node,'clean_rebase_enabled');widget.value=on;widget.callback?.(on)}dirty();
 }else throw Error('未知开关');
 render();show();return actual();
}
function pathCheck(path,video){
 if(!path||!path.trim())throw Error(video?'未选择动作参考视频，动作控制已自动关闭。':'关键画面未配置图片，请先在现有图片节点中选择素材。');
 if(path!==path.trim()||path.includes('..')||/^[\\/]|:|[\\/]$/.test(path))throw Error('素材不能是目录或外部路径，请重新选择有效文件。');
 if(!(video?/\.(mp4|webm|mov|mkv|avi|m4v)$/i:/\.(png|jpe?g|webp|bmp)$/i).test(path))throw Error(video?'动作素材不是视频，请重新选择。':'关键画面不是图片，请重新选择。');
}
async function verify(path,video){
 pathCheck(path,video);const src=api.apiURL('/view?'+mediaParams(path));
 const r=await fetch(src,{headers:{Range:'bytes=0-511'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('素材不存在或无法读取，请重新选择。');await r.body?.cancel();
 const media=document.createElement(video?'video':'img');
 try{await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('素材读取超时，请重新选择。')),15000);media.onload=media.onloadedmetadata=()=>{clearTimeout(timer);yes()};media.onerror=()=>{clearTimeout(timer);no(Error('素材无法解码，请更换文件。'))};media.src=src;});if(video&&(!media.videoWidth||!media.videoHeight||!Number.isFinite(media.duration)))throw Error('动作视频没有有效画面，请更换视频。');}finally{media.removeAttribute('src');media.load?.()}
}
export async function preflight(){
 syncDepthControl(app.graph,motionKind(),actual().pose);
 // 2026-10-24 双控制器修复：先经唯一权威同步器把派生状态修齐，再做守卫校验。
 const guideCount=reconcileGuideAxis(guideSelectorNode());
 const guideImages=[983,985,988].map(id=>String(w(n(id),'image').value||'').trim());
 for(let i=0;i<guideCount;i++)if(!guideImages[i])throw Error(`已开启 ${guideCount} 个关键画面，但关键画面${i+1} 未选择图片，请补齐后再提交。`);
 render();
 // Empty video cannot enter GetVideoComponents even after external graph edits.
 if(!String(w(n(1061),'file').value||'').trim()){branch(POSE,false);if(controls.pose)controls.pose.value='off';show('未选择动作参考视频，动作控制已自动关闭。');}
 const a=actual();for(const key of ['guide','pose','rebase'])if(controls[key]&&controls[key].value!==(a[key]?'on':'off'))throw Error('状态异常，请重新同步');
 if(a.pose)await verify(a.pose_file,true);
 if(a.guide){const timeline=JSON.parse(w(n(965),'guides_json').value);if(timeline.fps!==24||timeline.schema_version!==1)throw Error('关键画面时间配置异常，请重新加载工作流。');for(let i=0;i<timeline.guides.length;i++){if(i>=guideCount)break;await verify(guideImages[i],false)}}
 return a;
}
function control(label,key){
 if(key==='rebase'){const box=document.createElement('label');box.className='h3-cn-switch';const input=document.createElement('input');input.type='checkbox';input.setAttribute('role','switch');input.setAttribute('aria-label',label);input.checked=rebaseState();input.onchange=()=>setSwitch(key,input.checked);controls[key]=input;box.append(input,document.createTextNode(label));return box;}

 const box=document.createElement('label');box.className='h3-cn-switch';box.style.cssText='display:inline-flex;align-items:center;gap:8px;margin:8px 16px 8px 0;color:inherit';box.append(document.createTextNode(label+'：'));
 const select=document.createElement('select');select.setAttribute('aria-label',label);for(const [v,t]of [['off','关'],['on','开']]){const o=document.createElement('option');o.value=v;o.textContent=t;select.append(o)}
 select.style.cssText='background:#2b4050;color:#fff;border:1px solid #527281;border-radius:7px;padding:7px 12px';
 select.onchange=async()=>{const desired=select.value==='on';try{setSwitch(key,desired);if(key==='pose'&&desired&&actual().pose)await preflight()}catch(e){if(key==='pose')setSwitch('pose',false);show(e.message)}};box.append(select);controls[key]=select;return box;
}
async function attach(){
 if(!active())return;const director=app.graph._nodes.find(x=>x.type==='H3SixDirectorState');
 const root=director?.__sixRoot,panel=n(159)?.__h3DashboardV3Panel;
 if(!root?.querySelector('h2')||!panel){setTimeout(attach,150);return;}
 if(panel.querySelector('.h3-cn-switches'))return;
 controls={};
 const row=document.createElement('section');row.className='h3-cn-switches';row.style.cssText='padding:10px;border:1px solid #527281;border-radius:8px;margin-bottom:10px';
 const materials=(label,id,video=false)=>{
  const node=n(id);const cell=materialCell({label,node,field:video?'file':'image',kind:video?'video':'image',getEnabled:()=>video?actual().pose:guideCount()>[983,985,988].indexOf(id),onState(ready,state,userAction){
   if(state==='loading')return;
   // A078: loading only reflects graph state; upload/clear is the authority for automatic switching.
   if(!userAction)return;
   if(video)setSwitch('pose',ready);else {
    const wasOn=guideCount()>0;
    // Compact populated keyframe slots before using the prefix-based authority.
    const ids=[983,985,988],values=ids.map(id=>n(id).__h3Missing?'':String(w(n(id),'image').value||'')).filter(Boolean);
    if(values.length&&ids.some((id,i)=>i<values.length&&!String(w(n(id),'image').value||'')))for(let i=0;i<3;i++)rememberFile(w(n(ids[i]),'image'),values[i]||'');
    setSwitch('guide',ready?values.length>0:values.length>0&&wasOn);
   }
  }});return cell;
 };
 const cells=[];
 const guide=document.createElement('div');guide.className='h3-keyframe-cells';for(let i=0;i<3;i++){const cell=materials('关键画面'+(i+1),[983,985,988][i]);cells.push(cell);guide.append(cell.row);}
 const motion=document.createElement('div');
 const kind=document.createElement('select');kind.setAttribute('aria-label','动作控制类型');
 for(const [value,label] of [['pose','Pose 姿态'],['depth','Depth 深度']]){const option=document.createElement('option');option.value=value;option.textContent=label;kind.append(option)}
 kind.value=motionKind();kind.onchange=()=>{try{const on=actual().pose;app.graph.extra.h3_motion_control_kind=kind.value;branch(POSE,on);syncDepthControl(app.graph,kind.value,on);render();app.graph.change?.()}catch(error){show(error.message)}};
 const motionCell=materials('动作视频',1061,true);cells.push(motionCell);motion.className='h3-motion-cell';motion.append(kind,motionCell.row);row.append(document.createTextNode('进阶素材'),guide,motion);const rebase=control('第 4 段重置画面（推荐开）','rebase');rebase.dataset.h3Rebase='1';{/* A077：每次挂载都会插一个新框，先移除旧框，避免出现多个未接线的重复开关 */const host=root.querySelector('.six-config-one');host?.querySelectorAll('[data-h3-rebase],[data-h3-drift]').forEach(e=>e.remove());host?.prepend(rebase);/* A080：漂移锚定（实验）开关，与第4段重置画面并列；状态存工作流 extra，关闭时提交内容与原来逐字节相同 */const drift=document.createElement('label');drift.className='h3-cn-switch';drift.dataset.h3Drift='1';drift.title='实验功能：以第1段为标准，把后续各段的亮度和细节纹理拉回；续接前缀帧不动。需从第1段开始就打开；仅建议固定机位的近景口播。关闭时完全不影响生成。';const driftInput=document.createElement('input');driftInput.type='checkbox';driftInput.setAttribute('role','switch');driftInput.setAttribute('aria-label','漂移锚定（实验）');driftInput.checked=app.graph?.extra?.h3_drift_anchor===true;driftInput.onchange=()=>{app.graph.extra=app.graph.extra||{};app.graph.extra.h3_drift_anchor=driftInput.checked;app.graph.change?.();app.graph.setDirtyCanvas?.(true,true);const wf=app.extensionManager?.workflow?.activeWorkflow;if(wf)wf.isModified=true;show(driftInput.checked?'漂移锚定已开：请从第1段开始生成，第1段会被记为标准':'漂移锚定已关')};drift.append(driftInput,document.createTextNode('漂移锚定（实验·近景口播）'));rebase.after(drift);}
 message=document.createElement('div');message.className='h3-cn-switch-message';message.setAttribute('role','status');row.append(message);
 const references=[...panel.querySelectorAll('section')].find(x=>x.querySelector('.h3v14-section-title')?.textContent.includes('参考素材'));{/* A079：T003 左栏不存在时（8207 底版总控台）按生产版位置挂载，否则整行素材开关不显示 */const left=panel.querySelector('.h3-console-left');if(left)left.append(row);else if(references)references.after(row);else panel.prepend(row);}
 // Derive switches from the loaded graph; no localStorage state is used.
 if(!String(w(n(1061),'file').value||'').trim())branch(POSE,false);
 // 2026-10-24 双控制器修复：装载时以唯一权威（N991）为准修齐派生状态，双向同步。
 // 缺 N991 的历史图不阻断面板装载（fail-safe，后续关键帧操作再 fail-closed）。
 try{reconcileGuideAxis(guideSelectorNode())}catch(error){console.warn('[H3 chinese switches] 权威同步跳过：',error.message)}
 render();await refreshMediaChoices();
 const timer=setInterval(()=>{if(!panel.isConnected){clearInterval(timer);return;}cells.forEach(c=>c.refresh());},500);
}
if(!app.__h3ChineseSwitchGuard){const original=app.graphToPrompt.bind(app);app.__h3ChineseSwitchGuard=true;app.graphToPrompt=async(...args)=>{if(active()){try{await preflight()}catch(e){show(e.message);throw e}}return original(...args)};}
app.registerExtension({name:'H3.ChineseSwitches.UIOnly',afterConfigureGraph:attach,setup(){setTimeout(attach,300)}});
