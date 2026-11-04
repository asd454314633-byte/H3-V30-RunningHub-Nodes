// Only the exact submitted task may update its card; other tabs share the socket.
export function normalizeFlightEvent(type,detail,activePromptId) {
 if(type==='executing'&&typeof detail==='string'&&activePromptId)return {node:detail,prompt_id:activePromptId};
 return detail&&typeof detail==='object'?detail:null;
}
export function flightProgressText(promptId,event,graph={}) {
 if(!promptId||event?.prompt_id!==promptId)return null;
 const type=graph[String(event.node)]?.class_type;
 if(type==='SamplerCustomAdvanced'&&Number.isInteger(event.value)&&Number.isInteger(event.max)
    &&event.max>0&&event.value>=0&&event.value<=event.max){
  return `正在生成视频：${event.value}/${event.max} 步（${Math.round(event.value/event.max*100)}%）`;
 }
 if(event.value!==undefined)return null;
 if(type==='SamplerCustomAdvanced')return '正在准备视频采样';
 if(type==='SDPoseKeypointExtractor')return '正在提取动作姿态';
 if(type==='SDPoseDrawKeypoints')return '正在绘制姿态控制视频';
 if(type==='MoGeInference')return '正在提取深度控制视频';
 if(type==='MoGeRender')return '正在转换深度控制图';
 if(type==='MiniMaxH3FunControlNetApply')return '正在准备动作控制模型';
 if(type==='MiniMaxH3ReferenceToVideo'||type==='MiniMaxH3ImageToVideo')return '正在编码提示词和参考素材';
 if(type==='VAEDecode')return '正在解码视频';
 if(type==='VAEDecodeAudio')return '正在解码音频';
 if(type==='SaveVideo')return '正在保存视频';
 return null;
}
