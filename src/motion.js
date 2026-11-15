const active = new WeakMap();
export function motionSettings() {
  if (typeof document === 'undefined') return { panel: 220, feedback: 140, population: 680, focus: 600, ease: 'cubic-bezier(.2,.75,.25,1)' };
  const tokens = getComputedStyle(document.documentElement);
  return { panel: parseFloat(tokens.getPropertyValue('--motion-panel')) || 220, feedback: parseFloat(tokens.getPropertyValue('--motion-feedback')) || 140, population: parseFloat(tokens.getPropertyValue('--motion-population')) || 680, focus: parseFloat(tokens.getPropertyValue('--motion-focus')) || 600, ease: tokens.getPropertyValue('--motion-ease').trim() };
}

export function createStageTransition(onUpdate, onComplete) {
  const engine = globalThis.Motion;
  const value = engine?.motionValue(1);
  const unsubscribe = value?.on('change', onUpdate);
  let running = false;
  return {
    get running() { return running; },
    start(duration, immediate = false) {
      value?.stop();
      if (!value || immediate) { running = false; onUpdate(1); onComplete(); return; }
      value.jump(0);
      running = true;
      engine.animate(value, 1, { duration: duration / 1000, ease: [.2, .75, .25, 1], onComplete: () => { running = false; onComplete(); } });
    },
    stop() { value?.stop(); running = false; },
    settle() { value?.stop(); running = false; onUpdate(1); onComplete(); },
    destroy() { value?.stop(); unsubscribe?.(); value?.destroy(); running = false; },
  };
}
export function transitionPanel(element, kind = 'panel') {
  active.get(element)?.cancel();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !element.animate) return;
  const settings = motionSettings();
  const transform = kind === 'drawer' ? 'translateX(12px)' : 'translateY(5px)';
  const animation = element.animate([{ opacity: .55, transform }, { opacity: 1, transform: 'translate(0)' }], { duration: settings.panel, easing: settings.ease });
  active.set(element, animation);
  animation.finished.catch(() => {}).then(() => { if (active.get(element) === animation) active.delete(element); });
}
