import {api} from '../../../scripts/api.js';

// One file cell for every material; the existing node/widget remains the owner.
export function materialCell({label,node,field,kind='image',getEnabled=()=>true,onState=()=>{}}){
 const row=document.createElement('div');row.className='h3-material-cell';row.dataset.node=String(node?.id);row.dataset.kind=kind;
 const title=document.createElement('span');title.className='h3-material-title';title.textContent=label;
 const target=document.createElement('div');target.className='h3-material-target';target.tabIndex=0;target.setAttribute('role','button');target.setAttribute('aria-label',label+'：点击或拖入');
 const prompt=document.createElement('span');prompt.className='h3-material-placeholder';prompt.textContent='点击或拖入';
 const media=document.createElement(kind==='image'?'img':kind);media.className='h3-material-media';media.hidden=true;
 if(kind==='image')media.alt='';else{media.controls=true;media.preload='metadata';media.playsInline=true;}
 const filename=document.createElement('span');filename.className='h3-material-filename';
 const clear=document.createElement('button');clear.type='button';clear.className='h3-material-clear';clear.textContent='×';clear.setAttribute('aria-label','清除'+label);clear.hidden=true;
 const input=document.createElement('input');input.type='file';input.hidden=true;input.accept=kind==='image'?'image/*':kind==='audio'?'audio/*':'video/*';input.setAttribute('aria-label','上传'+label);
 target.append(prompt,media);const disabled=document.createElement('button');disabled.type='button';disabled.onclick=e=>{e.preventDefault();e.stopPropagation();userChange=true;node.__h3KeepSavedDisabled=false;onState(true,'ready',true);disabled.hidden=true;userChange=false;};disabled.className='h3-material-disabled';disabled.textContent='已停用 · 点击启用';disabled.hidden=true;row.append(title,target,filename,clear,input,disabled);
 const file=node?.widgets?.find(w=>w.name===field)||node?.widgets?.find(w=>kind==='video'?w.name==='file':kind==='audio'?w.name==='audio':w.name==='image');let current=null,revision=-1,sequence=0,userChange=false;
 const write=value=>{if(!file)return;if(value&&Array.isArray(file.options?.values)&&!file.options.values.includes(value))file.options.values.push(value);file.value=value;file.callback?.(value);node.graph?.setDirtyCanvas?.(true,true);};
 const setState=(state)=>{row.dataset.state=state;node.__h3Missing=state==='missing'||state==='empty';clear.hidden=state!=='ready';media.hidden=state!=='ready';prompt.hidden=state==='ready';prompt.textContent=state==='missing'?'文件丢失，点击重新选择':state==='loading'?'正在读取…':'点击或拖入';onState(state==='ready',state,userChange);disabled.hidden=state!=='ready'||getEnabled();if(state==='ready')userChange=false;};
 const refresh=()=>{
  const value=String(file?.value||'').trim(),rev=node?.__h3MediaRevision||0;
  if(value===current&&rev===revision)return;current=value;revision=rev;const own=++sequence;media.hidden=true;media.removeAttribute('src');
  filename.textContent='';filename.title=value;
  if(!value||/^(undefined|null|none|未选择)$/i.test(value)){setState('empty');return;}
  setState('loading');
  const parts=value.replace(/\s+\[(input|output|temp)\]$/i,'').replaceAll('\\','/').split('/'),name=parts.pop();
  const url=api.apiURL('/view?'+new URLSearchParams({filename:name,subfolder:parts.join('/'),type:'input',h3_preview_revision:String(rev)}));
  media.onload=media.onloadedmetadata=()=>{if(own!==sequence)return;filename.textContent=name+(kind!=='image'&&Number.isFinite(media.duration)?' · '+media.duration.toFixed(1)+' 秒':'');setState('ready');};
  media.onerror=()=>{if(own!==sequence)return;media.hidden=true;media.removeAttribute('src');filename.textContent='';setState('missing');};
  media.src=url;
 };
 clear.onclick=e=>{e.stopPropagation();userChange=true;node.__h3KeepSavedDisabled=false;node.__h3Missing=false;write('');current=null;refresh();};
 const pick=e=>{if(row.dataset.state==='ready'&&!getEnabled()){e.preventDefault();userChange=true;node.__h3KeepSavedDisabled=false;onState(true,'ready',true);disabled.hidden=true;userChange=false;return;}if(e.target.closest('video,audio,button,input'))return;e.preventDefault();input.click();};
 target.onclick=pick;target.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};
 async function upload(fileValue){if(!fileValue)return;try{const form=new FormData();form.append('image',fileValue);form.append('type','input');form.append('overwrite','false');const response=await api.fetchApi('/upload/image',{method:'POST',body:form});if(!response.ok)throw Error('上传失败');const result=await response.json();userChange=true;node.__h3KeepSavedDisabled=false;node.__h3Missing=false;node.__h3MediaRevision=(node.__h3MediaRevision||0)+1;write([result.subfolder,result.name].filter(Boolean).join('/'));refresh();}catch(error){prompt.textContent=error.message;}}
 input.onchange=async()=>{try{await upload(input.files?.[0]);}finally{input.value='';}};target.ondragover=e=>{e.preventDefault();e.stopPropagation();};target.ondrop=e=>{e.preventDefault();e.stopPropagation();upload(e.dataTransfer?.files?.[0]);};
 refresh();return {row,refresh,media};
}
