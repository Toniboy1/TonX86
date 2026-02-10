const fs = require('fs');
const path = require('path');

const src = '../debug-adapter/dist';
const dest = './dist';

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

fs.copyFileSync(
  path.join(src, 'debugAdapter.js'),
  path.join(dest, 'debugAdapter.js')
);

console.log('Debug adapter copied successfully');
