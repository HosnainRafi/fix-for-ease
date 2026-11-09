const { spawnSync } = require('child_process');

let res = spawnSync('python', ['tools/build-site.py'], { stdio: 'inherit', shell: true });
if (res.error || res.status !== 0) {
  res = spawnSync('python3', ['tools/build-site.py'], { stdio: 'inherit', shell: true });
}

if (res.error || res.status !== 0) {
  console.log('Python not available or build skipped; using existing generated static files.');
  process.exit(0);
}

process.exit(res.status ?? 0);
