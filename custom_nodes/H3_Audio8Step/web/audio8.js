import {materialCell} from '/extensions/h3_workflow_helpers/h3_material_cell.js';
import {app} from '../../../scripts/app.js';
const N=id=>app.graph?.getNodeById(id);
const W=(id,name)=>N(id)?.widgets?.find(w=>w.name===name);
const enabled=()=>N(159)?.properties?.h3_audio_8step_converged===true;
function configureOutput(result){
  if(!enabled())return result;
  const p=result.output;
  const conditioners=['136','1106'].filter(id=>p[id]?.class_type==='MiniMaxH3ReferenceToVideo');
  if(conditioners.length>1)throw Error('音色参考需要唯一活动多参考条件节点');
  const c=p[conditioners[0]];if(!c)return result;
  const multi=String(W(647,'生成模式')?.value).startsWith('多参考');
  const backend=String(W(931,'Ref2VA 后端')?.value||'');
  const supportedMultiBackends=['稳定多参考8步','PDD多参考8步','OmniRef8（FastH3）','原版 Ref2VA（默认 / 画质优先 / 高速平衡）'];
  if(multi&&!supportedMultiBackends.includes(backend))throw Error('当前多参考后端未在候选范围内；Native 20步及未知后端保持关闭');
  if(multi&&backend==='原版 Ref2VA（默认 / 画质优先 / 高速平衡）'){
    const speed=String(W(873,'一采模式')?.value||'');
    const steps=Number(W(750,'value')?.value);
    if(speed!=='默认（原样）'||steps!==8)throw Error('原版 Ref2VA 回退只允许已验证的默认8步；画质20步及高速 LoRA 路由保持关闭');
  }
  const flags=[1,2].map(i=>multi&&!!W(1042,`audio${i}_enabled`)?.value);
  flags.push(multi&&!!W(1042,'audio3_enabled')?.value);
  const track=!!W(1042,'soundtrack_enabled')?.value;
  if(track&&(!multi||!W(150,'启用参考视频')?.value))throw Error('视频音轨参考需要启用多参考生成与参考视频');
  for(const k of Object.keys(c.inputs))if(k.startsWith('ref_audios.')||k.startsWith('ref_video_audios.'))delete c.inputs[k];
  if(!flags.some(Boolean)&&!track){delete p['1042'];return result;}
  const originalPrompt=c.inputs.prompt;
  const check={class_type:'H3Audio8ReferencePreflight',inputs:{prompt:originalPrompt,audio1_enabled:flags[0],audio2_enabled:flags[1],audio3_enabled:flags[2],soundtrack_enabled:track,role3:W(1042,'role3')?.value||''}};
  flags.forEach((on,i)=>{if(on){const id=[143,685,1047][i];check.inputs['audio'+(i+1)]=[String(id),0];c.inputs['ref_audios.ref_audio_'+i]=['1042',i];}});
  if(track){check.inputs.soundtrack=['960',1];c.inputs['ref_video_audios.ref_video_audio_0']=['1042',3];}
  p['1042']=check;c.inputs.prompt=['1042',4];
  return result;
}
function install(){
  if(!enabled())return;
  const backend=W(931,'Ref2VA 后端');
  if(backend?.options)backend.options.values=['稳定多参考8步','PDD多参考8步','OmniRef8（FastH3）','原版 Ref2VA（默认 / 画质优先 / 高速平衡）'];
  if(!app.__h3Audio8Wrapped){
    const original=app.graphToPrompt;
    app.graphToPrompt=async function(...args){
      if(enabled())for(const i of [1,2]){
        const w=W(150,`启用参考音频${i}`),v=!!W(1042,`audio${i}_enabled`)?.value;
        if(w){w.value=v;w.callback?.(v);}
      }
      return configureOutput(await original.apply(this,args));
    };
    app.__h3Audio8Wrapped=true;
  }
  const panel=N(159)?.__h3DashboardV3Panel;
  if(!panel||panel.querySelector('[data-h3-audio8]'))return;
  const section=document.createElement('section');section.dataset.h3Audio8='1';section.style.cssText='padding:12px;border:1px solid #47886d;margin:12px 0';
  if(panel.classList.contains('h3-t003')){
    if(panel.querySelector('.h3-audio8-unified'))return;
    const third=materialCell({label:'音色参考3',node:N(1047),field:'audio',kind:'audio',getEnabled:()=>!!W(1042,'audio3_enabled')?.value,onState(ready,state,userAction){if(state==='loading'||ready&&!userAction)return;const w=W(1042,'audio3_enabled');if(w){w.value=ready;w.callback?.(ready);}}});third.row.classList.add('h3-audio8-unified');panel.querySelector('.h3-console-audio')?.insertBefore(third.row,panel.querySelector('.h3-console-audio [data-node="638"]'));
    const track=document.createElement('label');track.className='h3-soundtrack';const check=document.createElement('input');check.type='checkbox';check.checked=!!W(1042,'soundtrack_enabled')?.value;check.onchange=()=>{W(1042,'soundtrack_enabled').value=check.checked;app.graph.change?.();};track.append(check,document.createTextNode('参考视频自带音轨'));panel.querySelector('.h3-console-audio [data-node="638"]')?.append(track);
    const timer=setInterval(()=>{if(!panel.isConnected){clearInterval(timer);return;}third.refresh();},500);return;
  }
  const title=document.createElement('h3');title.textContent='8步音频参考';section.append(title);
  for(const [name,label] of [['audio1_enabled','启用音色参考1'],['audio2_enabled','启用音色参考2'],['audio3_enabled','启用音色参考3'],['soundtrack_enabled','参考视频自带音轨']]){
    const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=!!W(1042,name)?.value;
    input.dataset.audioFlag=name;
    input.onchange=()=>{W(1042,name).value=input.checked;app.graph.change?.();};row.append(input,document.createTextNode(label));section.append(row,document.createElement('br'));
  }
  const file=document.createElement('input');file.type='file';file.accept='audio/*';file.setAttribute('aria-label','上传音色参考3');
  file.onchange=async()=>{const f=file.files?.[0];if(!f)return;const form=new FormData();form.append('image',f);form.append('type','input');const r=await fetch('/upload/image',{method:'POST',body:form});if(!r.ok)throw Error(await r.text());const d=await r.json();W(1047,'audio').value=(d.subfolder?d.subfolder+'/':'')+d.name;};section.append(file);
  const info=document.createElement('p');info.textContent='切换音频后自动识别时长并适配 H3 输入要求；过长自动截取，过短自动补静音，原上传文件不修改。音色开关控制是否提交。';section.append(info);panel.append(section);
  const refreshAvailability=()=>{
    const multi=String(W(647,'生成模式')?.value).startsWith('多参考');
    for(const input of section.querySelectorAll('input[data-audio-flag]')){
      input.disabled=!multi;input.checked=!!W(1042,input.dataset.audioFlag)?.value;
    }
    info.textContent=multi?'切换音频后自动识别时长并适配 H3 输入要求；过长自动截取，过短自动补静音，原上传文件不修改。音色开关控制是否提交。':'当前为 FL2VA；独立音色参考待机，切回多参考生成后可使用。';
  };
  const generation=W(647,'生成模式');
  if(generation){const callback=generation.callback;generation.callback=function(...args){const result=callback?.apply(this,args);queueMicrotask(refreshAvailability);return result;};}
  // A086：上传/更换「参考音频1/2」自动勾选对应的音色参考；清除到无文件自动取消；加载工作流时不改动。
  for(const [id,flag] of [[143,'audio1_enabled'],[685,'audio2_enabled']]){
    const file=W(id,'audio');if(!file||file.__h3Audio8AutoBound)continue;file.__h3Audio8AutoBound=true;
    const original=file.callback;
    file.callback=function(value){const result=original?.apply(this,arguments);const on=String(value??'').trim()!=='';const w=W(1042,flag);if(w&&Boolean(w.value)!==on){w.value=on;w.callback?.(on);app.graph.change?.();}refreshAvailability();return result;};
  }
  refreshAvailability();
}
app.registerExtension({name:'H3.Audio8Step.ConvergedCandidate',afterConfigureGraph(){install();setTimeout(install,500);}});

