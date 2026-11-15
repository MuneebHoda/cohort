const active = new WeakMap();
const chartAnimations = new WeakMap();
export function transitionCharts(element) {
  const engine = globalThis.Motion;
  if (!engine || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    chartAnimations.get(element)?.complete();
    return;
  }
  chartAnimations.get(element)?.stop();
  const cards = [...element.querySelectorAll('[data-chart-enter]')];
  if (!cards.length) return;
  chartAnimations.set(element, engine.animate(cards, { opacity: [.45, 1], transform: ['translateY(7px)', 'translateY(0px)'] }, { duration: motionSettings().panel / 1000, delay: engine.stagger(.035), ease: [.2, .75, .25, 1] }));
}
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
  const previous = active.get(element);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { previous?.complete?.(); previous?.finish?.(); return; }
  if (previous?.stop) previous.stop(); else previous?.cancel();
  const settings = motionSettings();
  const transform = kind === 'drawer' ? 'translateX(12px)' : 'translateY(5px)';
  const animation = globalThis.Motion?.animate ? globalThis.Motion.animate(element, {opacity:[.55,1],transform:[transform,'translate(0)']}, {duration:settings.panel/1000,ease:[.2,.75,.25,1]}) : element.animate?.([{ opacity: .55, transform }, { opacity: 1, transform: 'translate(0)' }], { duration: settings.panel, easing: settings.ease });
  if (!animation) return;
  active.set(element, animation);
  Promise.resolve(animation.finished || animation).catch(() => {}).then(() => { if (active.get(element) === animation) active.delete(element); });
}
