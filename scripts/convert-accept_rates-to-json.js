const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SRC_DIR = path.join(__dirname, '..', 'accept_rates');
// write to src/static so that build copies it into dist/build/h5/static
const OUT_DIR = path.join(__dirname, '..', 'src', 'static', 'accept_rates');

function walkSync(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walkSync(p, callback);
    } else {
      callback(p);
    }
  });
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function convert() {
  console.log('Converting accept_rates YAML to JSON...');
  ensureDir(OUT_DIR);
  const index = {};

  if (!fs.existsSync(SRC_DIR)) {
    console.warn('No accept_rates source directory found:', SRC_DIR);
    return;
  }

  walkSync(SRC_DIR, (filePath) => {
    if (!filePath.toLowerCase().endsWith('.yml') && !filePath.toLowerCase().endsWith('.yaml')) return;
    const rel = path.relative(SRC_DIR, filePath);
    const parts = rel.split(path.sep);
    if (parts.length !== 2) {
      console.warn('Unexpected file path under accept_rates (expected SUB/FILE.yml):', rel);
      return;
    }
    const sub = parts[0];
    const fileName = parts[1];
    const dblp = fileName.replace(/\.ya?ml$/i, '');

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(raw);
      const outDir = path.join(OUT_DIR, sub);
      ensureDir(outDir);
      const outPath = path.join(outDir, `${dblp}.json`);
      fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log('Wrote', outPath);
        const key = `${sub}/${dblp}`;
        index[key] = parsed;
    } catch (e) {
      console.warn('convert failed for', filePath, e);
    }
  });
  console.log('convert complete');
  // write index
  const indexPath = path.join(OUT_DIR, '..', 'static', 'accept_rates', 'index.json');
  // NOTE: OUT_DIR now is src/static/accept_rates, so indexPath = src/static/accept_rates/../static/accept_rates/index.json will be wrong. Fix: write to OUT_DIR/index.json
  const indexOutPath = path.join(OUT_DIR, 'index.json');
  ensureDir(OUT_DIR);
  fs.writeFileSync(indexOutPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log('Wrote index:', indexOutPath);
}

if (require.main === module) {
  convert();
}

module.exports = { convert };
