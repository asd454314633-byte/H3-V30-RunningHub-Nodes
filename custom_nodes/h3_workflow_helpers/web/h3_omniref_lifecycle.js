// The two lifecycle nodes now have exact OmniRef INT8 ConvRot runtime guards.
// Other skip tags and model variants retain their original behavior.
export function lifecycleSkipEnabled({type,skipBranch,ref2va,backend,checkpoint}) {
 const supported=ref2va&&backend==='omniref8'&&skipBranch==='omniref8'
  &&checkpoint==='fasth3_omniref_8step_pruned_int8_convrot.safetensors'
  &&['H3SelectiveTEUnload','H3PartialDiffusionEvictBeforeVAE'].includes(type);
 return supported||!(ref2va&&backend===skipBranch);
}
