import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, color]) => [name, color]));
function luminance(color) { const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; }
function contrast(a, b) { const values = [luminance(tokens[a]), luminance(tokens[b])].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); }
test('shared text, clinical status labels and stage labels meet AA contrast in their intended surfaces', () => {
  for (const text of ['text-primary', 'text-secondary', 'accent', 'accent-hover', 'status-existing-ink', 'status-newly-ink', 'status-excluded-ink', 'status-indeterminate-ink']) assert.ok(contrast(text, 'surface') >= 4.5, `${text} contrast`);
  for (const text of ['stage-text', 'stage-muted', 'status-existing-stage', 'status-newly-stage', 'status-excluded-stage', 'status-indeterminate-stage']) assert.ok(contrast(text, 'stage-background') >= 4.5, `${text} stage contrast`);
  assert.ok(contrast('focus', 'surface') >= 3);
});
test('application styles use the authoritative color tokens rather than component-level palettes', () => {
  for (const file of readdirSync(new URL('../src', import.meta.url)).filter(file => file.endsWith('.css') && file !== 'tokens.css')) assert.doesNotMatch(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'), /#[0-9a-f]{3,8}\b|rgba?\(/i, file);
});
