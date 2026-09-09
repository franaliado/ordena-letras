const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

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

console.log('Actualizando archivos en Android directamente...');

fs.mkdirSync(target, { recursive: true });

for (const item of fs.readdirSync(root)) {
  if (exclude.has(item)) continue;

  copyRecursive(
    path.join(root, item),
    path.join(target, item)
  );
}

// Copiar el puente de Capacitor necesario para Android
const capCorePath = path.join(root, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js');
if (fs.existsSync(capCorePath)) {
  fs.copyFileSync(capCorePath, path.join(target, 'capacitor.js'));
}

console.log('Sincronización completada.');