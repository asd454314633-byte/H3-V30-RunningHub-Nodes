/* six_console_v2_core.js — 纯函数层（T004）
 * 来源：_总指挥/六段提示词操作台/prototype.html（总指挥设计，2026-10-26）。
 * 除 search 的数据入参由模块全局 SEGS 改为显式入参外，全部函数原样复制，不改写。
 * 供 six_console_v2.js（浏览器）与 tests/test_six_console_v2.mjs（node）共同使用。
 */

/* ===================== 小节常量 ===================== */
export const SECTIONS=[
  ["subject_definitions","人物与素材"],["summary","本段概述"],["retention_analysis","哪些内容保持不变"],
  ["detailed_description","镜头内容"],["overall_soundscape","环境与声音"],["non_diegetic_music","背景音乐"]];
export const SEC_NAME={...Object.fromEntries(SECTIONS),integrated_multimodal_description:"镜头内容",camera:"镜头怎么拍",motion_constraints:"动作要求",visual_consistency:"画面保持一致"};
export const SEC_HELP={subject_definitions:'说明人物、场景和参考素材分别是什么。',summary:'概括这一段要发生什么。',retention_analysis:'说明哪些人物、物品和场景需要保持不变。',detailed_description:'逐个描述镜头中发生的画面和动作。',integrated_multimodal_description:'逐个描述镜头中发生的画面和动作。',camera:'说明摄影机的角度、移动和画面切换。',motion_constraints:'说明动作如何进行以及要避免什么。',visual_consistency:'说明人物外观、服装和场景应如何保持一致。',overall_soundscape:'说明环境声、台词和其他画面内声音。',non_diegetic_music:'说明背景音乐的风格或是否需要音乐。'};
export const sectionName=key=>SEC_NAME[key]||'其他设置';
export const sectionHelp=key=>SEC_HELP[key]||'补充这一段的其他画面或声音要求。';
export const SEC_KEYS=SECTIONS.map(s=>s[0]);
export const SHOT_KEYS=new Set(["detailed_description","integrated_multimodal_description"]);

