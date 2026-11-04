// The bound execution owns storage; saved controls describe the next action.
export function restoredExecutionPolicy(saved={},binding={}) {
 const validStart=Number.isInteger(saved.start_index)&&saved.start_index>=0&&saved.start_index<6;
 return {
  project_id:binding.project_id||saved.project_id||'H3_SIX_V288',
  start_index:validStart?saved.start_index:(binding.start_index??0),
  start_mode:['resume','independent'].includes(saved.start_mode)?saved.start_mode:(binding.start_mode||'resume'),
 };
}
