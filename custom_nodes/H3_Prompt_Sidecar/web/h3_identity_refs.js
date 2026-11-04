import {app} from '../../../scripts/app.js';
import {api} from '../../../scripts/api.js';
import {compactRefImageSlots} from '/extensions/h3_workflow_helpers/h3_workflow_registry_core.js';
import {guideImageURL} from './h3_six_guides.js?v=20261017guide3';
const PREFIX='T009_IDENTITY_';
export function identityConfig(){return structuredClone(app.graph?.extra?.h3_identity_refs||{version:1,shared:[],segments:{}})}
export function effectiveIdentity(config,index){const s=config?.segments?.[index];return s?.mode==='off'?[]:s?.mode==='custom'?(s.images||[]).filter(Boolean):(config?.shared||[]).filter(Boolean)}
function sourceNode(graph){const nodes=Object.entries(graph).filter(([,n])=>n.class_type==='MiniMaxH3ReferenceToVideo');if(nodes.length!==1)throw Error('人物容貌参考：需要唯一 Ref2VA / OmniRef8 路线');return nodes[0]}
const slots=n=>Object.keys(n.inputs||{}).filter(k=>/^ref_images\.ref_image_\d+$/.test(k)).sort((a,b)=>Number(a.split('_').pop())-Number(b.split('_').pop()));
export function appendIdentity(graph,images){
 if(!images.length)return [];
 if(images.length>4)throw Error('人物容貌参考最多4张，请清除多余图片后重试');
 const [,cond]=sourceNode(graph),existing=slots(cond);
 if(existing.length+images.length>9)throw Error(`人物容貌参考超出9槽：现有${existing.length} + 容貌${images.length}，请清除多余图片后重试`);
 // Use the established reference-image resize recipe, retaining generation-size links.
 const template=graph['656']?.class_type==='ImageResizeKJv2'?graph['656']:{class_type:'ImageResizeKJv2',inputs:{width:structuredClone(cond.inputs.width),height:structuredClone(cond.inputs.height),upscale_method:'lanczos',keep_proportion:'crop',pad_color:'0, 0, 0',crop_position:'center',divisible_by:32,device:'cpu'}};
 let last=existing.length?Math.max(...existing.map(k=>Number(k.split('_').pop()))):-1;
 images.forEach((image,i)=>{
  if(!image.source||!/^[a-f0-9]{64}$/i.test(image.source_sha256||''))throw Error('人物容貌参考未校验，请重新上传后重试');
  const id=PREFIX+i,resize=id+'_RESIZE';if(graph[id]||graph[resize])throw Error('人物容貌参考重复接入');
  graph[id]={class_type:'LoadImage',inputs:{image:image.source}};
  graph[resize]=structuredClone(template);graph[resize].inputs.image=[id,0];delete graph[resize]._meta;
  cond.inputs['ref_images.ref_image_'+(++last)]=[resize,0];
 });
 compactRefImageSlots(graph,true);
 return slots(cond).map((key,i)=>[cond.inputs[key],i+1]).filter(([link])=>String(link?.[0]).startsWith(PREFIX)).map(([,n])=>n);
}
export function identitySuffix(pictures){return pictures.length?'\n人物容貌以 '+pictures.map(n=>`<Picture ${n}>`).join('、')+'为准。':''}
async function checkImage(image){
 const r=await api.fetchApi('/h3/six-identity/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(image)});
 const v=await r.json();if(!r.ok)throw Error('人物容貌参考：'+(v.error||r.status)+'；请替换图片后重试');return v.image;
}
export async function prepareIdentity(graph,index,config=identityConfig()){
 const images=effectiveIdentity(config,index);for(const image of images)await checkImage(image);
 const pictures=appendIdentity(graph,images);return {images,pictures,suffix:identitySuffix(pictures)};
}
export function mountIdentityRail(rail,node,ui){
 if(!node.__identityRail){
  const config=identityConfig(),shared=document.createElement('section'),cards=[];
  shared.className='t009-shared';shared.innerHTML='<b>人物容貌参考</b><small>共用 · 默认 S1–S6</small>';
  const style=document.createElement('style');style.textContent='.s2-console .s2-rail{grid-template-columns:190px repeat(6,minmax(0,1fr));align-items:start}.s2-console .s2-tile .s2-tile-run{position:static;width:100%;margin:4px 0;display:block}.t009-shared,.t009-segment{font-size:12px;min-width:0}.t009-shared{border:1px solid #6689b0;border-radius:7px;padding:6px;background:#182333}.t009-shared>small{display:block}.t009-images[hidden]{display:none}.t009-images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px}.t009-image{min-width:0;display:flex;flex-direction:column;gap:2px}.t009-image img{width:100%;height:46px;object-fit:contain}.s2-console .t009-image button{font-size:11px;min-height:22px;padding:0 2px}.t009-image small{font-size:10px;white-space:normal;overflow-wrap:anywhere}.s2-console .t009-segment select{width:100%;font-size:11px;padding:0;min-height:23px}.t009-error{background:#682e38;color:#fff;padding:7px;white-space:normal;grid-column:1/-1}.t009-error[hidden]{display:none}';node.__sixRoot.append(style);
  const error=document.createElement('div');error.className='t009-error';error.setAttribute('role','alert');error.hidden=true;
  const retry=document.createElement('button');retry.textContent='重试校验';const message=document.createElement('span');error.append(message,retry);
  function fail(e){message.textContent=e.message+' ';error.hidden=false}
  function changed(index){app.graph.extra||={};app.graph.extra.h3_identity_refs=structuredClone(config);ui.cards.forEach((c,i)=>{if(index===i||index===null&&(!config.segments[i]||config.segments[i].mode==='shared'))c.status.textContent='已修改'});node.__sixRoot.dispatchEvent(new Event('sixchange'));app.graph.setDirtyCanvas(true,true);refresh().catch(fail)}
  function imageEditor(parent,getImages,setImages,index){
   const grid=document.createElement('div');grid.className='t009-images';parent.append(grid);
   for(let slot=0;slot<4;slot++){
    const cell=document.createElement('div');cell.className='t009-image';grid.append(cell);
    const thumb=document.createElement('img'),label=document.createElement('small'),upload=document.createElement('button'),clear=document.createElement('button'),input=document.createElement('input');
    thumb.alt='容貌参考'+(slot+1);input.type='file';input.accept='image/*';input.hidden=true;upload.type=clear.type='button';upload.textContent='上传';clear.textContent='清除';cell.append(thumb,label,upload,clear,input);
    let pending=null,busy=false;
    function draw(){const image=getImages()[slot];thumb.hidden=!image;clear.hidden=!image;thumb.src=image?guideImageURL(image.source):'';upload.textContent=image?'替换':'上传';label.textContent=image?'编号校验中…':'空位';}
    async function send(file){if(busy)return;busy=true;upload.disabled=clear.disabled=true;pending=file;
     try{const bytes=await file.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const form=new FormData();form.append('image',file,'identity_'+hash+'.'+(file.name.split('.').pop()||'png'));form.append('subfolder','h3_identity_refs');form.append('overwrite','false');
      const r=await api.fetchApi('/upload/image',{method:'POST',body:form}),v=await r.json();if(!r.ok)throw Error('容貌图片上传失败，请点击重试上传：'+(v.error||r.status));
      const image=await checkImage({source:[v.subfolder,v.name].filter(Boolean).join('/'),source_sha256:hash});
      const images=[...getImages()];images[slot]=image;setImages(images);pending=null;error.hidden=true;draw();changed(index);
     }catch(e){fail(e);upload.textContent='重试上传'}finally{busy=false;upload.disabled=clear.disabled=false;input.value=''}
    }
    upload.onclick=e=>{e.stopPropagation();pending?send(pending):input.click()};input.onchange=()=>{if(input.files[0])send(input.files[0])};clear.onclick=e=>{e.stopPropagation();const images=[...getImages()];images[slot]=null;setImages(images);draw();changed(index)};
    draw();cell.__draw=draw;cell.__picture=(n)=>{if(getImages()[slot])label.textContent=n||'未使用'};
   }
   return grid;
  }
  const sharedGrid=imageEditor(shared,()=>config.shared,images=>config.shared=images,null);
  for(let i=0;i<6;i++){
   const box=document.createElement('section');box.className='t009-segment';box.onclick=e=>e.stopPropagation();
   const select=document.createElement('select');select.setAttribute('aria-label',`S${i+1} 容貌`);select.innerHTML='<option value="shared">容貌：沿用共用组</option><option value="custom">容貌：本段单独换图</option><option value="off">容貌：本段不用</option>';box.append(select);
   const state=config.segments[i]||={mode:'shared',images:[]};select.value=state.mode;
   const grid=imageEditor(box,()=>state.images,images=>state.images=images,i);grid.hidden=state.mode!=='custom';
   select.onchange=()=>{state.mode=select.value;grid.hidden=state.mode!=='custom';changed(i)};cards.push(box);
  }
  let refreshing=false;
  async function refresh(){if(refreshing)return;refreshing=true;try{
   const output=(await app.graphToPrompt()).output;
   const labels=[];
   for(let i=0;i<6;i++){const images=effectiveIdentity(config,i).filter(Boolean);const pictures=appendIdentity(structuredClone(output),images);labels[i]=pictures;let k=0;cards[i].querySelectorAll('.t009-image').forEach(c=>c.__picture(stateMode(i)==='custom'&&config.segments[i].images[Array.from(c.parentNode.children).indexOf(c)]?'→ Picture '+pictures[k++]:'未使用'))}
   let k=0;sharedGrid.querySelectorAll('.t009-image').forEach((c,j)=>{if(config.shared[j]){const users=Array.from({length:6},(_,i)=>i).filter(i=>stateMode(i)==='shared');const values=[...new Set(users.map(i=>labels[i][k]))];c.__picture(users.length?'→ Picture '+values.join(' / '):'未使用');k++}});
   error.hidden=true;
  }finally{refreshing=false}}
  function stateMode(i){return config.segments[i]?.mode||'shared'}
  retry.onclick=()=>{Promise.all([...config.shared,...Object.values(config.segments).flatMap(s=>s.images||[])].filter(Boolean).map(checkImage)).then(refresh).catch(fail)};
  node.__identityRail={shared,cards,error,refresh};
  let previousRefs='';const timer=setInterval(()=>{if(!app.graph._nodes.includes(node)){clearInterval(timer);return}const signature=JSON.stringify(app.graph._nodes.filter(n=>['LoadImage','LoadImageCrop','MiniMaxH3ReferenceToVideo','Any Switch (rgthree)'].includes(n.type)).map(n=>[n.id,n.mode,n.widgets?.map(w=>[w.name,w.value]),n.inputs?.map(v=>v.link)]));if(previousRefs&&signature!==previousRefs)refresh().catch(fail);previousRefs=signature},1200);
  node.__sixRoot.addEventListener('sixidentityerror',e=>fail(Error(e.detail)));
  node.__sixRoot.addEventListener('change',e=>{if(!e.target.closest('.t009-shared,.t009-segment'))refresh().catch(fail)});
  refresh().catch(fail);
 }
 const controller=node.__identityRail;rail.prepend(controller.shared);rail.querySelectorAll('.s2-tile').forEach((tile,i)=>tile.append(controller.cards[i]));rail.append(controller.error);
}