/* ===================== 解析 / 写回 ===================== */
const SEC_RE=/^([a-z][a-z0-9_]{2,40}):[ \t]*\r?\n?/gm;
export function parse(text){
  const heads=[];let m;SEC_RE.lastIndex=0;
  while((m=SEC_RE.exec(text)))heads.push({key:m[1],start:m.index,bodyStart:m.index+m[0].length,header:m[0]});
  const pre=heads.length?text.slice(0,heads[0].start):text;
  const secs=heads.map((h,i)=>{const end=i+1<heads.length?heads[i+1].start:text.length;const raw=text.slice(h.bodyStart,end);const body=raw.replace(/\s+$/,'');return {key:h.key,header:h.header,start:h.start,bodyStart:h.bodyStart,end,body,tail:raw.slice(body.length)};});
  return {pre,secs};
}
export function serialize(p){return p.pre+p.secs.map(s=>s.header+s.body+s.tail).join('');}
// Full editor translates headers only; source text and underlying keys stay intact.
export function displayFull(text){
  const parsed=parse(text), counts=new Map();
  for(const s of parsed.secs){const n=sectionName(s.key);counts.set(n,(counts.get(n)||0)+1)}
  const seen=new Map(),headers=[];let shown=parsed.pre;
  for(const s of parsed.secs){
    const name=sectionName(s.key),n=(seen.get(name)||0)+1;seen.set(name,n);
    const label=counts.get(name)>1?`${name}（${n}）`:name;
    const rawPrefix=s.key+':',displayPrefix=label+'：',start=shown.length;
    shown+=displayPrefix+s.header.slice(rawPrefix.length)+s.body+s.tail;
    headers.push({key:s.key,label,rawStart:s.start,rawBodyStart:s.bodyStart,displayStart:start,displayBodyStart:start+displayPrefix.length+s.header.slice(rawPrefix.length).length});
  }
  return {text:shown,headers};
}
// Free editing (select-all, delete, paste a whole new prompt): any line that starts with a
// known Chinese section label + "：" goes back to its English key; English keys pasted in
// stay as they are; everything else is kept verbatim. Never rejects an edit.
const NAME_KEY={};
for(const [key,name] of Object.entries(SEC_NAME))if(!(name in NAME_KEY))NAME_KEY[name]=key;
export function restoreFull(shown,headers){
  const byLabel=new Map(headers.map(h=>[h.label,h.key]));
  return shown.replace(/^([^\n：:]{1,24})：/gm,(whole,label)=>{
    const key=byLabel.get(label)??NAME_KEY[label.replace(/（\d+）$/,'')];
    return key?key+':':whole;
  });
}
export function fullOffset(rawOffset,headers){
  let delta=0;
  for(const h of headers){
    if(rawOffset<h.rawStart)break;
    if(rawOffset<h.rawBodyStart)return h.displayStart+Math.min(rawOffset-h.rawStart,h.displayBodyStart-h.displayStart);
    delta=h.displayBodyStart-h.rawBodyStart;
  }
  return rawOffset+delta;
}
const SHOT_RE=/\[Shot\s+(\d+)\]|^(\d{2}:\d{2}(?:\.\d{1,3})?)\s*-\s*(\d{2}:\d{2}(?:\.\d{1,3})?):/gm;
export function splitShots(body){
  const marks=[];let m;SHOT_RE.lastIndex=0;
  while((m=SHOT_RE.exec(body))){marks.push({i:m.index,no:m[1]?+m[1]:marks.length+1,range:m[2]?m[2]+'–'+m[3]:null});}
  // A leading [Shot 1] immediately followed by explicit ranges is a heading,
  // not a second empty shot.
  if(marks.length>1&&!marks[0].range&&marks[1].range&&/^\[Shot\s+1\]\s*$/i.test(body.slice(marks[0].i,marks[1].i)))marks.shift();
  if(marks.some(x=>x.range))marks.forEach((x,i)=>{if(x.range)x.no=i+1});
  if(!marks.length)return {intro:body,shots:[]};
  const intro=body.slice(0,marks[0].i);
  const shots=marks.map((k,j)=>{const text=body.slice(k.i,j+1<marks.length?marks[j+1].i:body.length);let time=k.range;if(!time){const t=/At\s+(\d{2}:\d{2}(?:\.\d{1,3})?)/.exec(text.slice(0,60));time=t?t[1]:(k.no===1?'00:00':'');}return {no:k.no,time,text};});
  return {intro,shots};
}
export function joinShots(intro,shots){return intro+shots.map(s=>s.text).join('');}
export function validateShotTimes(rows,duration,shotCount){
  if(!Array.isArray(rows)||!rows.length)return null;
  if(rows.length!==shotCount||!Number.isFinite(duration)||duration<=0)throw Error('镜头数量或本段时长发生变化，请重新填写时间');
  const out=rows.map((row,i)=>{
    const start=String(row?.start??'').trim(),end=String(row?.end??'').trim();
    if(!/^\d+(?:\.\d)?$/.test(start)||!/^\d+(?:\.\d)?$/.test(end))throw Error(`镜头 ${i+1} 请填写起止秒数，精确到 0.1 秒`);
    const a=Math.round(Number(start)*10),b=Math.round(Number(end)*10),limit=Math.round(duration*10);
    if(a<0||b>limit)throw Error(`镜头 ${i+1} 超出本段 ${duration} 秒`);
    if(b<=a)throw Error(`镜头 ${i+1} 结束时间必须大于开始时间`);
    return {start:a,end:b};
  });
  if(out[0].start!==0||out.at(-1).end!==Math.round(duration*10))throw Error('镜头时间须从 0 秒连续覆盖到本段结束');
  for(let i=1;i<out.length;i++){
    if(out[i].start<out[i-1].end)throw Error(`镜头 ${i} 和 ${i+1} 时间重叠`);
    if(out[i].start>out[i-1].end)throw Error(`镜头 ${i} 和 ${i+1} 时间不连续`);
  }
  return out;
}
export function applyShotTimes(text,rows,duration){
  if(!Array.isArray(rows)||!rows.length)return text;
  const p=parse(text),sections=p.secs.filter(s=>SHOT_KEYS.has(s.key));
  if(sections.length!==1)throw Error('无法唯一识别镜头分区，请检查后再提交');
  const sec=sections[0],parts=splitShots(sec.body),times=validateShotTimes(rows,duration,parts.shots.length);
  const fmt=t=>`${String(Math.floor(t/600)).padStart(2,'0')}:${String(Math.floor((t%600)/10)).padStart(2,'0')}.${String(t%10)}00`;
  let intro=parts.intro.replace(/\[Shot\s+1\]\s*$/i,'');
  sec.body=intro+parts.shots.map((shot,i)=>{
    let body=shot.text.replace(/^\[Shot\s+\d+\]/i,'').replace(/^\d{2}:\d{2}(?:\.\d{1,3})?\s*-\s*\d{2}:\d{2}(?:\.\d{1,3})?:/,'');
    body=body.replace(/^\s*At\s+\d{2}:\d{2}(?:\.\d{1,3})?\s*,?/i,'');
    return `[Shot ${i+1}]${i?` At ${fmt(times[i].start)},`:''} ${body.trim()}`;
  }).join('\n');
  return serialize(p);
}
const D_RE=/(<d>\[)([^\]]*)(\]\s*)([\s\S]*?)(<\/d>)/g;
export function dialogues(seg){
  const text=seg.en,p=parse(text),dd=p.secs.find(s=>SHOT_KEYS.has(s.key));
  let shotsAbs=[];
  if(dd){const {shots,intro}=splitShots(dd.body);let off=dd.bodyStart+intro.length;shotsAbs=shots.map(s=>{const r={no:s.no,time:s.time,start:off,end:off+s.text.length};off+=s.text.length;return r;});}
  const out=[];let m;D_RE.lastIndex=0;
  while((m=D_RE.exec(text))){
    const langStart=m.index+m[1].length,textStart=langStart+m[2].length+m[3].length;
    const before=text.slice(Math.max(0,m.index-220),m.index);
    const sx=[...before.matchAll(/\((S\d+)\)/g)].pop(),sb=[...before.matchAll(/<Subject (\d+)>/g)].pop();
    const shot=shotsAbs.find(s=>m.index>=s.start&&m.index<s.end);
    out.push({seg:seg.no,shot:shot?shot.no:null,time:shot?shot.time:'',speaker:(sx?sx[1]:'?')+(sb?' · 主体'+sb[1]:''),lang:m[2],text:m[4],langStart,langEnd:langStart+m[2].length,textStart,textEnd:textStart+m[4].length});
  }
  return out;
}

