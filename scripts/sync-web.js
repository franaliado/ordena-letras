const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');

const exclude = new Set([
  'android',
  'www',
  'node_modules',
  '.git',
  'scripts',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'capacitor.config.js',
  'capacitor.config.ts',
  'README.md',
  'supabase_schema'
]);

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });

    for (const item of fs.readdirSync(source)) {
      copyRecursive(
        path.join(source, item),
        path.join(destination, item)
      );
    }
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}

console.log('Limpiando www...');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

console.log('Copiando archivos actuales del juego...');

for (const item of fs.readdirSync(root)) {
  if (exclude.has(item)) continue;

  copyRecursive(
    path.join(root, item),
    path.join(www, item)
  );
}

console.log('Sincronizando Capacitor...');