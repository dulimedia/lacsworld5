export type ToggleAPI = {
  setShadows(v: boolean): void;
  setBloom(v: boolean): void;
  setAO(v: boolean): void;
  setSSR(v: boolean): void;
  setSSGI(v: boolean): void;
  setMaxAnisotropy(n: number): void;
};

export function installDegradePolicy(api: ToggleAPI) {
  let stage = 0;
  
  const apply = () => {
    console.log(`[FrameGovernor] Degrading to stage ${stage}`);
    
    if (stage === 1) {
      api.setShadows(false);
      api.setBloom(false);
      api.setAO(false);
      api.setMaxAnisotropy(2);
    }
    
    if (stage === 2) {
      api.setSSR(false);
      api.setSSGI(false);
    }
    
    if (stage >= 3) {
      api.setMaxAnisotropy(1);
    }
  };
  
  window.addEventListener('perf:degrade', (e: any) => {
    const newStage = e.detail ?? 1;
    if (newStage > stage) {
      stage = newStage;
      apply();
    }
  });
  
  window.addEventListener('perf:context-restored', () => {
    console.log('[FrameGovernor] Context restored, maintaining safe mode');
  });
  
  console.log('[FrameGovernor] Degrade policy installed');
}
