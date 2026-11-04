// Native MoGe depth path. The H3 Fun patch fits control frames to target size/time.
export function syncDepthControl(graph, kind, enabled) {
  const get=id=>graph.getNodeById(id);
  const tagged=()=>graph._nodes.filter(n=>n.properties?.h3_depth_role);
  const find=role=>tagged().find(n=>n.properties.h3_depth_role===role);
  const connect=(source,output,target,name)=>{
    const slot=target.inputs.findIndex(i=>i.name===name);
    if(slot<0)throw Error('深度节点接口缺失：'+name);
    const input=target.inputs[slot],link=graph.links instanceof Map?graph.links.get(input.link):graph.links[input.link];
    if(String(link?.origin_id)===String(source.id)&&link.origin_slot===output)return;
    target.disconnectInput(slot);source.connect(output,target,slot);
  };
  if(kind!=='depth'||!enabled){
    tagged().forEach(n=>n.mode=2);
    if(get(1062))get(1062).mode=enabled?0:4;
    if(get(1062)&&get(1063))connect(get(1062),0,get(1063),'images');
    if(get(1063))get(1063).title='Pose｜骨架预览与控制帧';
    return;
  }
  const definitions=[['components','GetVideoComponents'],['resize','ImageScale'],['loader','LoadMoGeModel'],['infer','MoGeInference'],['render','MoGeRender']];
  for(const [index,[role,type]] of definitions.entries()){
    if(find(role))continue;
    const node=globalThis.LiteGraph.createNode(type);
    if(!node)throw Error('深度预处理节点未注册：'+type);
    node.properties||={};node.properties.h3_depth_role=role;
    node.title='Depth｜'+role;node.pos=[6800+index*450,6500];
    graph.add(node);
  }
  const set=(role,name,value)=>{const node=find(role),widget=node.widgets?.find(w=>w.name===name);if(!widget)throw Error('深度参数缺失：'+name);widget.value=value;};
  set('resize','upscale_method','area');set('resize','width',0);set('resize','height',384);set('resize','crop','disabled');
  set('loader','model_name','moge-2-vitl-normal\\model.pt');
  set('infer','resolution_level',0);set('infer','batch_size',1);set('infer','fov_x_degrees',0);set('infer','force_projection',true);set('infer','apply_mask',false);
  set('render','output','depth');
  connect(get(1061),0,find('components'),'video');
  connect(find('components'),0,find('resize'),'image');
  connect(find('resize'),0,find('infer'),'image');
  connect(find('loader'),0,find('infer'),'moge_model');
  connect(find('infer'),0,find('render'),'moge_geometry');
  connect(find('render'),0,get(1063),'images');
  get(1063).title='Depth｜深度预览与控制帧';
  tagged().forEach(n=>n.mode=0);get(1062).mode=2;
  graph.setDirtyCanvas?.(true,true);
}
