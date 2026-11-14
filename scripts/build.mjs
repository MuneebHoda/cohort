import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'favicon.svg', 'src']) await cp(path, `dist/${path}`, { recursive: true });
await mkdir('dist/vendor/addons/controls', { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await cp(`node_modules/three/build/${file}`, `dist/vendor/${file}`);
await cp('node_modules/three/examples/jsm/controls/OrbitControls.js', 'dist/vendor/addons/controls/OrbitControls.js');
await cp('node_modules/three/LICENSE', 'dist/vendor/LICENSE');
console.log('Built Cohort → dist/ (static, locally bundled Three.js; no external services)');
