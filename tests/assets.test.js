const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const exists = ref => fs.existsSync(path.join(root, ref.replace(/^\.\//,'').split('?')[0]));

const version = JSON.parse(read('version.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const html = read('index.html');
const worker = read('service-worker.js');

assert.strictEqual(version.version, 'v13.07');
assert.ok(version.buildId.includes('v13-07'));
assert.ok(html.includes('Financeiro CRM v13.07'));
assert.ok(html.includes('core.js?v=1307'));
assert.ok(html.includes('app.js?v=1307'));
assert.ok(manifest.start_url.includes('v=1307'));

manifest.icons.forEach(icon => assert.ok(exists(icon.src), `Ícone ausente: ${icon.src}`));
const cachedRefs = Array.from(worker.matchAll(/'((?:\.\/)[^']+)'/g), match=>match[1]);
cachedRefs.forEach(ref => assert.ok(exists(ref), `Arquivo do cache ausente: ${ref}`));
assert.ok(worker.includes('financeiro-crm-v13-07'));

console.log('Arquivos, manifest e cache da v13.07 validados.');
