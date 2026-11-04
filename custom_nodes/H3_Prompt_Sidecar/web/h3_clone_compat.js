// ComfyUI frontend 1.55 (ComfyUI 0.42.1) hands node properties and graph.extra out as reactive
// proxies, which the browser's structuredClone rejects with DataCloneError. The six-segment
// panel only clones plain JSON data, so fall back to a JSON copy for exactly that error.
if(!window.structuredClone.__h3Compat){
  const nativeClone=window.structuredClone.bind(window);
  const clone=(value,options)=>{
    try{return nativeClone(value,options)}
    catch(e){if(e?.name!=='DataCloneError')throw e;return value===undefined?value:JSON.parse(JSON.stringify(value))}
  };
  clone.__h3Compat=true;
  window.structuredClone=clone;
}
