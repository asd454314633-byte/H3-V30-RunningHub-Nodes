// Pure route contract shared by the browser integration and offline checks.
// Ref2VA retains its existing gate. OmniRef8 needs separate GPU-accepted opt-in.
function branchNodes(nodes=[]){
 return nodes.filter(node=>{
  const type=node?.comfyClass||node?.type||node?.properties?.['Node name for S&R'];
  const branch=node?.properties?.h3_ref2va_backend_branch;
  return type==='MiniMaxH3ReferenceToVideo'&&(branch==='original'||branch==='omniref8');
 });
}

export function activeConditioningRoute(nodes=[]){
 const active=branchNodes(nodes).filter(node=>Number(node.mode??0)===0);
 if(active.length!==1)return null;
 const node=active[0],branch=node.properties.h3_ref2va_backend_branch;
 return {nodeId:String(node.id),route:branch==='omniref8'?'OmniRef8':'Ref2VA',branch};
}

export function omniRefRouteActive(nodes=[]){
 return branchNodes(nodes).some(node=>Number(node.mode??0)===0&&node.properties.h3_ref2va_backend_branch==='omniref8');
}

export function ref2vaPrebakeCompatible(nodes=[]){
 const route=activeConditioningRoute(nodes);
 return route?.route==='Ref2VA'&&route.nodeId==='136';
}

export function prebakeRouteEnabled(configEnabled,nodes=[],omniref8Enabled=false){
 if(configEnabled!==true)return false;
 const route=activeConditioningRoute(nodes);
 if(route?.route==='Ref2VA')return route.nodeId==='136';
 return route?.route==='OmniRef8'&&route.nodeId==='1106'&&omniref8Enabled===true;
}

export function omniRefWorkflowRouteActive(workflow){
 return activeConditioningRoute(workflow?.nodes||[])?.route==='OmniRef8';
}
