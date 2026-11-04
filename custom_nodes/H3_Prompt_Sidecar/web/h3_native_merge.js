// Settings/status only. All gates, submission and completion live in 8197.
const labels={NOT_STARTED:'等待六段完成',DISABLED:'自动合并已关闭',WAITING_6_OF_6:'等待六段完成',SUBMITTED:'正在合并',SUCCESS:'已合并',ERROR:'合并失败',FAILED:'合并失败'};
export async function beforeSixExecution(root){await root.__nativeMergeBegin;}
export async function installNativeMerge(root,getContext){
  if(root.__h3NativeMergeSwitch)return;
  root.__h3NativeMergeSwitch=true;
  const {api}=await import('../../../scripts/api.js');
  const box=document.createElement('section');box.className='h3-native-merge-controls';box.style.cssText='padding:10px 12px;margin:8px 0;border:1px solid #527281;border-radius:7px;color:inherit';
  const title=document.createElement('strong');title.textContent='六段视频合并';
  const label=document.createElement('label');label.style.marginLeft='14px';
  const check=document.createElement('input');check.type='checkbox';check.setAttribute('role','switch');check.setAttribute('aria-label','六段完成后自动合并');check.disabled=true;
  label.append(check,document.createTextNode(' 六段完成后自动合并'));
  const status=document.createElement('span');status.style.marginLeft='14px';status.textContent='读取设置…';
  const retry=document.createElement('button');retry.type='button';retry.textContent='手动合并';
  const confirmLost=document.createElement('button');confirmLost.type='button';confirmLost.textContent='确认旧任务已失效，重新合并';confirmLost.hidden=true;box.append(title,label,status,retry,confirmLost);
  root.querySelector('.six-common')?.after(box);
  const preview=document.createElement('div');preview.className='six-merged-preview';
  const summary=document.createElement('span');summary.textContent='六段完成后自动合并，成片在这里播放';
  const open=document.createElement('a');open.textContent='打开合并视频';open.target='_blank';open.rel='noopener';
  const player=document.createElement('video');player.controls=true;player.preload='metadata';player.setAttribute('aria-label','六段合并视频');player.style.cssText='display:block;width:100%;max-height:320px;margin-top:8px';
  player.hidden=true;open.hidden=true;preview.append(summary,open,player);box.append(preview);root.querySelector('.six-task-details')?.append(label);root.querySelector('.six-merge-host')?.append(box);
  const {installFreeMerge}=await import('./h3_free_merge.js?v=20261029t015free3');
  installFreeMerge(root,box);
  let lastState=null,manualError='';
  const show=s=>{
    lastState=s;
    const badge=root.querySelector('.six-merge-badge');if(badge)badge.textContent='合并：'+(labels[s.merge_status]||s.merge_status);check.checked=s.auto_merge_enabled;status.textContent=(labels[s.merge_status]||s.merge_status)+(s.merge_output?' · '+s.merge_output.filename:'');
    status.title=s.merge_error||'';
    // A088：续接链不一致时不合并，原因直接显示在合并状态上。
    const waiting=s.merge_status==='WAITING_6_OF_6'&&s.merge_wait_reason;
    if(waiting){status.textContent='暂不合并：'+s.merge_wait_reason;status.title=s.merge_wait_reason;if(badge)badge.textContent='合并：等待重跑';}
    if(manualError||s.merge_error)status.textContent+='：'+(manualError||s.merge_error);
    status.style.color=waiting?'#e0a030':'';
    const ref=s.merge_status==='SUCCESS'&&s.merge_output;
    if(ref?.type==='output'&&typeof ref.filename==='string'&&typeof ref.subfolder==='string'){
      const source=api.apiURL('/view?'+new URLSearchParams({filename:ref.filename,subfolder:ref.subfolder,type:ref.type}));
      if(player.dataset.source!==source){player.dataset.source=source;player.src=source;open.href=source;}
      summary.textContent='最新合并成片';preview.hidden=false;player.hidden=false;open.hidden=false;const latest=root.querySelector('.six-latest-output');if(latest){latest.href=source;latest.textContent='最新输出：'+ref.filename;}
    }else if(player.dataset.source)summary.textContent='上次合并视频（当前结果尚未完成）';
  };
  let sequence=0,refreshing=false;
  const request=async data=>{
    const project=getContext().project_id,own=++sequence;
    const response=await api.fetchApi('/h3/six/native-merge'+(data?'':'?project_id='+encodeURIComponent(project)),data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:project,...data})}:{});
    const result=await response.json();if(!response.ok)throw Error(result.error||'读取自动合并设置失败');if(own===sequence&&getContext().project_id===project)show(result);return result;
  };
  check.onchange=async()=>{check.disabled=true;try{await request({action:'settings',auto_merge_enabled:check.checked})}catch(error){status.textContent=error.message}finally{check.disabled=false}};
  const manual=async confirm_lost=>{const group_id=lastState?.group_id;manualError='';confirmLost.hidden=true;if(!group_id){manualError='没有当前合并组，请先生成六段';status.textContent='手动合并失败：'+manualError;return}retry.disabled=true;confirmLost.disabled=true;try{const result=await request({action:'manual',group_id,confirm_lost});if(result.merge_error){manualError=result.merge_error;status.textContent='手动合并失败：'+manualError}}catch(error){manualError=error.message;status.textContent='手动合并失败：'+manualError;confirmLost.hidden=!manualError.includes('旧合并任务状态不可确认')}finally{retry.disabled=false;confirmLost.disabled=false}};
  retry.onclick=()=>manual(false);
  confirmLost.onclick=()=>{if(globalThis.confirm('请确认旧合并任务已经失效。确认后会重新提交合并。'))void manual(true)};
  root.addEventListener('sixchain',event=>{
    if(event.detail.type==='START'){
      const context=getContext();
      root.__nativeMergeBegin=(async()=>{
        // A resumed batch belongs to its already accepted first segment.
        // Generating a new UUID here would discard that segment from 6-of-6.
        const previous=event.detail.first>1&&!context.group_id?await request():null;
        if(getContext().project_id!==context.project_id)throw Error('项目已切换，请重新开始续跑');
        const graph=(await globalThis.app.graphToPrompt()).output;
        return request({action:'begin',group_id:context.group_id||previous?.group_id||null,graph});
      })().catch(error=>{status.textContent='自动合并未就绪：'+error.message;});
    }
  });
  const onState=event=>{const context=getContext();if(root.isConnected&&event.detail.project_id===context.project_id&&(!context.group_id||event.detail.group_id===context.group_id))show(event.detail)};
  const refresh=async()=>{if(refreshing||!root.isConnected)return;refreshing=true;try{const project=getContext().project_id,s=await request();if(s.merge_status==='SUBMITTED'&&s.group_id&&getContext().project_id===project)await request({action:'reconcile',group_id:s.group_id})}catch(error){status.title='合并状态暂未同步：'+error.message}finally{refreshing=false}};
  api.addEventListener('h3_native_merge_state',onState);api.addEventListener('reconnected',refresh);
  const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);api.removeEventListener('h3_native_merge_state',onState);api.removeEventListener('reconnected',refresh);return}void refresh()},3000);
  root.querySelector('.six-project')?.addEventListener('change',()=>{void request().catch(error=>{status.textContent=error.message})});
  try{await request();check.disabled=false}catch(error){status.textContent=error.message}
}
export function activateNativeMergeHooks(app){
  const attach=async()=>{for(let i=0;i<25;i++){const node=app.graph?._nodes.find(n=>n.type==='H3SixDirectorState');if(!node)return;if(node.__sixUI&&node.__sixRoot){await installNativeMerge(node.__sixRoot,()=>({group_id:node.__sixUI.group?.id||null,project_id:node.__sixUI.executionSnapshot().runtime_project_id||node.__sixUI.executionSnapshot().project_id}));return;}await new Promise(r=>setTimeout(r,100));}};
  if(!app.__h3NativeMergeSwitchHooks){app.__h3NativeMergeSwitchHooks=true;app.registerExtension({name:'H3.NativeMergeSwitch',afterConfigureGraph:attach});}return attach();
}
