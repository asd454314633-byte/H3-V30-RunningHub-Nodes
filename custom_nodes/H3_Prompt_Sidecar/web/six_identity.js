// Drafts and task intents are valid only for this exact workflow identity.
export function sixIdentity({workflowId,workflowPath,nodeId,qaNamespace='',storyId=''}={}) {
  if(!workflowId||nodeId===undefined||nodeId===null)return null;
  return JSON.stringify([String(workflowId),String(workflowPath||''),String(nodeId),String(qaNamespace||'USER'),String(storyId||'')]);
}
export function scopedSixStorage(storage,identity) {
  return {
    read(kind){
      if(!identity)return null;
      try{const value=JSON.parse(storage.getItem('h3-six-v2:'+encodeURIComponent(identity)+':'+kind)||'null');
        return value?.version===2&&value.identity===identity?value.data:null;
      }catch{return null}
    },
    write(kind,data){if(identity)storage.setItem('h3-six-v2:'+encodeURIComponent(identity)+':'+kind,JSON.stringify({version:2,identity,data}));},
    remove(kind){if(identity)storage.removeItem('h3-six-v2:'+encodeURIComponent(identity)+':'+kind);}
  };
}
