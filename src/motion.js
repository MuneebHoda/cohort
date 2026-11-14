const active = new WeakMap();
export function motionSettings() {
  if (typeof document === 'undefined') return { panel: 220, feedback: 140, population: 680, ease: 'cubic-bezier(.2,.75,.25,1)' };
  const tokens = getComputedStyle(document.documentElement);
  return { panel: parseFloat(tokens.getPropertyValue('--motion-panel')) || 220, feedback: parseFloat(tokens.getPropertyValue('--motion-feedback')) || 140, population: parseFloat(tokens.getPropertyValue('--motion-population')) || 680, ease: tokens.getPropertyValue('--motion-ease').trim() };
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
