import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const file of (await readdir('src')).filter(file => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', `src/${file}`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Syntax checks passed for every source module.');
