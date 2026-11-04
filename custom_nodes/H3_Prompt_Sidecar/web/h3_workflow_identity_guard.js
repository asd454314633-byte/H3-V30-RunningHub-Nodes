import {app} from '../../../scripts/app.js';
import {api} from '../../../scripts/api.js';
const PIN='h3-workflow-tab-identity-v1';
const LAST='Comfy.Workflow.LastActivePath:personal';
const OPEN='Comfy.Workflow.LastOpenPaths:personal';
const domain=w=>w?.extra?.qa_provenance?.namespace||'USER';
let restoreTarget=null,restoreDone=false,restoring=false;
async function reconcileStartup(){
  if(!restoreTarget||restoreDone||restoring||!app.graph?._nodes?.length)return;
  const store=app.extensionManager.workflow;
  if(String(app.graph.id)===restoreTarget.graphId&&store.activeWorkflow?.path===restoreTarget.path){restoreDone=true;remember();return;}
  restoring=true;
  try{
    // The frontend may have hydrated routing before extension.init wrote storage.
    // Open the verified workflow through the real graph loader with its file object,
    // so the canvas and Ctrl+S destination cannot refer to different workflows.
    const workflow=store.workflows.find(w=>w.path===restoreTarget.path);
    if(!workflow)throw Error('Verified workflow missing from frontend file store');
    await workflow.load();
    const state=workflow.activeState;
    if(String(state?.id)!==restoreTarget.graphId||domain(state)!==restoreTarget.domain)throw Error('Workflow draft identity mismatch');
    await app.loadGraphData(JSON.parse(JSON.stringify(state)),true,true,workflow,{checkForRerouteMigration:false});
    if(String(app.graph.id)!==restoreTarget.graphId||store.activeWorkflow?.path!==restoreTarget.path)throw Error('Workflow canvas/file identity did not converge');
    restoreDone=true;sessionStorage.setItem('h3-workflow-restore-verdict','IDENTITY_VERIFIED_AND_LOADED');remember();
  }catch(error){
    sessionStorage.setItem('h3-workflow-restore-verdict','REJECTED: '+error.message);
    location.replace('/extensions/H3_Prompt_Sidecar/recovery_blocked.html');
  }finally{restoring=false;}
}
function remember(){
  if(restoreTarget&&!restoreDone)return;
  const w=app.extensionManager?.workflow?.activeWorkflow,g=app.graph;
  if(!w?.path||w.isTemporary||!g?.id||!g._nodes?.length)return;
  sessionStorage.setItem(PIN,JSON.stringify({version:1,path:w.path,graphId:String(g.id),domain:domain(g)}));
}
app.registerExtension({
  name:'H3.WorkflowIdentityGuard',
  async init(){
    let pin;try{pin=JSON.parse(sessionStorage.getItem(PIN)||'null')}catch{}
    const entry=new URL(location.href).searchParams;
    if(entry.has('h3-workflow'))pin={version:1,path:entry.get('h3-workflow'),graphId:entry.get('h3-id'),domain:entry.get('h3-domain')||'USER'};
    if(pin?.version!==1||!pin.path?.startsWith('workflows/')||!pin.graphId)return;
    const previous={last:localStorage.getItem(LAST),open:localStorage.getItem(OPEN)};
    // Preserve routing metadata too; rejecting a restore never deletes drafts.
    sessionStorage.setItem('h3-workflow-routing-before-restore',JSON.stringify(previous));
    try{
      const response=await api.fetchApi('/userdata/'+encodeURIComponent(pin.path));
      if(!response.ok)throw Error('Pinned workflow unavailable');
      const saved=await response.json();
      if(String(saved.id)!==pin.graphId||domain(saved)!==pin.domain)throw Error('Pinned workflow identity mismatch');
      sessionStorage.setItem(PIN,JSON.stringify(pin));
      restoreTarget=pin;
      localStorage.setItem(LAST,JSON.stringify({workspaceId:'personal',path:pin.path}));
      localStorage.setItem(OPEN,JSON.stringify({workspaceId:'personal',paths:[pin.path],activeIndex:0}));
      sessionStorage.setItem('h3-workflow-restore-verdict','IDENTITY_VERIFIED');
    }catch(error){
      // No implicit fallback to another tab's QA workflow.
      sessionStorage.setItem('h3-workflow-restore-verdict','REJECTED: '+error.message);
      console.warn('[H3 workflow restore] rejected mismatched identity; drafts preserved');
      location.replace('/extensions/H3_Prompt_Sidecar/recovery_blocked.html');
      // Keep startup suspended until navigation completes. Comfy's draft-index
      // fallback must not silently choose some other workflow after rejection.
      await new Promise(()=>{});
    }
  },
  afterConfigureGraph(){setTimeout(()=>{if(restoreTarget&&!restoreDone)void reconcileStartup();else remember();},0)},
  setup(){
    app.extensionManager.workflow.$subscribe(()=>{setTimeout(()=>{if(restoreTarget&&!restoreDone)void reconcileStartup();else remember();},0)},{detached:true});
    setTimeout(()=>void reconcileStartup(),0);
    addEventListener('beforeunload',remember);
  }
});