/* ===================== 粘贴导入：规范化与分段 ===================== */
const SEC_ALIASES=[
  ['subject_definitions',/^(subject[\s_-]*definitions?|主体定义|角色定义)$/i],
  ['summary',/^(summary|概要|摘要|总结)$/i],
  ['retention_analysis',/^(retention[\s_-]*analysis|保留分析|保真分析)$/i],
  ['detailed_description',/^(detailed[\s_-]*description|镜头详述|详细描述|分镜描述)$/i],
  ['overall_soundscape',/^(overall[\s_-]*soundscape|环境音|声音环境)$/i],
  ['non_diegetic_music',/^(non[\s_-]*diegetic[\s_-]*music|配乐|背景音乐|非叙事音乐)$/i]];
export function normalizeImported(text){
  const original=text;
  const normalized=text.replace(/\r\n?/g,'\n');
  let t=normalized;
  const fenced=[...t.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map(m=>m[1]);
  if(fenced.length)t=fenced.join('\n'); // 有代码块时只取代码块内容，去掉 AI 的前后客套话
  t=t.replace(/^```[^\n]*\n?/gm,'');
  const mapped=t.split('\n').map(line=>{
    const m=/^[ \t]*(#{1,6}[ \t]*)?(?:\*\*|__)?[ \t]*([A-Za-z][A-Za-z _-]{3,40}|[\u4e00-\u9fa5]{2,6})[ \t]*(?:\*\*|__)?[ \t]*([:：])?[ \t]*(?:\*\*|__)?[ \t]*(.*)$/.exec(line.replace(/ /g,' '));
    if(!m||!(m[1]||m[3]))return line;
    if(!m[3]&&m[4].trim())return line;
    const hit=SEC_ALIASES.find(([k,re])=>re.test(m[2].trim()));
    if(!hit)return line;
    m[2]=m[4];
    return hit[0]+':'+(m[2].trim()?'\n'+m[2].trim():'');
  }).join('\n');
  if(!fenced.length&&mapped===normalized)return original;
  return mapped.replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
const SEG_MARK=/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*(?:第[ \t]*([一二三四五六1-6])[ \t]*段|S[ \t]*([1-6])(?![0-9A-Za-z])|Segment[ \t]*([1-6])|段[ \t]*([1-6]))[^\n]*$/gim;
const CN_NUM={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6};
export function splitImported(raw){
  const text=normalizeImported(raw);
  const marks=[];let m;SEG_MARK.lastIndex=0;
  while((m=SEG_MARK.exec(text))){const v=m[1]||m[2]||m[3]||m[4];marks.push({i:m.index,end:m.index+m[0].length,no:CN_NUM[v]||+v});}
  let parts=[];
  if(marks.length>=2||(marks.length===1&&text.slice(0,marks[0].i).trim()==='')){
    parts=marks.map((k,j)=>{
      let body=text.slice(k.end,j+1<marks.length?marks[j+1].i:text.length).replace(/^\r?\n/,'');
      if(j+1<marks.length)body=body.replace(/\r?\n$/,'');
      return {no:k.no,text:body};
    });
  }else{
    const sd=[...text.matchAll(/^subject_definitions:/gm)].map(x=>x.index);
    if(sd.length>=2)parts=sd.map((s,j)=>({no:null,text:text.slice(s,j+1<sd.length?sd[j+1]:text.length).trim()+'\n'}));
    else parts=[{no:null,text}];
  }
  return parts.filter(p=>p.text.trim()).map(p=>{const seg={no:p.no,en:p.text};const ps=parse(p.text);const dd=ps.secs.find(s=>SHOT_KEYS.has(s.key));
    return {...p,secs:ps.secs.length,shots:dd?splitShots(dd.body).shots.length:0,dlg:dialogues(seg).length,errs:lint(seg).filter(x=>x[0]==='e').length};});
}

/* ===================== 检查 ===================== */
export function lint(seg){
  const t=seg.en,p=parse(t),out=[];const keys=p.secs.map(s=>s.key);
  const ref2va=keys.includes('subject_definitions');
  if(ref2va){
    SEC_KEYS.forEach(k=>{if(!keys.includes(k))out.push(['e',`缺少小节「${SEC_NAME[k]}」`]);});
    const order=keys.filter(k=>SEC_KEYS.includes(k));if(order.join()!==SEC_KEYS.filter(k=>keys.includes(k)).join())out.push(['e','小节顺序与范本不一致']);
  }
  const open=(t.match(/<d>/g)||[]).length,close=(t.match(/<\/d>/g)||[]).length;if(open!==close)out.push(['e',`台词标记不成对：<d> ${open} 个，</d> ${close} 个`]);
  if(/<d>(?!\[)/.test(t))out.push(['e','有台词缺少语言标记，应写成 <d>[Chinese] …</d>']);
  const sd=p.secs.find(s=>s.key==='subject_definitions'),defined=new Set();
  if(sd)for(const m of sd.body.matchAll(/<(Subject|Picture|Video|Audio) (\d+)>/g))defined.add(m[1]+' '+m[2]);
  const undef=new Set();for(const s of p.secs){if(s.key==='subject_definitions')continue;for(const m of s.body.matchAll(/<(Subject|Picture|Video|Audio) (\d+)>/g))if(!defined.has(m[1]+' '+m[2]))undef.add(`<${m[1]} ${m[2]}>`);}
  if(undef.size)out.push(['e','引用了未在主体定义中出现的标签：'+[...undef].join('、')]);
  if(ref2va){
    const ra=p.secs.find(s=>s.key==='retention_analysis');if(ra&&/\(S\d+\)/.test(ra.body))out.push(['e','保留分析里不应出现 (Sx) 发声人']);
    for(const k of ['overall_soundscape','non_diegetic_music']){const s=p.secs.find(x=>x.key===k);if(s&&/<d>/.test(s.body))out.push(['e',`「${SEC_NAME[k]}」里不应写台词`]);}
    const dd=p.secs.find(s=>s.key==='detailed_description');
    if(dd){const words=dd.body.replace(/<d>[\s\S]*?<\/d>/g,' ').match(/[A-Za-z]+(?:'[a-z]+)?/g)||[];const n=words.length;
      if(n<100)out.push(['w',`镜头详述只有约 ${n} 个英文词，可能过于简略`]);else if(n>600)out.push(['w',`镜头详述约 ${n} 个英文词，偏长，可能超出模型有效长度`]);
      const shots=splitShots(dd.body).shots;shots.forEach((s,i)=>{if(s.no!==i+1)out.push(['w',`镜头编号不连续：第 ${i+1} 个镜头写成了 [Shot ${s.no}]`]);});}
  }
  return out;
}

/* ===================== 全文着色 ===================== */
export function highlight(text,q){
  const RE=/((?:^)(?:[a-z][a-z0-9_]{2,40}:|[\u4e00-\u9fff（）0-9]+：))|(\[Shot\s+\d+\])|(\bAt\s+\d{2}:\d{2}(?:\.\d{1,3})?|^\d{2}:\d{2}(?:\.\d{1,3})?\s*-\s*\d{2}:\d{2}(?:\.\d{1,3})?:)|(<(?:Subject|Picture|Video|Audio) \d+>)|(\(S\d+\))|(<d>[\s\S]*?<\/d>)/gm;
  let out='',last=0,m;
  const cls=['hk','hs','ht','hg','hx','hd'];
  while((m=RE.exec(text))){out+=markq(text.slice(last,m.index),q);const k=m.slice(1).findIndex(x=>x!==undefined);out+=`<span class="${cls[k]}">${markq(m[0],q)}</span>`;last=m.index+m[0].length;}
  return out+markq(text.slice(last),q)+'\n';
}
export function markq(s,q){if(!q)return esc(s);const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');let o='',l=0,m;while((m=re.exec(s))){o+=esc(s.slice(l,m.index))+'<mark>'+esc(m[0])+'</mark>';l=m.index+m[0].length;if(!m[0].length)re.lastIndex++;}return o+esc(s.slice(l));}
function esc(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ===================== 全局搜索 ===================== */
/* 与原型唯一差异：段数据由调用方传入（segments=[{no,en,cn}]），逻辑与原型 search 完全一致。 */
export function searchSegments(q,segments,withCn){
  const hits=[];if(!q)return hits;const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
  segments.forEach((s,i)=>{for(const field of withCn?['en','cn']:['en']){const t=s[field]||'';let m;re.lastIndex=0;
    while((m=re.exec(t))){let where='';if(field==='en'){const p=parse(t),sec=p.secs.find(x=>m.index>=x.start&&m.index<x.end);where=sec?sectionName(sec.key):'';
        if(sec&&SHOT_KEYS.has(sec.key)){const {intro,shots}=splitShots(sec.body);let off=sec.bodyStart+intro.length;for(const sh of shots){if(m.index>=off&&m.index<off+sh.text.length){where+=' · 镜头 '+sh.no;break;}off+=sh.text.length;}}}else where='中文对照';
      const view=field==='en'?displayFull(t):{text:t,headers:[]},a=fullOffset(m.index,view.headers),b=fullOffset(m.index+m[0].length,view.headers);
      hits.push({i,field,start:m.index,end:m.index+m[0].length,where,ctx:view.text.slice(Math.max(0,a-40),b+50)});if(!m[0].length)re.lastIndex++;}}});
  return hits;
}
