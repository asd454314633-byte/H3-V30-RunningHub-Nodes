// Merge the videos currently displayed in the six cards, in card order.
export async function beforeSixExecution() {}
export async function installNativeMerge(root,getContext){
  if(root.__h3NativeMergeSwitch)return;
  root.__h3NativeMergeSwitch=true;
  const box=document.createElement('section');box.className='h3-native-merge-controls';
  const button=document.createElement('button');button.type='button';button.textContent='手动合并当前视频';
  const status=document.createElement('span');status.textContent='按 S1 至 S6 顺序合并已有视频';
  const preview=document.createElement('div');preview.className='six-merged-preview';
  const summary=document.createElement('span');summary.textContent='手动合并后在这里播放';
  const open=document.createElement('a');open.textContent='打开合并视频';open.target='_blank';open.rel='noopener';open.hidden=true;
  const player=document.createElement('video');player.controls=true;player.hidden=true;player.setAttribute('aria-label','合并视频');
  preview.append(summary,open,player);box.append(button,status,preview);root.querySelector('.six-merge-host')?.append(box);
  const badge=root.querySelector('.six-merge-badge');if(badge)badge.textContent='合并：手动';
  const request=async(url,options)=>{const response=await fetch(url,options);const data=await response.json();if(!response.ok)throw Error(data.error||'合并请求失败');return data};
  let jobId=null,timer=null;
  async function poll(){
    try{
      const job=await request('/h3/free-merge/status');
      if(job.id!==jobId)throw Error('合并任务身份已变化');
      status.textContent=job.status+(job.error?'：'+job.error:'');
      if(job.status==='排队'||job.status==='处理中'){timer=setTimeout(poll,1500);return}
      button.disabled=false;
      if(job.status==='完成'){
        const src='/view?'+new URLSearchParams({filename:job.filename,subfolder:job.subfolder,type:'output'});
        player.src=src;open.href=src;player.hidden=false;open.hidden=false;summary.textContent='最新合并成片';
        const latest=root.querySelector('.six-latest-output');if(latest){latest.href=src;latest.textContent='最新输出：'+job.filename}
      }
    }catch(error){button.disabled=false;status.textContent='合并状态读取失败：'+error.message}
  }
  button.onclick=async()=>{
    const node=globalThis.app?.graph?._nodes?.find(n=>n.__sixRoot===root);
    const videos=node?.__sixUI?.videoSnapshot?.().filter(Boolean)||[];
    if(!videos.length){status.textContent='当前六段框没有视频';return}
    button.disabled=true;status.textContent='正在准备合并';
    try{const job=await request('/h3/free-merge/current',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videos})});jobId=job.id;await poll()}
    catch(error){button.disabled=false;status.textContent='合并失败：'+error.message}
  };
  const cleanup=setInterval(()=>{if(!root.isConnected){clearInterval(cleanup);if(timer)clearTimeout(timer)}},3000);
}
export function activateNativeMergeHooks(app){
  const attach=async()=>{for(let i=0;i<25;i++){const node=app.graph?._nodes.find(n=>n.type==='H3SixDirectorState');if(!node)return;if(node.__sixUI&&node.__sixRoot){await installNativeMerge(node.__sixRoot,()=>({project_id:node.__sixUI.executionSnapshot().runtime_project_id}));return}await new Promise(r=>setTimeout(r,100))}};
  if(!app.__h3NativeMergeSwitchHooks){app.__h3NativeMergeSwitchHooks=true;app.registerExtension({name:'H3.NativeMergeSwitch',afterConfigureGraph:attach})}return attach();
}
